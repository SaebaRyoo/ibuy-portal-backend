import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
} from '@nestjs/common';
import { OrderItemsService } from './order-items.service';
import { OrderItemsEntity } from './entities/order-items.entity';

@Controller('order-items')
export class OrderItemsController {
  @Inject(OrderItemsService)
  private orderService: OrderItemsService;

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    return this.orderService.findList(pageParam);
  }

  /**
   * 根据orderId获取订单详情信息
   * @param orderId
   */
  @Get('/item/:orderId')
  async findItemsByOrderId(@Param('orderId') orderId: string) {
    return this.orderService.findItemsByOrderId(orderId);
  }

  @Post()
  add(@Body() body: any) {
    return this.orderService.add(body);
  }

  @Get('/:id')
  async getSpecById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Patch('/:id')
  update(@Param('id') id: number, @Body() spec: OrderItemsEntity) {
    return this.orderService.update(id, spec);
  }
}
