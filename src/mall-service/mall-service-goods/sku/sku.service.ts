import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SkuEntity } from './sku.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { OrderItemsEntity } from '../../mall-service-order/order-items/entities/order-items.entity';
import Result from '../../../common/utils/Result';

@Injectable()
export class SkuService {
  constructor(
    @InjectRepository(SkuEntity)
    private skuRepository: Repository<SkuEntity>,

    @InjectRedis()
    private readonly redisService: Redis,
  ) {}
  async findList(
    pageParma: any,
  ): Promise<Result<{ data: SkuEntity[]; total: number }>> {
    const qb = this.skuRepository
      .createQueryBuilder('sku')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: string) {
    const data = await this.skuRepository.findOneBy({ id });

    return new Result(data);
  }

  async addSku(sku: SkuEntity) {
    const data = await this.skuRepository.insert(sku);
    return new Result(data);
  }

  async updateSku(id: string, sku: SkuEntity) {
    const data = await this.skuRepository
      .createQueryBuilder()
      .update(SkuEntity)
      .set(sku)
      .where('id = :id', { id })
      .execute();
    return new Result(data);
  }

  async remove(id: number) {
    await this.skuRepository.delete(id);
    return new Result(null);
  }

  /**
   * 库存递减
   * @param username
   */
  async decrCount(username: string) {
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
    return new Result(null);
  }
}
