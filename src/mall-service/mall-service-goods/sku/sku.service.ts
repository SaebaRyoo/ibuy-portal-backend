import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
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

  async findBySpuId(spuId: string) {
    const data = await this.skuRepository.findBy({ spuId });

    return new Result(data);
  }
  async findTopBySaleNum(limit: number) {
    const data = await this.skuRepository.find({
      where: { saleNum: Not(IsNull()) }, // 过滤掉 saleNum 为空的记录
      order: { saleNum: 'DESC' }, // 根据 sale_num 降序排序
      take: limit, // 获取指定数量的数据
    });
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

  /**
   * 库存递减
   * @param username
   * @param manager // 这是用于内部个module之间调用时处理事务的，暂时没想到好的解决方法
   */
  async decrCount(username: string, manager?: EntityManager) {
    let _manager;
    if (manager) {
      _manager = manager;
    } else {
      _manager = await this.skuRepository;
    }
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

      const { affectedRows } = await _manager.query(
        `UPDATE ibuy_sku SET num=num-${num},sale_num=sale_num+${num} WHERE id='${skuId}' AND num>=${num}`,
      );
      // const { affectedRows } = await this.skuCustomRepo.decrCount(num, skuId);

      if (affectedRows <= 0) {
        throw new HttpException('库存不足，递减失败！', HttpStatus.BAD_REQUEST);
      }
    }
    return new Result(null);
  }
}
