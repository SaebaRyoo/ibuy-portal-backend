import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepository: Repository<CategoryEntity>,
  ) {}

  async findList(pageParma: any): Promise<[CategoryEntity[], number]> {
    const qb = this.categoryRepository
      .createQueryBuilder('para')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    return await qb.getManyAndCount();
  }

  async findById(id: number) {
    return this.categoryRepository.findBy({ id });
  }

  addPara(para: CategoryEntity) {
    return this.categoryRepository.insert(para);
  }

  async updatePara(id: number, para: CategoryEntity) {
    return this.categoryRepository
      .createQueryBuilder()
      .update(CategoryEntity)
      .set(para)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.categoryRepository.delete(id);
  }
}
