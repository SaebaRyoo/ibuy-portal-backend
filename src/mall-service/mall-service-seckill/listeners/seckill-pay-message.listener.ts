import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../../common/constants/RabbitMQConstants';
import { Public } from '../../../common/decorators/metadata/public.decorator';
import { SeckillOrderService } from '../seckill-order/seckill-order.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class SeckillPayMessageListener {
  constructor(
    private readonly seckillOrderService: SeckillOrderService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Public()
  @RabbitSubscribe({
    exchange: RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_PAY,
    routingKey: RabbitMQConstants.QUEUE_SEC_KILL_ORDER_PAY,
    queue: RabbitMQConstants.QUEUE_SEC_KILL_ORDER_PAY,
  })
  public async handlePayMessage(msg: any) {
    this.logger.log(
      'info',
      `Seckill payment message received: ${JSON.stringify(msg)}`,
    );

    const orderId = msg.out_trade_no;
    const transactionId = msg.trade_no;

    await this.seckillOrderService.paySuccess(orderId, transactionId);
  }
}
