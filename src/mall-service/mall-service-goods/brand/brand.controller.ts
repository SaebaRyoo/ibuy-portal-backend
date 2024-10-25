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

  @Post('/add')
  createPara(@Body() body: any) {
    return this.brandService.addPara(body);
  }

  @Get('/:id')
  async getParaById(@Param('id') id: number) {
    return this.brandService.findById(id);
  }

  @Patch('/:id')
  updatePara(@Param('id') id: number, @Body() para: BrandEntity) {
    return this.brandService.updatePara(id, para);
  }
}
