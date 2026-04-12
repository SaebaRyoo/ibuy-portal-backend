import { Module } from '@nestjs/common';
import { SeckillOrderService } from './seckill-order.service';
import { SeckillOrderController } from './seckill-order.controller';

@Module({
  controllers: [SeckillOrderController],
  providers: [SeckillOrderService],
  exports: [SeckillOrderService],
})
export class SeckillOrderModule {}
