import { Module } from '@nestjs/common';
import { CategoryBrandService } from './category-brand.service';
import { CategoryBrandController } from './category-brand.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryBrandEntity } from './category-brand.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryBrandEntity])],
  providers: [CategoryBrandService],
  controllers: [CategoryBrandController],
  exports: [CategoryBrandService],
})
export class CategoryBrandModule {}
