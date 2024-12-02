import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { SkuService } from './sku.service';
import { Public } from '../../../common/decorators/metadata/public.decorator';

@Controller('sku')
export class SkuController {
  @Inject(SkuService)
  private skuService: SkuService;

  @Public()
  @Post('/list/:current/:pageSize')
  async findList(
    @Param('current') current: number,
    @Param('pageSize') pageSize: number,
  ) {
    return this.skuService.findList({ current, pageSize });
  }

  /**
   * 获取指定id的sku信息
   * @param id - 商品sku的唯一标识符
   * @returns 包含指定id的sku信息的响应
   */
  @Public()
  @Get('/:id')
  async getSkuById(@Param('id') id: string) {
    return this.skuService.findById(id);
  }

  /**
   * 获取销量前n的sku信息
   * TODO: get请求必须要加上Param，不然无法获取数据，why？
   * @param limit
   */
  @Public()
  @Get('/best-sellers/:limit')
  async findTop(@Param('limit') limit: number) {
    return this.skuService.findTopBySaleNum(limit);
  }
  /**
   * 根据spuId查询相关sku信息
   * @param spuId
   */
  @Public()
  @Get('/spu/:spuId')
  async getSkusBySpuId(@Param('spuId') spuId: string) {
    return this.skuService.findBySpuId(spuId);
  }
}
