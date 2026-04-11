import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../../../common/constants/RabbitMQConstants';
import { Public } from '../../../../common/decorators/metadata/public.decorator';
import { OrderService } from '../order.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class OrderPayMessageListener {
  constructor(
    private readonly orderService: OrderService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Public()
  @RabbitSubscribe({
    exchange: RabbitMQConstants.EXCHANGE_ORDER_PAY,
    routingKey: RabbitMQConstants.QUEUE_ORDER_PAY,
    queue: RabbitMQConstants.QUEUE_ORDER_PAY,
  })
  public async consumeOrderPayMessage(msg: any) {
    this.logger.log('info', `consume pay message: ${JSON.stringify(msg)}`);

    const signVerified = msg?.signVerified;
    const out_trade_no = msg?.out_trade_no;
    const trade_no = msg?.trade_no;
    const trade_status = msg?.trade_status;

    if (!(signVerified === '1')) {
      return;
    }

    if (trade_status === 'TRADE_SUCCESS') {
      await this.orderService.update(out_trade_no, {
        payStatus: '1',
        orderStatus: '1',
        payTime: new Date(),
        transactionId: trade_no,
      });
      this.logger.log('info', '验证成功');
    }
  }
}
