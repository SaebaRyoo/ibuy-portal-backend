import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { BrandEntity } from './brand.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { CategoryBrandEntity } from '../category-brand/category-brand.entity';

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
  ): Promise<[BrandEntity[], number]> {
    // const brands = await this.dataSource
    //   .createQueryBuilder()
    //   .select(['ib.id', 'ib.name', 'ib.image'])
    //   .from(CategoryBrandEntity, 'icb')
    //   .innerJoin(BrandEntity, 'ib', 'ib.id = icb.brand_id')
    //   .where('icb.category_id = :categoryId', { categoryId })
    //   .getMany();

    const brands = await this.dataSource
      .query(`SELECT ib.id, name, image FROM ibuy_category_brand icb, ibuy_brand ib WHERE icb.category_id='${categoryId}' AND ib.id=icb.brand_id
`);

    return brands;
  }

  async findList(pageParma: any): Promise<[BrandEntity[], number]> {
    const qb = this.brandRepository
      .createQueryBuilder('para')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    return await qb.getManyAndCount();
  }

  async findById(id: number) {
    return this.brandRepository.findBy({ id });
  }

  addPara(para: BrandEntity) {
    return this.brandRepository.insert(para);
  }

  async updatePara(id: number, para: BrandEntity) {
    return this.brandRepository
      .createQueryBuilder()
      .update(BrandEntity)
      .set(para)
      .where('id = :id', { id })
      .execute();
  }

  async remove(id: number): Promise<void> {
    await this.brandRepository.delete(id);
  }
}
