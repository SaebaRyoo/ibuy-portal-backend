import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItemsEntity } from './entities/order-items.entity';
import Result from '../../../common/utils/Result';

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItemsEntity)
    private orderItemsRepository: Repository<OrderItemsEntity>,
  ) {}
  async findList(pageParma: any) {
    const qb = this.orderItemsRepository
      .createQueryBuilder('order-item')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: string) {
    const data = await this.orderItemsRepository.findOneBy({ id });
    return new Result(data);
  }

  /**
   * 根据orderId查询订单详情
   * @param orderId
   */
  async findItemsByOrderId(orderId: string) {
    const data = await this.orderItemsRepository.findBy({ orderId });
    return new Result(data);
  }

  async add(spec: OrderItemsEntity) {
    const data = await this.orderItemsRepository.insert(spec);
    return new Result(data);
  }

  async update(id: number, spec: OrderItemsEntity) {
    const data = await this.orderItemsRepository
      .createQueryBuilder()
      .update(OrderItemsEntity)
      .set(spec)
      .where('id = :id', { id })
      .execute();
    return new Result(data);
  }

  async remove(id: number) {
    await this.orderItemsRepository.delete(id);
    return new Result(null);
  }
}
