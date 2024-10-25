import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoryBrandEntity } from './category-brand.entity';
import { InjectRepository } from '@nestjs/typeorm';
import Result from '../../../common/utils/Result';

@Injectable()
export class CategoryBrandService {
  constructor(
    @InjectRepository(CategoryBrandEntity)
    private categoryBrandRepository: Repository<CategoryBrandEntity>,
  ) {}

  async findList(pageParma: any) {
    const qb = this.categoryBrandRepository
      .createQueryBuilder('template')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    // console.log(qb);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.categoryBrandRepository.findOneBy({ id });
    return new Result(data);
  }

  async addTemplate(template: CategoryBrandEntity) {
    const data = await this.categoryBrandRepository.insert(template);
    return new Result(data);
  }

  async updateTemplate(id: number, template: CategoryBrandEntity) {
    const data = await this.categoryBrandRepository
      .createQueryBuilder()
      .update(CategoryBrandEntity)
      .set(template)
      .where('id = :id', { id })
      .execute();
    return new Result(data);
  }

  async remove(id: number) {
    await this.categoryBrandRepository.delete(id);
    return new Result(null);
  }
}
