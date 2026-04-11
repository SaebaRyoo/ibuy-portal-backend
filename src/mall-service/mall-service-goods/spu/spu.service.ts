import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class SpuService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuySpu.findMany({ skip, take }),
      this.prisma.ibuySpu.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: string) {
    const data = await this.prisma.ibuySpu.findUnique({ where: { id } });
    return new Result(data);
  }
}
