import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ibuyAddress.findMany({ skip, take }),
      this.prisma.ibuyAddress.count(),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    return this.prisma.ibuyAddress.findUnique({ where: { id } });
  }

  async add(address: any) {
    return this.prisma.ibuyAddress.create({ data: address });
  }

  async update(id: string, address: any) {
    return this.prisma.ibuyAddress.update({
      where: { id: Number(id) },
      data: address,
    });
  }

  async remove(id: number) {
    await this.prisma.ibuyAddress.delete({ where: { id } });
  }

  async findAll() {
    return this.prisma.ibuyAddress.findMany();
  }
}
