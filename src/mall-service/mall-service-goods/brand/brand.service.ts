import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { BrandEntity } from './brand.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { CategoryBrandEntity } from '../category-brand/category-brand.entity';
import Result from '../../../common/utils/Result';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(BrandEntity)
    private brandRepository: Repository<BrandEntity>,

    @InjectRepository(CategoryBrandEntity)
    private categoryBrandRepository: Repository<CategoryBrandEntity>,

    @InjectDataSource()
    private dataSource,
  ) {}

  // 根据categoryId获取相关品牌列表
  async findBrandByCategoryId(
    categoryId: number,
  ): Promise<Result<{ data: BrandEntity[]; total: number }>> {
    // const brands = await this.dataSource
    //   .createQueryBuilder()
    //   .select(['ib.id', 'ib.name', 'ib.image'])
    //   .from(CategoryBrandEntity, 'icb')
    //   .innerJoin(BrandEntity, 'ib', 'ib.id = icb.brand_id')
    //   .where('icb.category_id = :categoryId', { categoryId })
    //   .getMany();

    const [data, total] = await this.dataSource
      .query(`SELECT ib.id, name, image FROM ibuy_category_brand icb, ibuy_brand ib WHERE icb.category_id='${categoryId}' AND ib.id=icb.brand_id
`);
    return new Result({ data, total });
  }

  async findList(pageParma: any) {
    const qb = this.brandRepository
      .createQueryBuilder('para')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.brandRepository.findOneBy({ id });
    return new Result(data);
  }

  async addPara(para: BrandEntity) {
    const data = await this.brandRepository.insert(para);
    return new Result(data);
  }

  async updatePara(id: number, para: BrandEntity) {
    const data = await this.brandRepository
      .createQueryBuilder()
      .update(BrandEntity)
      .set(para)
      .where('id = :id', { id })
      .execute();

    return new Result(data);
  }

  async remove(id: number) {
    await this.brandRepository.delete(id);
    return new Result(null);
  }
}
