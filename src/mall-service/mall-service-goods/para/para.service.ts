import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class ParaService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ibuyPara.findMany({ skip, take }),
      this.prisma.ibuyPara.count(),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    return this.prisma.ibuyPara.findUnique({ where: { id } });
  }

  async create(para: any) {
    return this.prisma.ibuyPara.create({ data: para });
  }

  async updateById(id: number, para: any) {
    return this.prisma.ibuyPara.update({
      where: { id },
      data: para,
    });
  }

  async remove(id: number) {
    await this.prisma.ibuyPara.delete({ where: { id } });
  }
}
