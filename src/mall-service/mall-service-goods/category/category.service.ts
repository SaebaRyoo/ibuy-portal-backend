import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(pageParma: any): Promise<Result<any>> {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = Number(pageParma.pageSize);
    const [data, total] = await Promise.all([
      this.prisma.ibuyCategory.findMany({ skip, take }),
      this.prisma.ibuyCategory.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.prisma.ibuyCategory.findUnique({ where: { id } });
    return new Result(data);
  }

  async findAll() {
    const data = await this.prisma.ibuyCategory.findMany();
    return new Result(data);
  }

  async create(para: any) {
    const data = await this.prisma.ibuyCategory.create({ data: para });
    return new Result(data);
  }

  async updateById(id: number, para: any) {
    const data = await this.prisma.ibuyCategory.update({
      where: { id },
      data: para,
    });
    return new Result(data);
  }

  async remove(id: number) {
    await this.prisma.ibuyCategory.delete({ where: { id } });
    return new Result(null);
  }
}
