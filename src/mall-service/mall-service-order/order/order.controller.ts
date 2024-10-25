import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';

@Controller('order')
export class OrderController {
  @Inject(OrderService)
  private orderService: OrderService;

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    const [data, total] = await this.orderService.findList(pageParam);
    return { data, total };
  }

  @Post('/add')
  createSpec(@Body() order: OrderEntity, @Query('username') username: string) {
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
