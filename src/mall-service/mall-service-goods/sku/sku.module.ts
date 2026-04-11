import { Global, Module } from '@nestjs/common';
import { SkuService } from './sku.service';
import { SkuController } from './sku.controller';

@Global()
@Module({
  providers: [SkuService],
  controllers: [SkuController],
  exports: [SkuService],
})
export class SkuModule {}
