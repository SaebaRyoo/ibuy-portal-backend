# 技术栈

## 核心框架

- **NestJS 10** + **TypeScript** — 主框架，模块化单体架构

## 数据层

| 组件            | 用途     | 包                       |
| --------------- | -------- | ------------------------ |
| PostgreSQL      | 主数据库 | —                        |
| Prisma 7        | ORM      | `@prisma/client`         |
| Redis           | 缓存     | `ioredis`                |
| Elasticsearch 8 | 全文搜索 | `@elastic/elasticsearch` |

## 中间件 & 外部服务

| 组件       | 用途          | 包                           |
| ---------- | ------------- | ---------------------------- |
| RabbitMQ   | 消息队列      | `@golevelup/nestjs-rabbitmq` |
| MinIO      | 文件/对象存储 | `minio`                      |
| 支付宝 SDK | 在线支付      | `alipay-sdk`                 |

## 基础设施

| 组件            | 用途        | 包                                      |
| --------------- | ----------- | --------------------------------------- |
| Winston         | 日志        | `winston` + `winston-daily-rotate-file` |
| JWT             | 认证令牌    | `@nestjs/jwt`                           |
| bcryptjs        | 密码哈希    | `bcryptjs`                              |
| cookie-parser   | Cookie 解析 | `cookie-parser`                         |
| class-validator | 参数校验    | `class-validator` + `class-transformer` |

## 测试 & 部署

| 组件                    | 用途                |
| ----------------------- | ------------------- |
| Jest                    | 单元测试 + E2E 测试 |
| Docker + docker-compose | 容器化部署          |
| pnpm                    | 包管理器            |
