import { Module } from '@nestjs/common';
import { ParaService } from './para.service';
import { ParaController } from './para.controller';

@Module({
  providers: [ParaService],
  controllers: [ParaController],
  exports: [ParaService],
})
export class ParaModule {}
