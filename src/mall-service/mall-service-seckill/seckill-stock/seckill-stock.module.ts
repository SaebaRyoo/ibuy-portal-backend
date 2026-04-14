import { Module } from '@nestjs/common';
import { SeckillStockService } from './seckill-stock.service';

@Module({
  providers: [SeckillStockService],
  exports: [SeckillStockService],
})
export class SeckillStockModule {}
