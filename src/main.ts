import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/base.exception.filter';
import { HttpExceptionFilter } from './common/filters/http.excepition.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  // 设置统一响应体格式的拦截器
  app.useGlobalInterceptors(new TransformInterceptor());
  // 异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  // 接口版本化处理
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });

  await app.listen(8000);
}
bootstrap();
