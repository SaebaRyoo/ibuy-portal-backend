import { Controller, Post, Body, Inject, Query, Get } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  @Inject(CartService)
  private cartService: CartService;

  @Post()
  createSpec(
    @Query('id') id: string,
    @Query('num') num: number,
    @Query('username') username: string,
  ) {
    return this.cartService.add(id, num, username);
  }

  @Get('/list')
  async findList(@Query('username') username: string) {
    return this.cartService.list(username);
  }
}
