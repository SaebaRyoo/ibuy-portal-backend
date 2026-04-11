import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  // 根据categoryId获取相关品牌列表
  async findBrandByCategoryId(
    categoryId: number,
  ): Promise<Result<{ data: any[]; total: number }>> {
    const [data, total] = await Promise.all([
      this.prisma.$queryRawUnsafe(
        `SELECT ib.id, name, image FROM ibuy_category_brand icb, ibuy_brand ib WHERE icb.category_id='${categoryId}' AND ib.id=icb.brand_id`,
      ) as Promise<any[]>,
      Promise.resolve(0),
    ]);
    return new Result({ data, total: data.length });
  }

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuyBrand.findMany({ skip, take }),
      this.prisma.ibuyBrand.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.prisma.ibuyBrand.findUnique({ where: { id } });
    return new Result(data);
  }

  async create(brand: any) {
    const data = await this.prisma.ibuyBrand.create({ data: brand });
    return new Result(data);
  }

  async updateById(id: number, brand: any) {
    const data = await this.prisma.ibuyBrand.update({
      where: { id },
      data: brand,
    });
    return new Result(data);
  }

  async remove(id: number) {
    await this.prisma.ibuyBrand.delete({ where: { id } });
    return new Result(null);
  }
}
