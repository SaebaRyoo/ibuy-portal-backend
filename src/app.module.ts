import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthGuard } from './common/guards/auth.guard';
import { AppConfigModule } from './common/config/config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { LoggerModule } from './common/logger/logger.module';

import { MallSystemModule } from './mall-service/mall-service-system/mall-system.module';
import { MallGoodsModule } from './mall-service/mall-service-goods/mall-goods.module';
import { MallOrderModule } from './mall-service/mall-service-order/mall-order.module';
import { FileModule } from './mall-service/mall-service-file/file.module';
import { SearchModule } from './mall-service/mall-service-search/search.module';

@Module({
  imports: [
    AppConfigModule,

    PrismaModule,
    RedisModule,
    LoggerModule,

    // 业务模块
    MallSystemModule,
    MallGoodsModule,
    MallOrderModule,
    FileModule,
    SearchModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
