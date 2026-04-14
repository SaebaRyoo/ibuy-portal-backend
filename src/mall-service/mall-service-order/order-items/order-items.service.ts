import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class OrderItemsService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ibuyOrderItem.findMany({ skip, take }),
      this.prisma.ibuyOrderItem.count(),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.ibuyOrderItem.findUnique({ where: { id } });
  }

  /**
   * 根据orderId查询订单详情
   */
  async findItemsByOrderId(orderId: string) {
    return this.prisma.ibuyOrderItem.findMany({
      where: { orderId },
    });
  }

  async add(orderItem: any, tx?: any) {
    const db = tx ?? this.prisma;
    return db.ibuyOrderItem.create({ data: orderItem });
  }

  async update(id: number, orderItem: any) {
    return this.prisma.ibuyOrderItem.update({
      where: { id: String(id) },
      data: orderItem,
    });
  }

  async remove(id: number): Promise<void> {
    await this.prisma.ibuyOrderItem.delete({ where: { id: String(id) } });
  }
}
