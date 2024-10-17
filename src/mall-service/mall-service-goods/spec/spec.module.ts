import { Module } from '@nestjs/common';
import { SpecService } from './spec.service';
import { SpecController } from './spec.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecEntity } from './spec.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpecEntity])],
  providers: [SpecService],
  controllers: [SpecController],
  exports: [SpecService],
})
export class SpecModule {}
