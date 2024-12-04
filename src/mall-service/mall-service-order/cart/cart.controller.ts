import { Controller, Post, Request, Inject, Query, Get } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  @Inject(CartService)
  private cartService: CartService;

  /**
   * 添加到购物车
   * @param id
   * @param num
   * @param username
   * @param req
   */
  @Post('/add')
  addToCart(
    @Query('id') id: string,
    @Query('num') num: number,
    @Query('username') username: string,
    @Request() req,
  ) {
    return this.cartService.add(id, num, username, req);
  }

  @Get('/list')
  async findList(@Query('username') username: string, @Request() req) {
    return this.cartService.list(username, req);
  }
}
