import { Global, Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemsEntity } from '../order-items/entities/order-items.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OrderItemsEntity])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
