import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SpuEntity } from './spu.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SkuEntity } from '../sku/sku.entity';
import { CategoryEntity } from '../category/category.entity';
import { BrandEntity } from '../brand/brand.entity';
import Result from '../../../common/utils/Result';

@Injectable()
export class SpuService {
  constructor(
    @InjectRepository(SpuEntity)
    private spuRepository: Repository<SpuEntity>,

    @InjectRepository(SkuEntity)
    private skuRepository: Repository<SkuEntity>,

    @InjectRepository(CategoryEntity)
    private categoryRepository: Repository<CategoryEntity>,

    @InjectRepository(BrandEntity)
    private brandRepository: Repository<BrandEntity>,
  ) {}

  async findList(pageParma: any) {
    const qb = this.spuRepository
      .createQueryBuilder('spu')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: string) {
    const data = await this.spuRepository.findOneBy({ id });
    return new Result(data);
  }
}
