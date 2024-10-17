import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TemplateEntity } from './template.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(TemplateEntity)
    private templateRepository: Repository<TemplateEntity>,
  ) {}

  async findList(pageParma: any): Promise<[TemplateEntity[], number]> {
    const qb = this.templateRepository
      .createQueryBuilder('template')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    // console.log(qb);
    return await qb.getManyAndCount();
  }

  async findById(id: number) {
    return this.templateRepository.findBy({ id });
  }

  async addTemplate(template: TemplateEntity) {
    return this.templateRepository.insert(template);
  }

  async updateTemplate(id: number, template: TemplateEntity) {
    return this.templateRepository
      .createQueryBuilder()
      .update(TemplateEntity)
      .set(template)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.templateRepository.delete(id);
  }
}
