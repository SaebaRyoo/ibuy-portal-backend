import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import Result from '../../../common/utils/Result';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepository: Repository<CategoryEntity>,
  ) {}

  async findList(
    pageParma: any,
  ): Promise<Result<{ data: CategoryEntity[]; total: number }>> {
    const qb = this.categoryRepository
      .createQueryBuilder('para')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.categoryRepository.findOneBy({ id });
    return new Result(data);
  }

  async addPara(para: CategoryEntity) {
    const data = await this.categoryRepository.insert(para);
    return new Result(data);
  }

  async updatePara(id: number, para: CategoryEntity) {
    const data = await this.categoryRepository
      .createQueryBuilder()
      .update(CategoryEntity)
      .set(para)
      .where('id = :id', { id })
      .execute();
    return new Result(data);
  }

  async remove(id: number) {
    await this.categoryRepository.delete(id);
    return new Result(null);
  }
}
