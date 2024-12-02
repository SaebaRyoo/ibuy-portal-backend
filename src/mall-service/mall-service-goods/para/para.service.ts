import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ParaEntity } from './para.entity';
import { InjectRepository } from '@nestjs/typeorm';
import Result from '../../../common/utils/Result';

@Injectable()
export class ParaService {
  constructor(
    @InjectRepository(ParaEntity)
    private paraRepository: Repository<ParaEntity>,
  ) {}

  async findList(pageParma: any) {
    const qb = this.paraRepository
      .createQueryBuilder('para')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.paraRepository.findOneBy({ id });
    return new Result(data);
  }

  async create(para: ParaEntity) {
    const data = await this.paraRepository.insert(para);
    return new Result(data);
  }

  async updateById(id: number, para: ParaEntity) {
    const data = await this.paraRepository
      .createQueryBuilder()
      .update(ParaEntity)
      .set(para)
      .where('id = :id', { id })
      .execute();
    return new Result(data);
  }

  async remove(id: number) {
    await this.paraRepository.delete(id);
    return new Result(null);
  }
}
