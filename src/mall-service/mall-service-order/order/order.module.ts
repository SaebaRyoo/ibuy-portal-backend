import { Global, Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { OrderTimerMessageListener } from './listeners/OrderTimerMessageListener';
import { RabbitMQConstants } from '../../../common/constants/RabbitMQConstants';
import { OrderPayMessageListener } from './listeners/OrderPayMessageListener';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    ConfigModule,
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        exchanges: [
          {
            name: RabbitMQConstants.EXCHANGE_ORDER_DELAY,
            type: 'direct',
          },
          {
            name: RabbitMQConstants.EXCHANGE_ORDER_PAY,
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
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderTimerMessageListener, OrderPayMessageListener],
  exports: [OrderService],
})
export class OrderModule {}
