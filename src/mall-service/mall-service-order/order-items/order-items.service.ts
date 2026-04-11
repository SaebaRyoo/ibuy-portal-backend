import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class OrderItemsService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuyOrderItem.findMany({ skip, take }),
      this.prisma.ibuyOrderItem.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: string) {
    const data = await this.prisma.ibuyOrderItem.findUnique({ where: { id } });
    return new Result(data);
  }

  /**
   * 根据orderId查询订单详情
   */
  async findItemsByOrderId(orderId: string) {
    const data = await this.prisma.ibuyOrderItem.findMany({
      where: { orderId },
    });
    return new Result(data);
  }

  async add(orderItem: any, tx?: any) {
    const db = tx ?? this.prisma;
    const data = await db.ibuyOrderItem.create({ data: orderItem });
    return new Result(data);
  }

  async update(id: number, orderItem: any) {
    const data = await this.prisma.ibuyOrderItem.update({
      where: { id: String(id) },
      data: orderItem,
    });
    return new Result(data);
  }

  async remove(id: number) {
    await this.prisma.ibuyOrderItem.delete({ where: { id: String(id) } });
    return new Result(null);
  }
}
