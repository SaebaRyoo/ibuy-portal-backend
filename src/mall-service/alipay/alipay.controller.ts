import { Controller, Post, Inject, Query, Get, Req } from '@nestjs/common';
import { AlipayService } from './alipay.service';
import { Public } from '../../common/decorators/metadata/public.decorator';

@Controller('alipay')
export class AlipayController {
  @Inject(AlipayService)
  private alipayService: AlipayService;

  @Get('/goAlipay')
  async goAlipay(
    @Query('orderId') orderId: string,
    @Query('queueName') queueName: string,
  ) {
    return this.alipayService.goAlipay(orderId, queueName);
  }

  @Public()
  @Post('/alipayNotifyNotice')
  async alipayNotifyNotice(@Req() request: Request) {
    const params = request.body;
    await this.alipayService.alipayNotifyNotice(params);
  }

  @Get('/trade/query')
  async alipayTradeQuery(@Query('orderId') orderId: string) {
    return this.alipayService.tradeQuery(orderId);
  }

  @Post('/trade/close')
  async alipayTradeClose(@Query('trade_no') trade_no: string) {
    return this.alipayService.tradeClose(trade_no);
  }
}
