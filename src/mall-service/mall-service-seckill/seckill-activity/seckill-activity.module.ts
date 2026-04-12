import { Module } from '@nestjs/common';
import { SeckillActivityService } from './seckill-activity.service';
import { SeckillActivityController } from './seckill-activity.controller';

@Module({
  controllers: [SeckillActivityController],
  providers: [SeckillActivityService],
  exports: [SeckillActivityService],
})
export class SeckillActivityModule {}
