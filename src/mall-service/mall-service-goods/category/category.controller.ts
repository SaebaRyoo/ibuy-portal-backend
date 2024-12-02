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
import { Public } from '../../../common/decorators/metadata/public.decorator';

@Controller('category')
export class CategoryController {
  @Inject(CategoryService)
  private categoryService: CategoryService;

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    return this.categoryService.findList(pageParam);
  }

  @Public()
  @Get('/all')
  async findAll() {
    return this.categoryService.findAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.categoryService.create(body);
  }

  @Get('/:id')
  async findById(@Param('id') id: number) {
    return this.categoryService.findById(id);
  }

  @Patch('/:id')
  updateById(@Param('id') id: number, @Body() para: CategoryEntity) {
    return this.categoryService.updateById(id, para);
  }
}
