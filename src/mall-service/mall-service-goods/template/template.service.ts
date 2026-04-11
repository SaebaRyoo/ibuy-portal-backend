import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import Result from '../../../common/utils/Result';

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuyTemplate.findMany({ skip, take }),
      this.prisma.ibuyTemplate.count(),
    ]);
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.prisma.ibuyTemplate.findUnique({ where: { id } });
    return new Result(data);
  }

  async addTemplate(template: any) {
    const data = await this.prisma.ibuyTemplate.create({ data: template });
    return new Result(data);
  }

  async updateTemplate(id: number, template: any) {
    const data = await this.prisma.ibuyTemplate.update({
      where: { id },
      data: template,
    });
    return new Result(data);
  }

  async remove(id: number) {
    await this.prisma.ibuyTemplate.delete({ where: { id } });
    return new Result(null);
  }
}
