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
import { DirectOrderSkuDto } from './dto/direct-order-sku.dto';
import { DirectOrderInfoDto } from './dto/direct-order-info.dto';

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
   * 直接下单
   * @param orderSku 商品SKU信息
   * @param orderInfo 订单基本信息
   * @param req 请求对象
   */
  @Post('/direct')
  async directOrder(
    @Body('skuInfo') skuInfo: DirectOrderSkuDto,
    @Body('orderInfo') orderInfo: DirectOrderInfoDto,
    @Request() req: any,
  ) {
    return this.orderService.directOrder(skuInfo, orderInfo, req);
  }

  /**
   * 购物车下单, 清空购物车
   * @param order
   * @param req
   */
  @Post('/cart/add')
  addOrderFormCart(@Body() order: OrderEntity, @Request() req: any) {
    return this.orderService.addOrder(order, req);
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
