import { forwardRef, Global, Module } from '@nestjs/common';
import { AlipayService } from './alipay.service';
import { AlipayController } from './alipay.controller';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQConstants } from '../../common/constants/RabbitMQConstants';
import { OrderModule } from '../mall-service-order/order/order.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        exchanges: [
          {
            name: RabbitMQConstants.EXCHANGE_ORDER_PAY,
            type: 'direct',
          },
        ],
        uri: `amqp://${configService.get('RMQ_USERNAME')}:${configService.get('RMQ_PASSWORD')}@${configService.get('RMQ_HOST')}:${configService.get('RMQ_PORT')}/${configService.get('RMQ_VIRTUAL_HOST')}`,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AlipayController],
  providers: [AlipayService],
  exports: [AlipayService],
})
export class AlipayModule {}
