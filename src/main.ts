import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from 'nest-winston';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Logger, VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/base.exception.filter';
import { HttpExceptionFilter } from './common/filters/http.excepition.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); // 使用 cookie-parser 中间件

  await app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  // 设置统一响应体格式的拦截器
  app.useGlobalInterceptors(
    new TransformInterceptor(app.get(WINSTON_MODULE_PROVIDER) as Logger),
  );
  // 异常过滤器
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(WINSTON_MODULE_PROVIDER) as Logger),
    new HttpExceptionFilter(app.get(WINSTON_MODULE_PROVIDER) as Logger),
  );
  // 接口版本化处理
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });

  // 监听所有的网络接口，从而允许外部访问。比如用docker部署时
  await app.listen(8000, '0.0.0.0');
}
bootstrap();
