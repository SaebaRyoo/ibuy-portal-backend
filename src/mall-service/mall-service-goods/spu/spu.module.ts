import { Global, Module } from '@nestjs/common';
import { SpuService } from './spu.service';
import { SpuController } from './spu.controller';

@Global()
@Module({
  providers: [SpuService],
  controllers: [SpuController],
  exports: [SpuService],
})
export class SpuModule {}
