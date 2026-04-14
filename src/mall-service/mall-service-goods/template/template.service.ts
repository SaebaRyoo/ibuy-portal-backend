import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ibuyTemplate.findMany({ skip, take }),
      this.prisma.ibuyTemplate.count(),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    return this.prisma.ibuyTemplate.findUnique({ where: { id } });
  }

  async addTemplate(template: any) {
    return this.prisma.ibuyTemplate.create({ data: template });
  }

  async updateTemplate(id: number, template: any) {
    return this.prisma.ibuyTemplate.update({
      where: { id },
      data: template,
    });
  }

  async remove(id: number) {
    await this.prisma.ibuyTemplate.delete({ where: { id } });
  }
}
