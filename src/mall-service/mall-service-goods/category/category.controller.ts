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
import { CategoryService } from './category.service';
import { CategoryEntity } from './category.entity';

@Controller('category')
export class CategoryController {
  @Inject(CategoryService)
  private categoryService: CategoryService;

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    const [data, total] = await this.categoryService.findList(pageParam);
    return { data, total };
  }

  @Post('/add')
  createPara(@Body() body: any) {
    return this.categoryService.addPara(body);
  }

  @Get('/:id')
  async getParaById(@Param('id') id: number) {
    return this.categoryService.findById(id);
  }

  @Patch('/:id')
  updatePara(@Param('id') id: number, @Body() para: CategoryEntity) {
    return this.categoryService.updatePara(id, para);
  }
}
