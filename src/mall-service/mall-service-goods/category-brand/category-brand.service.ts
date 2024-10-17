import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoryBrandEntity } from './category-brand.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CategoryBrandService {
  constructor(
    @InjectRepository(CategoryBrandEntity)
    private categoryBrandRepository: Repository<CategoryBrandEntity>,
  ) {}

  async findList(pageParma: any): Promise<[CategoryBrandEntity[], number]> {
    const qb = this.categoryBrandRepository
      .createQueryBuilder('template')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    // console.log(qb);
    return await qb.getManyAndCount();
  }

  async findById(id: number) {
    return this.categoryBrandRepository.findBy({ id });
  }

  async addTemplate(template: CategoryBrandEntity) {
    return this.categoryBrandRepository.insert(template);
  }

  async updateTemplate(id: number, template: CategoryBrandEntity) {
    return this.categoryBrandRepository
      .createQueryBuilder()
      .update(CategoryBrandEntity)
      .set(template)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.categoryBrandRepository.delete(id);
  }
}
