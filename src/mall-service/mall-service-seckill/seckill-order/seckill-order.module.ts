import { Module } from '@nestjs/common';
import { SeckillOrderService } from './seckill-order.service';
import { SeckillOrderController } from './seckill-order.controller';
import { SeckillStockModule } from '../seckill-stock/seckill-stock.module';

@Module({
  imports: [SeckillStockModule],
  controllers: [SeckillOrderController],
  providers: [SeckillOrderService],
  exports: [SeckillOrderService],
})
export class SeckillOrderModule {}
