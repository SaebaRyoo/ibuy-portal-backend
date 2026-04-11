import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class ParaService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuyPara.findMany({ skip, take }),
      this.prisma.ibuyPara.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.prisma.ibuyPara.findUnique({ where: { id } });
    return new Result(data);
  }

  async create(para: any) {
    const data = await this.prisma.ibuyPara.create({ data: para });
    return new Result(data);
  }

  async updateById(id: number, para: any) {
    const data = await this.prisma.ibuyPara.update({
      where: { id },
      data: para,
    });
    return new Result(data);
  }

  async remove(id: number) {
    await this.prisma.ibuyPara.delete({ where: { id } });
    return new Result(null);
  }
}
