import { Module } from '@nestjs/common';
import { SpecService } from './spec.service';
import { SpecController } from './spec.controller';

@Module({
  providers: [SpecService],
  controllers: [SpecController],
  exports: [SpecService],
})
export class SpecModule {}
