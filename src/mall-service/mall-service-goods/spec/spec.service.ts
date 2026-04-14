import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class SpecService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ibuySpec.findMany({ skip, take }),
      this.prisma.ibuySpec.count(),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    return this.prisma.ibuySpec.findUnique({ where: { id } });
  }

  async addSpec(spec: any) {
    return this.prisma.ibuySpec.create({ data: spec });
  }

  async updateSpec(id: number, spec: any) {
    return this.prisma.ibuySpec.update({
      where: { id },
      data: spec,
    });
  }

  async remove(id: number) {
    await this.prisma.ibuySpec.delete({ where: { id } });
  }
}
