import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import IDWorker from '../../../common/utils/IDWorker';
import { BusinessException } from '../../../common/filters/business.exception.filter';
import { RabbitMQConstants } from '../../../common/constants/RabbitMQConstants';
import {
  SeckillStockService,
  SeckillStockResult,
} from '../seckill-stock/seckill-stock.service';
import { AuthService } from '../../mall-service-system/auth/auth.service';

// 秒杀订单超时时间：5 分钟
const SECKILL_ORDER_TIMEOUT = (1000 * 60 * 5).toString();

@Injectable()
export class SeckillOrderService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redisService: Redis,
    private readonly amqpConnection: AmqpConnection,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly seckillStockService: SeckillStockService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 秒杀下单
   * 1. 校验活动时间
   * 2. Redis Lua 原子扣库存 + 限购
   * 3. MQ 异步创建订单
   */
  async placeOrder(
    seckillGoodsId: string,
    activityId: string,
    receiverAddress: string,
    req: any,
  ): Promise<{ orderId: string; status: string }> {
    const decoded = await this.authService.getDecodedToken(req);
    const username = decoded.loginName;

    // 1. 校验活动
    const activity = await this.prisma.ibuySeckillActivity.findUnique({
      where: { id: activityId },
    });
    if (!activity) {
      throw new BusinessException('活动不存在');
    }

    const now = new Date();
    if (now < activity.startTime) {
      throw new BusinessException('活动未开始');
    }
    if (now > activity.endTime) {
      throw new BusinessException('活动已结束');
    }

    // 获取秒杀商品信息
    const goods = await this.prisma.ibuySeckillGoods.findUnique({
      where: { id: seckillGoodsId },
    });
    if (!goods) {
      throw new BusinessException('秒杀商品不存在');
    }

    // 2. Redis Lua 原子扣库存
    const ttlSeconds = Math.ceil(
      (activity.endTime.getTime() - Date.now()) / 1000,
    );
    const result = await this.seckillStockService.decrStock(
      seckillGoodsId,
      activityId,
      username,
      1,
      ttlSeconds,
    );

    if (result === SeckillStockResult.OUT_OF_STOCK) {
      throw new BusinessException('已售罄');
    }
    if (result === SeckillStockResult.ALREADY_PURCHASED) {
      throw new BusinessException('每人限购一件');
    }

    // 3. 生成临时订单号，发 MQ 消息
    const idWorker = new IDWorker(1n, 1n);
    const orderId = `NO.${idWorker.nextId()}`;

    const orderMsg = {
      orderId,
      activityId,
      seckillGoodsId,
      skuId: goods.skuId,
      username,
      seckillPrice: goods.seckillPrice,
      money: goods.seckillPrice, // 单件
      receiverAddress,
    };

    await this.amqpConnection.publish(
      RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_DELAY,
      RabbitMQConstants.QUEUE_SEC_KILL_ORDER_DELAY,
      Buffer.from(JSON.stringify(orderMsg)),
    );

    return { orderId, status: 'queued' };
  }

  /**
   * MQ 消费者调用：异步创建秒杀订单
   */
  async createOrder(msg: {
    orderId: string;
    activityId: string;
    seckillGoodsId: string;
    skuId: string;
    username: string;
    seckillPrice: number;
    money: number;
    receiverAddress: string;
  }): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 创建秒杀订单
        await tx.ibuySeckillOrder.create({
          data: {
            id: msg.orderId,
            activityId: msg.activityId,
            seckillGoodsId: msg.seckillGoodsId,
            skuId: msg.skuId,
            username: msg.username,
            seckillPrice: msg.seckillPrice,
            money: msg.money,
            orderStatus: '0',
            payStatus: '0',
            receiverAddress: msg.receiverAddress,
          },
        });

        // 扣减 DB 库存
        const result = await tx.$executeRaw`
          UPDATE ibuy_seckill_goods
          SET stock_count = stock_count - 1
          WHERE id = ${msg.seckillGoodsId} AND stock_count >= 1
        `;
        if (result <= 0) {
          throw new Error('DB 库存不足');
        }
      });

      // 发送延时关单消息
      await this.sendDelayMessage(msg.orderId);

      this.logger.log('info', `Seckill order created: ${msg.orderId}`);
    } catch (error) {
      // DB 失败，回补 Redis 库存
      this.logger.error(
        `Seckill order creation failed, restoring stock: ${msg.orderId}`,
        error,
      );
      await this.redisService.incrby(`seckill:stock:${msg.seckillGoodsId}`, 1);
      await this.redisService.del(
        `seckill:user:${msg.activityId}:${msg.username}`,
      );
    }
  }

  /**
   * 发送延时关单消息
   */
  private async sendDelayMessage(orderId: string): Promise<void> {
    await this.amqpConnection.publish(
      RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_DELAY,
      RabbitMQConstants.QUEUE_SEC_KILL_ORDER_DELAY,
      Buffer.from(JSON.stringify({ out_trade_no: orderId })),
      { expiration: SECKILL_ORDER_TIMEOUT },
    );
  }

  /**
   * 关闭超时订单
   */
  async closeOrder(orderId: string): Promise<void> {
    const order = await this.prisma.ibuySeckillOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) return;

    // 已支付则跳过
    if (order.payStatus === '1') return;

    // 关闭订单
    await this.prisma.ibuySeckillOrder.update({
      where: { id: orderId },
      data: { orderStatus: '2', payStatus: '0' },
    });

    // 回补 Redis 库存
    await this.redisService.incrby(`seckill:stock:${order.seckillGoodsId}`, 1);

    // 删除用户限购标记
    await this.redisService.del(
      `seckill:user:${order.activityId}:${order.username}`,
    );

    this.logger.log('info', `Seckill order closed: ${orderId}`);
  }

  /**
   * 支付成功更新
   */
  async paySuccess(orderId: string, transactionId: string): Promise<void> {
    const order = await this.prisma.ibuySeckillOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) return;

    if (order.orderStatus === '2') {
      // 订单已关闭，需要退款
      this.logger.warn(
        `Seckill order already closed when payment arrived: ${orderId}, need refund`,
      );
      return;
    }

    await this.prisma.ibuySeckillOrder.update({
      where: { id: orderId },
      data: {
        payStatus: '1',
        orderStatus: '1',
        payTime: new Date(),
        transactionId,
      },
    });
  }

  async findById(id: string, req: any): Promise<any> {
    const decoded = await this.authService.getDecodedToken(req);
    const username = decoded.loginName;

    const order = await this.prisma.ibuySeckillOrder.findUnique({
      where: { id },
    });

    if (!order || order.username !== username) {
      throw new BusinessException('订单不存在');
    }

    return order;
  }

  async findByUser(
    pageParam: { current: number; pageSize: number },
    req: any,
  ): Promise<{ items: any[]; total: number }> {
    const decoded = await this.authService.getDecodedToken(req);
    const username = decoded.loginName;

    const where = { username };
    const skip = pageParam.pageSize * (pageParam.current - 1);
    const take = pageParam.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.ibuySeckillOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.ibuySeckillOrder.count({ where }),
    ]);
    return { items, total };
  }
}
