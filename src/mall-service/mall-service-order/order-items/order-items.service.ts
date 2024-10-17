import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItemsEntity } from './entities/order-items.entity';

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItemsEntity)
    private orderRepository: Repository<OrderItemsEntity>,
  ) {}
  async findList(pageParma: any): Promise<[OrderItemsEntity[], number]> {
    const qb = this.orderRepository
      .createQueryBuilder('spec')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    return await qb.getManyAndCount();
  }

  async findById(id: string) {
    return this.orderRepository.findBy({ id });
  }

  add(spec: OrderItemsEntity) {
    return this.orderRepository.insert(spec);
  }

  async update(id: number, spec: OrderItemsEntity) {
    return this.orderRepository
      .createQueryBuilder()
      .update(OrderItemsEntity)
      .set(spec)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.orderRepository.delete(id);
  }
}
