import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Inject,
  Request,
} from '@nestjs/common';
import { SeckillOrderService } from './seckill-order.service';

@Controller('seckill/order')
export class SeckillOrderController {
  @Inject(SeckillOrderService)
  private seckillOrderService: SeckillOrderService;

  @Post()
  async placeOrder(
    @Body('seckillGoodsId') seckillGoodsId: string,
    @Body('activityId') activityId: string,
    @Body('receiverAddress') receiverAddress: string,
    @Request() req: any,
  ) {
    return this.seckillOrderService.placeOrder(
      seckillGoodsId,
      activityId,
      receiverAddress,
      req,
    );
  }

  @Get('/:id')
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.seckillOrderService.findById(id, req);
  }

  @Post('/list')
  async findByUser(
    @Body('pageParam') pageParam: { current: number; pageSize: number },
    @Request() req: any,
  ) {
    return this.seckillOrderService.findByUser(pageParam, req);
  }
}
