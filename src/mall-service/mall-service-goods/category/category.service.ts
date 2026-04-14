import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = Number(pageParma.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.ibuyCategory.findMany({ skip, take }),
      this.prisma.ibuyCategory.count(),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    return this.prisma.ibuyCategory.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.ibuyCategory.findMany();
  }

  async create(para: any) {
    return this.prisma.ibuyCategory.create({ data: para });
  }

  async updateById(id: number, para: any) {
    return this.prisma.ibuyCategory.update({
      where: { id },
      data: para,
    });
  }

  async remove(id: number) {
    await this.prisma.ibuyCategory.delete({ where: { id } });
  }
}
