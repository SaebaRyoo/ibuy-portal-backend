import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  // 根据categoryId获取相关品牌列表
  async findBrandByCategoryId(categoryId: number) {
    const [items, total] = await Promise.all([
      this.prisma.$queryRawUnsafe(
        `SELECT ib.id, name, image FROM ibuy_category_brand icb, ibuy_brand ib WHERE icb.category_id='${categoryId}' AND ib.id=icb.brand_id`,
      ) as Promise<any[]>,
      Promise.resolve(0),
    ]);
    return { items, total: (items as any[]).length };
  }

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ibuyBrand.findMany({ skip, take }),
      this.prisma.ibuyBrand.count(),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    return this.prisma.ibuyBrand.findUnique({ where: { id } });
  }

  async create(brand: any) {
    return this.prisma.ibuyBrand.create({ data: brand });
  }

  async updateById(id: number, brand: any) {
    return this.prisma.ibuyBrand.update({
      where: { id },
      data: brand,
    });
  }

  async remove(id: number) {
    await this.prisma.ibuyBrand.delete({ where: { id } });
  }
}
