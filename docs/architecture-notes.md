# 架构注意事项

## Prisma

- Schema 位于 `prisma/schema.prisma`
- 生成产物在 `prisma/generated/prisma/`（自动生成，**禁止手动修改**）
- 修改数据模型后需执行 `pnpm db:generate` 重新生成 Client

## 全局注册

全局 Guard、Filter、Interceptor 均在 `AppModule` 的 `providers` 中通过以下 token 注册：

- `APP_GUARD` — AuthGuard
- `APP_FILTER` — AllExceptionsFilter, HttpExceptionFilter, BusinessExceptionFilter
- `APP_INTERCEPTOR` — TransformInterceptor

## 日志

- 输出到 `logs/` 目录
- 按日期轮转（winston-daily-rotate-file）

## 服务端口

- 监听端口：**8000**
- 绑定地址：`0.0.0.0`
