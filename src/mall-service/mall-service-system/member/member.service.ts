import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InsertResult, Repository } from 'typeorm';
import { MemberEntity } from './member.entity';
import * as bcrypt from 'bcrypt';
import Result from '../../../common/utils/Result';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(MemberEntity)
    private usersRepository: Repository<MemberEntity>,
  ) {}

  /**
   * 列表 + 分页
   * @param pageParma
   */
  async findList(pageParma: any): Promise<[MemberEntity[], number]> {
    const qb = this.usersRepository
      .createQueryBuilder('member')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    return await qb.getManyAndCount();
  }

  async findOne(loginName: string) {
    const data = await this.usersRepository.findOneBy({ loginName });
    return new Result(data);
  }

  async findOneById(id: number) {
    const data = await this.usersRepository.findOneBy({ id });
    return new Result(data);
  }

  async create(data: MemberEntity): Promise<Result<any>> {
    const _data: MemberEntity = { ...data };

    const saltOrRounds = 10;
    _data.password = await bcrypt.hash(_data.password, saltOrRounds);

    const result: InsertResult = await this.usersRepository.insert(_data);
    return new Result(result);
  }

  async remove(id: number) {
    await this.usersRepository.delete(id);
    return new Result(null);
  }

  /**
   * 增加token版本号
   * @param userId
   */
  async incrementTokenVersion(userId: number): Promise<void> {
    await this.usersRepository
      .createQueryBuilder()
      .update(MemberEntity)
      .set({
        tokenVersion: () => 'tokenVersion + 1',
      })
      .where('id = :id', { id: userId })
      .execute();
  }
}
