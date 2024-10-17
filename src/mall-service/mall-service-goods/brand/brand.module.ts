import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandEntity } from './brand.entity';
import { CategoryBrandEntity } from '../category-brand/category-brand.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BrandEntity, CategoryBrandEntity])],
  providers: [BrandService],
  controllers: [BrandController],
  exports: [BrandService],
})
export class BrandModule {}
