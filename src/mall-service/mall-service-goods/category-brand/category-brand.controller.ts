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
import { CategoryBrandService } from './category-brand.service';
import { CategoryBrandEntity } from './category-brand.entity';

@Controller('categoryBrand')
export class CategoryBrandController {
  @Inject(CategoryBrandService)
  private categoryBrandService: CategoryBrandService;

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    return this.categoryBrandService.findList(pageParam);
  }

  @Post()
  async createTemplate(@Body() body: any) {
    return this.categoryBrandService.addTemplate(body);
  }

  @Get('/:id')
  async getTemplateById(@Param('id') id: number) {
    return this.categoryBrandService.findById(id);
  }

  @Patch('/:id')
  updateTemplate(
    @Param('id') id: number,
    @Body() template: CategoryBrandEntity,
  ) {
    return this.categoryBrandService.updateTemplate(id, template);
  }
}
