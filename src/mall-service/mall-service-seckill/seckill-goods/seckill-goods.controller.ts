import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Inject,
} from '@nestjs/common';
import { SeckillGoodsService } from './seckill-goods.service';

@Controller('seckill/goods')
export class SeckillGoodsController {
  @Inject(SeckillGoodsService)
  private seckillGoodsService: SeckillGoodsService;

  @Post()
  async add(
    @Body()
    body: {
      activityId: string;
      skuId: string;
      skuName: string;
      skuImage?: string;
      skuPrice: number;
      seckillPrice: number;
      stockCount: number;
    },
  ) {
    return this.seckillGoodsService.add(body);
  }

  @Delete('/:id')
  async remove(@Param('id') id: string) {
    return this.seckillGoodsService.remove(id);
  }

  @Get('/activity/:activityId')
  async findByActivityId(@Param('activityId') activityId: string) {
    return this.seckillGoodsService.findByActivityId(activityId);
  }
}
