import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}

  /**
   * 列表 + 分页
   */
  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuyMember.findMany({ skip, take }),
      this.prisma.ibuyMember.count(),
    ]);
    return { items: data, total };
  }

  async findOne(loginName: string) {
    return this.prisma.ibuyMember.findUnique({
      where: { loginName },
    });
  }

  async findOneById(id: number) {
    return this.prisma.ibuyMember.findUnique({ where: { id } });
  }

  async create(data: any) {
    const _data = { ...data };
    const saltOrRounds = 10;
    _data.password = await bcrypt.hash(_data.password, saltOrRounds);

    return this.prisma.ibuyMember.create({ data: _data });
  }

  async remove(id: number) {
    await this.prisma.ibuyMember.delete({ where: { id } });
  }

  /**
   * 增加token版本号
   */
  async incrementTokenVersion(userId: number): Promise<void> {
    await this.prisma.ibuyMember.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }
}
