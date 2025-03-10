import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { WinstonModule } from 'nest-winston';
import 'winston-daily-rotate-file';

import { AuthGuard } from './common/guards/auth.guard';

import { AuthModule } from './mall-service/mall-service-system/auth/auth.module';
import { MemberModule } from './mall-service/mall-service-system/member/member.module';
import { FileModule } from './mall-service/mall-service-file/file.module';
import { TemplateModule } from './mall-service/mall-service-goods/template/template.module';
import { SpecModule } from './mall-service/mall-service-goods/spec/spec.module';
import { ParaModule } from './mall-service/mall-service-goods/para/para.module';
import { BrandModule } from './mall-service/mall-service-goods/brand/brand.module';
import { CategoryModule } from './mall-service/mall-service-goods/category/category.module';
import { CategoryBrandModule } from './mall-service/mall-service-goods/category-brand/category-brand.module';
import { SpuModule } from './mall-service/mall-service-goods/spu/spu.module';
import { SkuModule } from './mall-service/mall-service-goods/sku/sku.module';
import { SearchModule } from './mall-service/mall-service-search/search.module';
import { OrderModule } from './mall-service/mall-service-order/order/order.module';
import { OrderItemsModule } from './mall-service/mall-service-order/order-items/order-items.module';
import { CartModule } from './mall-service/mall-service-order/cart/cart.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AlipayModule } from './mall-service/alipay/alipay.module';
import { AddressModule } from './mall-service/mall-service-system/address/address.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      // envFilePath: ['.env'],
      envFilePath:
        process.env.NODE_ENV === 'development' ? ['.env.dev'] : ['.env'],
      isGlobal: true, // You will not need to import ConfigModule in other modules once it's been loaded in the root module
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get('POSTGRES_HOST'),
          port: configService.get('POSTGRES_PORT'),
          username: configService.get('POSTGRES_USER'),
          password: configService.get('POSTGRES_PASSWORD'),
          database: configService.get('POSTGRES_DATABASE'),
          // With that option specified, every entity registered through the forFeature() method will be automatically added to the entities array of the configuration object.
          autoLoadEntities: true,
          // entities: [Users],
          synchronize: true,
        };
      },
    }),
    RedisModule.forRootAsync({
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
            // username: configService.get('POSTGRES_PASSWORD'),
            password: pw,
            db: 1,
          },
        };
      },
    }),
    WinstonModule.forRoot({
      // options
      transports: [
        new winston.transports.DailyRotateFile({
          dirname: `logs`, // 日志保存的目录
          filename: '%DATE%.log', // 日志名称，占位符 %DATE% 取值为 datePattern 值。
          datePattern: 'YYYY-MM-DD', // 日志轮换的频率，此处表示每天。
          zippedArchive: true, // 是否通过压缩的方式归档被轮换的日志文件。
          maxSize: '20m', // 设置日志文件的最大大小，m 表示 mb 。
          maxFiles: '14d', // 保留日志文件的最大天数，此处表示自动删除超过 14 天的日志文件。
          // 记录时添加时间戳信息
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.json(),
          ),
        }),
      ],
    }),

    // RoleModule,
    // UsersRoleModule,
    // 用户相关模块
    AuthModule,
    MemberModule,
    AddressModule,

    FileModule,
    // 商品相关模块
    TemplateModule,
    SpecModule,
    ParaModule,
    BrandModule,
    CategoryModule,
    CategoryBrandModule,
    SpuModule,
    SkuModule,
    // 搜索
    SearchModule,
    // 订单相关模块
    OrderModule,
    OrderItemsModule,
    CartModule,
    //   支付
    AlipayModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // {
    //   provide: APP_GUARD,
    //   useClass: PermissionGuard,
    // },
  ],
})
export class AppModule {}
