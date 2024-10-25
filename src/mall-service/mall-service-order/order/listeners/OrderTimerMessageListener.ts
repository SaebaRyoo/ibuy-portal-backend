import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../../../common/constants/RabbitMQConstants';
import { Public } from '../../../../common/decorators/metadata/public.decorator';
import { OrderService } from '../order.service';

@Injectable()
export class OrderTimerMessageListener {
  constructor(private readonly orderService: OrderService) {}

  @Public()
  @RabbitSubscribe({
    exchange: RabbitMQConstants.EXCHANGE_ORDER_DELAY,
    routingKey: RabbitMQConstants.QUEUE_ORDER_CHECK,
    queue: RabbitMQConstants.QUEUE_ORDER_CHECK,
  })
  public async handleOrderDelayMessage(msg: any) {
    console.log(`Order delayed: ${msg.out_trade_no}`);
    // 支付宝交易号
    const out_trade_no = msg.out_trade_no;

    //用户在下单后的30分后会进入该任务，判断用户是否付款
    //支付失败,
    // 1. 关闭订单
    // 2. 在orderService中取消支付宝订单
    await this.orderService.closeOrder(out_trade_no);
  }
}
