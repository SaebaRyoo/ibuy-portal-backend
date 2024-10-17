import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { SkuService } from '../../mall-service-goods/sku/sku.service';
import { CartService } from '../cart/cart.service';
import IDWorker from '../../../common/utils/IDWorker';
import { OrderItemsService } from '../order-items/order-items.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class OrderService {
  constructor(
    @InjectRedis()
    private readonly redisService: Redis,

    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,

    private readonly skuService: SkuService,
    private readonly cartService: CartService,
    private readonly orderItemsService: OrderItemsService,
  ) {}
  async findList(pageParma: any): Promise<[OrderEntity[], number]> {
    const qb = this.orderRepository
      .createQueryBuilder('spec')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    return await qb.getManyAndCount();
  }

  async findById(id: string) {
    return this.orderRepository.findBy({ id });
  }

  async updateSpec(id: number, spec: OrderEntity) {
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
   * 购物车下单
   *
   * @param order
   */
  async addOrder(order: OrderEntity): Promise<number> {
    const username = order.username;
    // 查询用户购物车
    const orderItems = await this.cartService.list(username);

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

    // 保存订单
    await this.orderRepository.save(order);

    // 添加订单明细
    for (const orderItem of orderItems) {
      orderItem.id = `NO.${idWorker.nextId()}`;
      orderItem.isReturn = '0';
      orderItem.orderId = order.id;
      await this.orderItemsService.add(orderItem);
    }

    // 修改库存
    await this.skuService.decrCount(username);

    // 清除Redis缓存中的购物车数据
    await this.redisService.del(`Cart_${username}`);

    // 发送延时队列(可选)
    // await this.sendDelayMessage(order.id);

    return 1; // 表示插入成功的数量
  }
}
