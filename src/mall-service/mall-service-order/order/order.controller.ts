import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Inject,
  Query,
  Request,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';

@Controller('order')
export class OrderController {
  @Inject(OrderService)
  private orderService: OrderService;

  @Get('/list/:current/:pageSize')
  async findList(
    @Param('current') current: number,
    @Param('pageSize') pageSize: number,
    @Query('orderStatus') orderStatus: string,
    @Request() req: any,
  ) {
    return this.orderService.findList({ current, pageSize, orderStatus }, req);
  }

  /**
   * 购物车下单
   * @param order
   * @param username
   */
  @Post('/cart/add')
  addOrderFormCart(
    @Body() order: OrderEntity,
    @Query('username') username: string,
  ) {
    //设置购买用户
    order.username = username;
    return this.orderService.addOrder(order);
  }

  @Get('/:id')
  async getSpecById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Patch('/:id')
  update(@Param('id') id: number, @Body() spec: OrderEntity) {
    return this.orderService.update(id, spec);
  }
}
