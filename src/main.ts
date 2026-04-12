import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); // 使用 cookie-parser 中间件

  await app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  // 全局管道：自动将参数转换为 TS 声明的类型（如 string -> number）
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
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
