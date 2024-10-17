import { Global, Module } from '@nestjs/common';
import { SpuService } from './spu.service';
import { SpuController } from './spu.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpuEntity } from './spu.entity';
import { CategoryEntity } from '../category/category.entity';
import { SkuEntity } from '../sku/sku.entity';
import { BrandEntity } from '../brand/brand.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpuEntity,
      SkuEntity,
      CategoryEntity,
      BrandEntity,
    ]),
  ],
  providers: [SpuService],
  controllers: [SpuController],
  exports: [SpuService],
})
export class SpuModule {}
