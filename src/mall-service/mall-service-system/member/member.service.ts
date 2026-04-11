import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import Result from '../../../common/utils/Result';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}

  /**
   * 列表 + 分页
   */
  async findList(pageParma: any): Promise<[any[], number]> {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.ibuyMember.findMany({ skip, take }),
      this.prisma.ibuyMember.count(),
    ]);
    return [data, total];
  }

  async findOne(loginName: string) {
    const data = await this.prisma.ibuyMember.findUnique({
      where: { loginName },
    });
    return new Result(data);
  }

  async findOneById(id: number) {
    const data = await this.prisma.ibuyMember.findUnique({ where: { id } });
    return new Result(data);
  }

  async create(data: any): Promise<Result<any>> {
    const _data = { ...data };
    const saltOrRounds = 10;
    _data.password = await bcrypt.hash(_data.password, saltOrRounds);

    const result = await this.prisma.ibuyMember.create({ data: _data });
    return new Result(result);
  }

  async remove(id: number) {
    await this.prisma.ibuyMember.delete({ where: { id } });
    return new Result(null);
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
