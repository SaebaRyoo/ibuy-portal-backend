import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ParaEntity } from './para.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ParaService {
  constructor(
    @InjectRepository(ParaEntity)
    private paraRepository: Repository<ParaEntity>,
  ) {}

  async findList(pageParma: any): Promise<[ParaEntity[], number]> {
    const qb = this.paraRepository
      .createQueryBuilder('para')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    return await qb.getManyAndCount();
  }

  async findById(id: number) {
    return this.paraRepository.findBy({ id });
  }

  addPara(para: ParaEntity) {
    return this.paraRepository.insert(para);
  }

  async updatePara(id: number, para: ParaEntity) {
    return this.paraRepository
      .createQueryBuilder()
      .update(ParaEntity)
      .set(para)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.paraRepository.delete(id);
  }
}
