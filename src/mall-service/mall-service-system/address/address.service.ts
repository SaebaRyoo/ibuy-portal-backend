import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findList(
    pageParma: any,
  ): Promise<Result<{ data: any[]; total: number }>> {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuyAddress.findMany({ skip, take }),
      this.prisma.ibuyAddress.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.prisma.ibuyAddress.findUnique({ where: { id } });
    return new Result(data);
  }

  async add(address: any) {
    const data = await this.prisma.ibuyAddress.create({ data: address });
    return new Result(data);
  }

  async update(id: string, address: any) {
    const data = await this.prisma.ibuyAddress.update({
      where: { id: Number(id) },
      data: address,
    });
    return new Result(data);
  }

  async remove(id: number) {
    await this.prisma.ibuyAddress.delete({ where: { id } });
    return new Result(null);
  }

  async findAll() {
    const data = await this.prisma.ibuyAddress.findMany();
    return new Result(data);
  }
}
