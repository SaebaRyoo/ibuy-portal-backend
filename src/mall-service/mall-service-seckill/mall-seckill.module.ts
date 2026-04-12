import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../common/constants/RabbitMQConstants';

import { SeckillActivityModule } from './seckill-activity/seckill-activity.module';
import { SeckillGoodsModule } from './seckill-goods/seckill-goods.module';
import { SeckillOrderModule } from './seckill-order/seckill-order.module';
import { SeckillStockService } from './seckill-stock/seckill-stock.service';
import { SeckillOrderCreateListener } from './listeners/seckill-order-create.listener';
import { SeckillTimerMessageListener } from './listeners/seckill-timer-message.listener';
import { SeckillPayMessageListener } from './listeners/seckill-pay-message.listener';

@Global()
@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        exchanges: [
          {
            name: RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_DELAY,
            type: 'direct',
          },
          {
            name: RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_PAY,
            type: 'direct',
          },
        ],
        uri: `amqp://${configService.get('RMQ_USERNAME')}:${configService.get('RMQ_PASSWORD')}@${configService.get('RMQ_HOST')}:${configService.get('RMQ_PORT')}/${configService.get('RMQ_VIRTUAL_HOST')}`,
        connectionInitOptions: {
          wait: false,
          timeout: 100 * 1000,
        },
      }),
      inject: [ConfigService],
    }),
    SeckillActivityModule,
    SeckillGoodsModule,
    SeckillOrderModule,
  ],
  providers: [
    SeckillStockService,
    SeckillOrderCreateListener,
    SeckillTimerMessageListener,
    SeckillPayMessageListener,
  ],
  exports: [SeckillStockService],
})
export class MallSeckillModule {}
