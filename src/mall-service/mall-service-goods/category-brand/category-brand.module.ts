import { Module } from '@nestjs/common';
import { CategoryBrandService } from './category-brand.service';
import { CategoryBrandController } from './category-brand.controller';

@Module({
  providers: [CategoryBrandService],
  controllers: [CategoryBrandController],
  exports: [CategoryBrandService],
})
export class CategoryBrandModule {}
