import { Global, Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpuEntity } from '../../mall-service-goods/spu/spu.entity';
import { SkuEntity } from '../../mall-service-goods/sku/sku.entity';
import { CategoryEntity } from '../../mall-service-goods/category/category.entity';
import { BrandEntity } from '../../mall-service-goods/brand/brand.entity';
import { OrderItemsEntity } from '../order-items/entities/order-items.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OrderItemsEntity])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
