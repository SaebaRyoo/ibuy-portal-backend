import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AuthGuard } from './common/guards/auth.guard';
import { AllExceptionsFilter } from './common/filters/base.exception.filter';
import { HttpExceptionFilter } from './common/filters/http.excepition.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
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

    // Core Modules
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

  // 先执行 Guard 进行权限验证，如果通过则执行 Interceptor 进行数据转换，最后由 Filter 处理异常
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
