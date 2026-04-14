# 项目结构

```
src/
├── main.ts                            # 入口，配置管道、版本化
├── app.module.ts                      # 根模块，注册全局 Guard/Filter/Interceptor
├── common/                            # 公共模块
│   ├── config/                        # @nestjs/config 配置
│   ├── prisma/                        # Prisma 服务（PrismaService 封装）
│   ├── redis/                         # Redis 模块（ioredis 封装）
│   ├── logger/                        # Winston 日志模块（按日期轮转）
│   ├── guards/auth.guard.ts           # JWT 认证守卫（全局）
│   ├── filters/                       # 异常过滤器
│   │   ├── base.exception.filter.ts   # AllExceptionsFilter — 兜底异常
│   │   ├── http.excepition.filter.ts  # HttpExceptionFilter — HTTP 异常
│   │   └── business.exception.filter.ts # BusinessException 自定义业务异常
│   ├── interceptors/                  # TransformInterceptor 统一响应格式
│   ├── decorators/                    # @Public(), @Permission() 装饰器
│   ├── constants/                     # 业务错误码、RabbitMQ 常量
│   └── utils/                         # Result, IDWorker, 工具函数
└── mall-service/                      # 业务模块
    ├── mall-service-system/           # 用户系统：auth, member, address
    ├── mall-service-goods/            # 商品：brand, template, spec, para, sku, spu
    ├── mall-service-order/            # 订单：order, order-items, MQ listeners
    ├── mall-service-file/             # 文件上传 (MinIO)
    ├── mall-service-search/           # Elasticsearch 搜索
    └── alipay/                        # 支付宝支付
```

## 其他关键目录

| 目录                       | 说明                                           |
| -------------------------- | ---------------------------------------------- |
| `prisma/`                  | Prisma schema 和生成产物                       |
| `prisma/schema.prisma`     | 数据模型定义                                   |
| `prisma/generated/prisma/` | Prisma Client 生成代码（自动生成，勿手动修改） |
| `test/`                    | E2E 测试                                       |
| `sql/`                     | 数据库备份 SQL                                 |
| `logs/`                    | 运行时日志输出（按日期轮转）                   |
| `.github/workflows/`       | CI/CD 工作流                                   |
