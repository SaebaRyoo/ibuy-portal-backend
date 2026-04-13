import { Module } from '@nestjs/common';
import { SeckillActivityService } from './seckill-activity.service';
import { SeckillActivityController } from './seckill-activity.controller';
import { SeckillGoodsModule } from '../seckill-goods/seckill-goods.module';

@Module({
  imports: [SeckillGoodsModule],
  controllers: [SeckillActivityController],
  providers: [SeckillActivityService],
  exports: [SeckillActivityService],
})
export class SeckillActivityModule {}
