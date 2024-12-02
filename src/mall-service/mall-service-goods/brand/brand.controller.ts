import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandEntity } from './brand.entity';

@Controller('brand')
export class BrandController {
  @Inject(BrandService)
  private brandService: BrandService;

  @Get('/category/:category_id')
  async findBrandByCategoryId(@Param('category_id') category_id: number) {
    return this.brandService.findBrandByCategoryId(category_id);
  }

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    return this.brandService.findList(pageParam);
  }

  @Post()
  create(@Body() body: any) {
    return this.brandService.create(body);
  }

  @Get('/:id')
  async findById(@Param('id') id: number) {
    return this.brandService.findById(id);
  }

  @Patch('/:id')
  updateById(@Param('id') id: number, @Body() para: BrandEntity) {
    return this.brandService.updateById(id, para);
  }
}
