import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../../common/constants/RabbitMQConstants';
import { Public } from '../../../common/decorators/metadata/public.decorator';
import { SeckillOrderService } from '../seckill-order/seckill-order.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class SeckillTimerMessageListener {
  constructor(
    private readonly seckillOrderService: SeckillOrderService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Public()
  @RabbitSubscribe({
    exchange: RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_DELAY,
    routingKey: RabbitMQConstants.QUEUE_SEC_KILL_ORDER_CHECK,
    queue: RabbitMQConstants.QUEUE_SEC_KILL_ORDER_CHECK,
  })
  public async handleOrderDelayMessage(msg: any) {
    this.logger.log('info', `Seckill order timer check: ${msg.out_trade_no}`);

    const outTradeNo = msg.out_trade_no;
    await this.seckillOrderService.closeOrder(outTradeNo);
  }
}
