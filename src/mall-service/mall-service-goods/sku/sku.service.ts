import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SkuEntity } from './sku.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { OrderItemsEntity } from '../../mall-service-order/order-items/entities/order-items.entity';

@Injectable()
export class SkuService {
  constructor(
    @InjectRepository(SkuEntity)
    private skuRepository: Repository<SkuEntity>,

    @InjectRedis()
    private readonly redisService: Redis,
  ) {}
  async findList(pageParma: any): Promise<[SkuEntity[], number]> {
    const qb = this.skuRepository
      .createQueryBuilder('sku')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    return await qb.getManyAndCount();
  }

  async findById(id: string) {
    return this.skuRepository.findOneBy({ id });
  }

  addSku(sku: SkuEntity) {
    return this.skuRepository.insert(sku);
  }

  async updateSku(id: number, sku: SkuEntity) {
    return this.skuRepository
      .createQueryBuilder()
      .update(SkuEntity)
      .set(sku)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.skuRepository.delete(id);
  }

  async decrCount(username: string): Promise<void> {
    // 获取Redis客户端
    const redisClient = await this.redisService;

    // 从Redis中获取购物车数据
    const cartKey = `Cart_${username}`;
    const orderItems = await redisClient.hvals(cartKey);

    // 循环递减库存
    for (const orderItem of orderItems) {
      const parsedOrderItem: OrderItemsEntity = JSON.parse(orderItem); // Redis中存储的数据通常是字符串，需解析
      const num = parsedOrderItem.num;
      const skuId = parsedOrderItem.skuId;

      const { affectedRows } = await this.skuRepository.query(
        `UPDATE ibuy_sku SET num=num-${num},sale_num=sale_num+${num} WHERE id='${skuId}' AND num>=${num}`,
      );

      if (affectedRows <= 0) {
        throw new HttpException('库存不足，递减失败！', HttpStatus.BAD_REQUEST);
      }
    }
  }
}
