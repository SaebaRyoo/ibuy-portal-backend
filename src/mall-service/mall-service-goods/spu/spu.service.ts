import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class SpuService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ibuySpu.findMany({ skip, take }),
      this.prisma.ibuySpu.count(),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.ibuySpu.findUnique({ where: { id } });
  }
}
