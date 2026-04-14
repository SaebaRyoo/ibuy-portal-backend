import { Module } from '@nestjs/common';
import { SeckillGoodsService } from './seckill-goods.service';
import { SeckillGoodsController } from './seckill-goods.controller';

@Module({
  controllers: [SeckillGoodsController],
  providers: [SeckillGoodsService],
  exports: [SeckillGoodsService],
})
export class SeckillGoodsModule {}
