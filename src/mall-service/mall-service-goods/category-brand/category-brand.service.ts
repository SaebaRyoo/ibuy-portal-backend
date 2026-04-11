import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class CategoryBrandService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = Number(pageParma.pageSize);
    const [data, total] = await Promise.all([
      this.prisma.ibuyCategoryBrand.findMany({ skip, take }),
      this.prisma.ibuyCategoryBrand.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.prisma.ibuyCategoryBrand.findUnique({
      where: { id },
    });
    return new Result(data);
  }

  async addTemplate(template: any) {
    const data = await this.prisma.ibuyCategoryBrand.create({
      data: template,
    });
    return new Result(data);
  }

  async updateTemplate(id: number, template: any) {
    const data = await this.prisma.ibuyCategoryBrand.update({
      where: { id },
      data: template,
    });
    return new Result(data);
  }

  async remove(id: number) {
    await this.prisma.ibuyCategoryBrand.delete({ where: { id } });
    return new Result(null);
  }
}
