import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../../common/constants/RabbitMQConstants';
import { Public } from '../../../common/decorators/metadata/public.decorator';
import { SeckillOrderService } from '../seckill-order/seckill-order.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class SeckillOrderCreateListener {
  constructor(
    private readonly seckillOrderService: SeckillOrderService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Public()
  @RabbitSubscribe({
    exchange: RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_DELAY,
    routingKey: RabbitMQConstants.QUEUE_SEC_KILL_ORDER_DELAY,
    queue: RabbitMQConstants.QUEUE_SEC_KILL_ORDER_DELAY,
  })
  public async handleMessage(msg: any) {
    this.logger.log(
      'info',
      `Seckill order create message received: ${JSON.stringify(msg)}`,
    );

    // 只有包含完整订单数据的消息才处理（排除延时关单消息）
    if (msg.orderId && msg.seckillGoodsId && msg.username) {
      await this.seckillOrderService.createOrder(msg);
    }
  }
}
