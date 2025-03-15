import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { SkuService } from '../../mall-service-goods/sku/sku.service';
import { CartService } from '../cart/cart.service';
import IDWorker from '../../../common/utils/IDWorker';
import { OrderItemsService } from '../order-items/order-items.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../../common/constants/RabbitMQConstants';
import Result from '../../../common/utils/Result';
import { AlipayService } from '../../alipay/alipay.service';
import { SkuEntity } from '../../mall-service-goods/sku/sku.entity';
import { AuthService } from '../../mall-service-system/auth/auth.service';
import { OrderItemsEntity } from '../order-items/entities/order-items.entity';
import { SpuService } from 'src/mall-service/mall-service-goods/spu/spu.service';
import { DirectOrderSkuDto } from './dto/direct-order-sku.dto';
import { DirectOrderInfoDto } from './dto/direct-order-info.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRedis()
    private readonly redisService: Redis,

    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,

    private readonly amqpConnection: AmqpConnection,

    private readonly skuService: SkuService,
    private readonly spuService: SpuService,
    private readonly cartService: CartService,
    private readonly orderItemsService: OrderItemsService,
    private readonly dataSource: DataSource,

    private readonly authService: AuthService,

    // 因为在AlipayService中引用了OrderService的方法，
    // 然后再在OrderService中引用AlipayService的方法会导致循环依赖。
    // 所以需要使用forwardRef来解决
    @Inject(forwardRef(() => AlipayService))
    private readonly alipayService: AlipayService,
  ) {}

  async findList(
    pageParma: any,
    req: any,
  ): Promise<Result<{ data: OrderEntity[]; total: number }>> {
    const decoded = await this.authService.getDecodedToken(req);
    const _username = decoded.loginName;
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize)
      .where('username = :username', { username: _username });
    // 筛选条件
    if (pageParma.orderStatus) {
      qb.andWhere('order.orderStatus = :orderStatus', {
        orderStatus: pageParma.orderStatus,
      });
    }
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: string) {
    return this.orderRepository.findOneBy({ id });
  }

  async update(id: number, spec: OrderEntity) {
    return this.orderRepository
      .createQueryBuilder()
      .update(OrderEntity)
      .set(spec)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.orderRepository.delete(id);
  }

  /**
   * 直接下单
   * @param skuInfo 
   * @param orderInfo 
   * @param req 
   * @returns 
   */
  async directOrder(skuInfo: DirectOrderSkuDto, orderInfo: DirectOrderInfoDto, req: any): Promise<Result<any>> {
    const decoded = await this.authService.getDecodedToken(req);
    const username = decoded.loginName;

    // 获取商品SKU信息
    const skuResult = await this.skuService.findById(skuInfo.skuId);
    const sku = skuResult.data;

    if (!sku) {
      return new Result(null, '商品不存在');
    }

    // 创建一个新的查询运行器
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建订单明细
      const orderItem = new OrderItemsEntity();
      const spuResult = await this.spuService.findById(sku.spuId);
      const spu = spuResult.data;

      orderItem.categoryId1 = spu.category1Id;
      orderItem.categoryId2 = spu.category2Id;
      orderItem.categoryId3 = spu.category3Id;
      orderItem.spuId = spu.id;
      orderItem.skuId = sku.id;
      orderItem.name = sku.name;
      orderItem.price = sku.price;
      orderItem.num = skuInfo.num;
      orderItem.money = orderItem.num * orderItem.price;
      orderItem.payMoney = orderItem.money;
      orderItem.image = sku.image;

      // 创建订单
      const order = new OrderEntity();
      const idWorker = new IDWorker(1n, 1n);

      order.username = username;
      order.totalNum = skuInfo.num;
      order.totalMoney = orderItem.money;
      order.payMoney = orderItem.payMoney;
      order.preMoney = 0; // 直接下单暂不考虑优惠
      order.createTime = new Date();
      order.updateTime = order.createTime;
      order.buyerRate = '0';
      order.sourceType = '1';
      order.orderStatus = '0';
      order.payStatus = '0';
      order.shippingStatus = '0';
      order.id = `NO.${idWorker.nextId()}`;
      order.receiverContact = orderInfo.receiverContact;
      order.receiverMobile = orderInfo.receiverMobile;
      order.receiverAddress = orderInfo.receiverAddress;
      order.buyerMessage = orderInfo.buyerMessage;
      order.payType = orderInfo.payType;

      // 保存订单
      await queryRunner.manager.save(OrderEntity, order);

      // 保存订单明细
      orderItem.id = `NO.${idWorker.nextId()}`;
      orderItem.isReturn = '0';
      orderItem.orderId = order.id;
      await this.orderItemsService.add(orderItem, queryRunner.manager);

      // 修改库存
      await this.skuService.decrCount(username, queryRunner.manager);

      // 发送延时队列
      await this.sendDelayMessage(order.id);

      // 提交事务
      await queryRunner.commitTransaction();
      return new Result(order);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      return new Result(null, err);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 购物车下单
   *
   * @param order
   * @param req
   */
  async addOrder(order: OrderEntity, req): Promise<Result<any>> {
    const decoded = await this.authService.getDecodedToken(req);
    const username = decoded.loginName;
    console.log('username', username);
    // 查询用户购物车
    const orderItemsResult = await this.cartService.list(username);
    const orderItems = orderItemsResult.data.data;
    // 创建一个新的查询运行器
    const queryRunner = this.dataSource.createQueryRunner();
    // 使用我们的新查询运行器建立真实的数据库连接
    await queryRunner.connect();
    // 现在让我们打开一个新的事务：
    await queryRunner.startTransaction();

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
    order.username = username;
    order.totalNum = num;
    order.totalMoney = totalMoney;
    order.payMoney = totalPayMoney;
    order.preMoney = totalMoney - totalPayMoney;
    order.createTime = new Date();
    order.updateTime = order.createTime;
    order.buyerRate = '0'; // 0:未评价, 1:已评价
    order.sourceType = '1'; // 1:WEB
    order.orderStatus = '0'; // 0:未完成, 1:已完成
    order.payStatus = '0'; // 0:未支付, 1:已支付
    order.shippingStatus = '0'; // 0:未发货, 1:已发货
    order.id = `NO.${idWorker.nextId()}`;

    // // 保存订单
    // // await this.orderCustomRepo.createOrder(order);
    // await this.orderRepository.save(order);
    //
    // // 添加订单明细
    // for (const orderItem of orderItems) {
    //   orderItem.id = `NO.${idWorker.nextId()}`;
    //   orderItem.isReturn = '0';
    //   orderItem.orderId = order.id;
    //   await this.orderItemsService.add(orderItem);
    // }
    //
    // // 修改库存
    // await this.skuService.decrCount(username);
    //
    // // 清除Redis缓存中的购物车数据
    // await this.redisService.del(`Cart_${username}`);
    //
    // // 发送延时队列
    // await this.sendDelayMessage(order.id);

    try {
      // 保存订单
      // await this.orderRepository.save(order);
      await queryRunner.manager.save(OrderEntity, order);

      // 添加订单明细
      for (const orderItem of orderItems) {
        orderItem.id = `NO.${idWorker.nextId()}`;
        orderItem.isReturn = '0';
        orderItem.orderId = order.id;
        // 将事务运行器传给其他服务
        await this.orderItemsService.add(orderItem, queryRunner.manager);
      }

      // 修改库存
      await this.skuService.decrCount(username, queryRunner.manager);

      // 清除Redis缓存中的购物车数据
      await this.redisService.del(`Cart_${username}`);

      // 发送延时队列
      await this.sendDelayMessage(order.id);
      // 提交事务：
      await queryRunner.commitTransaction();
    } catch (err) {
      // 发生错误，回滚所做的更改
      await queryRunner.rollbackTransaction();
      return new Result(null, err); // 插入失败，返回原因
    } finally {
      // 释放手动创建的查询运行器：
      await queryRunner.release();
    }

    return new Result(order); // 返回创建的订单信息
  }

  /**
   * 向延时队列发送订单信息
   * @param orderId
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
   * @param orderId
   */
  async closeOrder(orderId: string) {
    //   1. 获取订单详情
    const result = await this.orderItemsService.findItemsByOrderId(orderId);
    const orderItems = result.data;
    for (const orderItem of orderItems) {
      //   2. 获取商品id和购买商品数量
      const skuId = orderItem.skuId;
      const num = orderItem.num;

      //   3. 库存回滚
      const result = await this.skuService.findById(skuId);
      const goods: SkuEntity = result.data;
      goods.num = goods.num + num;

      await this.skuService.updateSku(skuId, goods);
    }

    await this.alipayService.tradeClose(orderId);
    return true;
  }
}
