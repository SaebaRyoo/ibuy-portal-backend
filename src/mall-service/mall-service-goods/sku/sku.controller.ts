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
import { SkuService } from './sku.service';
import { SkuEntity } from './sku.entity';

@Controller('sku')
export class SkuController {
  @Inject(SkuService)
  private skuService: SkuService;

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    const [data, total] = await this.skuService.findList(pageParam);
    return { data, total };
  }

  @Post('/add')
  createSku(@Body() body: any) {
    return this.skuService.addSku(body);
  }

  @Get('/:id')
  async getSkuById(@Param('id') id: string) {
    return this.skuService.findById(id);
  }

  @Patch('/:id')
  updateSku(@Param('id') id: number, @Body() sku: SkuEntity) {
    return this.skuService.updateSku(id, sku);
  }
}
