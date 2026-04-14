import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SkuService } from '../../mall-service-goods/sku/sku.service';
import { CartService } from '../cart/cart.service';
import IDWorker from '../../../common/utils/IDWorker';
import { OrderItemsService } from '../order-items/order-items.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../../common/constants/RabbitMQConstants';
import { AlipayService } from '../../alipay/alipay.service';
import { AuthService } from '../../mall-service-system/auth/auth.service';
import { SpuService } from 'src/mall-service/mall-service-goods/spu/spu.service';
import { DirectOrderSkuDto } from './dto/direct-order-sku.dto';
import { DirectOrderInfoDto } from './dto/direct-order-info.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { BusinessException } from '../../../common/filters/business.exception.filter';

@Injectable()
export class OrderService {
  constructor(
    @InjectRedis()
    private readonly redisService: Redis,

    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,

    private prisma: PrismaService,

    private readonly amqpConnection: AmqpConnection,

    private readonly skuService: SkuService,
    private readonly spuService: SpuService,
    private readonly cartService: CartService,
    private readonly orderItemsService: OrderItemsService,

    private readonly authService: AuthService,

    @Inject(forwardRef(() => AlipayService))
    private readonly alipayService: AlipayService,
  ) {}

  async findList(
    pageParma: any,
    req: any,
  ): Promise<{ items: any[]; total: number }> {
    const decoded = await this.authService.getDecodedToken(req);
    const _username = decoded.loginName;

    const where: any = { username: _username };
    if (pageParma.orderStatus) {
      where.orderStatus = pageParma.orderStatus;
    }

    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.ibuyOrder.findMany({ where, skip, take }),
      this.prisma.ibuyOrder.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.ibuyOrder.findUnique({ where: { id } });
  }

  async update(id: any, order: any) {
    return this.prisma.ibuyOrder.update({
      where: { id: String(id) },
      data: order,
    });
  }

  async remove(id: number): Promise<void> {
    await this.prisma.ibuyOrder.delete({ where: { id: String(id) } });
  }

  /**
   * 直接下单
   */
  async directOrder(
    skuInfo: DirectOrderSkuDto,
    orderInfo: DirectOrderInfoDto,
    req: any,
  ): Promise<any> {
    const decoded = await this.authService.getDecodedToken(req);
    const username = decoded.loginName;

    const sku = await this.skuService.findById(skuInfo.skuId);

    if (!sku) {
      throw new BusinessException('商品不存在');
    }

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const spu = await this.spuService.findById(sku.spuId);

        const idWorker = new IDWorker(1n, 1n);

        // 创建订单明细数据
        const orderItemData: any = {
          id: `NO.${idWorker.nextId()}`,
          categoryId1: spu.category1Id,
          categoryId2: spu.category2Id,
          categoryId3: spu.category3Id,
          spuId: spu.id,
          skuId: sku.id,
          name: sku.name,
          price: sku.price,
          num: Number(skuInfo.num),
          money: Number(skuInfo.num) * sku.price,
          payMoney: Number(skuInfo.num) * sku.price,
          image: sku.image,
          isReturn: '0',
        };

        // 创建订单数据
        const orderData: any = {
          id: `NO.${idWorker.nextId()}`,
          username,
          totalNum: Number(skuInfo.num),
          totalMoney: orderItemData.money,
          payMoney: orderItemData.payMoney,
          preMoney: 0,
          createTime: new Date(),
          updateTime: new Date(),
          buyerRate: '0',
          sourceType: '1',
          orderStatus: '0',
          payStatus: '0',
          shippingStatus: '0',
          receiverContact: orderInfo.receiverContact,
          receiverMobile: orderInfo.receiverMobile,
          receiverAddress: orderInfo.receiverAddress,
          buyerMessage: orderInfo.buyerMessage,
          payType: String(orderInfo.payType),
        };

        // 保存订单
        const savedOrder = await tx.ibuyOrder.create({ data: orderData });

        // 保存订单明细
        orderItemData.orderId = savedOrder.id;
        await tx.ibuyOrderItem.create({ data: orderItemData });

        // 修改库存
        await this.skuService.decrCount(username, tx);

        // 发送延时队列
        await this.sendDelayMessage(savedOrder.id);

        return savedOrder;
      });

      return order;
    } catch (err) {
      this.logger.error('直接下单失败', err);
      throw new BusinessException(err);
    }
  }

  /**
   * 购物车下单
   */
  async addOrder(order: any, req): Promise<any> {
    const decoded = await this.authService.getDecodedToken(req);
    const username = decoded.loginName;
    this.logger.log('info', `username: ${username}`);

    const cartResult = await this.cartService.list(username);
    const orderItems = cartResult.items;

    // 统计计算
    let totalMoney = 0;
    let totalPayMoney = 0;
    let num = 0;
    for (const orderItem of orderItems) {
      totalMoney += orderItem.money;
      totalPayMoney += orderItem.payMoney;
      num += Number(orderItem.num);
    }

    const idWorker = new IDWorker(1n, 1n);
    // 设置订单信息
    const orderData: any = {
      id: `NO.${idWorker.nextId()}`,
      username,
      totalNum: num,
      totalMoney,
      payMoney: totalPayMoney,
      preMoney: totalMoney - totalPayMoney,
      createTime: new Date(),
      updateTime: new Date(),
      buyerRate: '0',
      sourceType: '1',
      orderStatus: '0',
      payStatus: '0',
      shippingStatus: '0',
      receiverContact: order.receiverContact,
      receiverMobile: order.receiverMobile,
      receiverAddress: order.receiverAddress,
      buyerMessage: order.buyerMessage,
      payType: order.payType,
    };

    try {
      const savedOrder = await this.prisma.$transaction(async (tx) => {
        // 保存订单
        const created = await tx.ibuyOrder.create({ data: orderData });

        // 添加订单明细
        for (const orderItem of orderItems) {
          const itemData = {
            ...orderItem,
            id: `NO.${idWorker.nextId()}`,
            isReturn: '0',
            orderId: created.id,
          };
          await tx.ibuyOrderItem.create({ data: itemData });
        }

        // 修改库存
        await this.skuService.decrCount(username, tx);

        // 清除Redis缓存中的购物车数据
        await this.redisService.del(`Cart_${username}`);

        // 发送延时队列
        await this.sendDelayMessage(created.id);

        return created;
      });

      return savedOrder;
    } catch (err) {
      throw new BusinessException(err);
    }
  }

  /**
   * 向延时队列发送订单信息
   */
  async sendDelayMessage(orderId: string): Promise<void> {
    const data = {
      out_trade_no: orderId,
    };

    await this.amqpConnection.publish(
      RabbitMQConstants.EXCHANGE_ORDER_DELAY,
      RabbitMQConstants.QUEUE_ORDER_DELAY,
      Buffer.from(JSON.stringify(data)),
      {
        expiration: 1000 * 5,
      },
    );
  }

  /**
   * 关闭订单，库存回滚
   */
  async closeOrder(orderId: string) {
    const orderItems = await this.orderItemsService.findItemsByOrderId(orderId);
    for (const orderItem of orderItems) {
      const skuId = orderItem.skuId;
      const num = orderItem.num;

      const goods = await this.skuService.findById(skuId);
      goods.num = goods.num + num;

      await this.skuService.updateSku(skuId, goods);
    }

    await this.alipayService.tradeClose(orderId);
    return true;
  }
}
