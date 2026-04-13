import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CategoryBrandService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = Number(pageParma.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.ibuyCategoryBrand.findMany({ skip, take }),
      this.prisma.ibuyCategoryBrand.count(),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    return this.prisma.ibuyCategoryBrand.findUnique({
      where: { id },
    });
  }

  async addTemplate(template: any) {
    return this.prisma.ibuyCategoryBrand.create({
      data: template,
    });
  }

  async updateTemplate(id: number, template: any) {
    return this.prisma.ibuyCategoryBrand.update({
      where: { id },
      data: template,
    });
  }

  async remove(id: number) {
    await this.prisma.ibuyCategoryBrand.delete({ where: { id } });
  }
}
