import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class SpecService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuySpec.findMany({ skip, take }),
      this.prisma.ibuySpec.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.prisma.ibuySpec.findUnique({ where: { id } });
    return new Result(data);
  }

  async addSpec(spec: any) {
    const data = await this.prisma.ibuySpec.create({ data: spec });
    return new Result(data);
  }

  async updateSpec(id: number, spec: any) {
    const data = await this.prisma.ibuySpec.update({
      where: { id },
      data: spec,
    });
    return new Result(data);
  }

  async remove(id: number) {
    await this.prisma.ibuySpec.delete({ where: { id } });
    return new Result(null);
  }
}
