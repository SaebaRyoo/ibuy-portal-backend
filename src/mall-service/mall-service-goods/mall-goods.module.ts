import { Module } from '@nestjs/common';
import { TemplateModule } from './template/template.module';
import { SpecModule } from './spec/spec.module';
import { ParaModule } from './para/para.module';
import { BrandModule } from './brand/brand.module';
import { CategoryModule } from './category/category.module';
import { CategoryBrandModule } from './category-brand/category-brand.module';
import { SpuModule } from './spu/spu.module';
import { SkuModule } from './sku/sku.module';

@Module({
  imports: [
    TemplateModule,
    SpecModule,
    ParaModule,
    BrandModule,
    CategoryModule,
    CategoryBrandModule,
    SpuModule,
    SkuModule,
  ],
})
export class MallGoodsModule {}
