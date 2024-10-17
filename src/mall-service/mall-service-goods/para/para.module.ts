import { Module } from '@nestjs/common';
import { ParaService } from './para.service';
import { ParaController } from './para.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParaEntity } from './para.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParaEntity])],
  providers: [ParaService],
  controllers: [ParaController],
  exports: [ParaService],
})
export class ParaModule {}
