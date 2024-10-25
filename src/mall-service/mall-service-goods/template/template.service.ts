import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TemplateEntity } from './template.entity';
import { InjectRepository } from '@nestjs/typeorm';
import Result from '../../../common/utils/Result';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(TemplateEntity)
    private templateRepository: Repository<TemplateEntity>,
  ) {}

  async findList(pageParma: any) {
    const qb = this.templateRepository
      .createQueryBuilder('template')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    // console.log(qb);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.templateRepository.findOneBy({ id });
    return new Result(data);
  }

  async addTemplate(template: TemplateEntity) {
    const data = await this.templateRepository.insert(template);
    return new Result(data);
  }

  async updateTemplate(id: number, template: TemplateEntity) {
    const data = await this.templateRepository
      .createQueryBuilder()
      .update(TemplateEntity)
      .set(template)
      .where('id = :id', { id })
      .execute();
    return new Result(data);
  }

  async remove(id: number) {
    await this.templateRepository.delete(id);
    return new Result(null);
  }
}
