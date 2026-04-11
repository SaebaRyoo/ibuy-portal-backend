import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { CartModule } from './cart/cart.module';
import { AlipayModule } from '../alipay/alipay.module';

@Module({
  imports: [OrderModule, OrderItemsModule, CartModule, AlipayModule],
})
export class MallOrderModule {}
