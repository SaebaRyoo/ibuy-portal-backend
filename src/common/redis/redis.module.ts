import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule as IoRedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    IoRedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('REDIS_HOST');
        const port = configService.get('REDIS_PORT');
        const pw = configService.get('REDIS_PASSWORD');
        return {
          type: 'single',
          url: `redis://${host}:${port}`,
          options: {
            password: pw,
            db: 1,
          },
        };
      },
    }),
  ],
})
export class RedisModule {}
