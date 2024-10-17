import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SpecEntity } from './spec.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SpecService {
  constructor(
    @InjectRepository(SpecEntity)
    private specRepository: Repository<SpecEntity>,
  ) {}

  async findList(pageParma: any): Promise<[SpecEntity[], number]> {
    const qb = this.specRepository
      .createQueryBuilder('spec')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    return await qb.getManyAndCount();
  }

  async findById(id: number) {
    return this.specRepository.findBy({ id });
  }

  addSpec(spec: SpecEntity) {
    return this.specRepository.insert(spec);
  }

  async updateSpec(id: number, spec: SpecEntity) {
    return this.specRepository
      .createQueryBuilder()
      .update(SpecEntity)
      .set(spec)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.specRepository.delete(id);
  }
}
