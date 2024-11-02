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
import { Public } from '../../../common/decorators/metadata/public.decorator';

@Controller('sku')
export class SkuController {
  @Inject(SkuService)
  private skuService: SkuService;

  @Public()
  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    return await this.skuService.findList(pageParam);
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
  updateSku(@Param('id') id: string, @Body() sku: SkuEntity) {
    return this.skuService.updateSku(id, sku);
  }
}
