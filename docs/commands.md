# 常用命令

> 包管理器：**pnpm**

## 开发

| 命令              | 用途                  |
| ----------------- | --------------------- |
| `pnpm start:dev`  | 开发模式启动（watch） |
| `pnpm build`      | 生产构建              |
| `pnpm start:prod` | 生产模式运行          |

## 数据库

| 命令               | 用途               |
| ------------------ | ------------------ |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:migrate`  | 执行数据库迁移     |

## 代码质量

| 命令          | 用途              |
| ------------- | ----------------- |
| `pnpm lint`   | ESLint 检查并修复 |
| `pnpm format` | Prettier 格式化   |

## 测试

| 命令              | 用途                     |
| ----------------- | ------------------------ |
| `pnpm test`       | 运行 Jest 单元测试       |
| `pnpm test:watch` | 监听模式运行测试         |
| `pnpm test:cov`   | 运行测试并生成覆盖率报告 |
| `pnpm test:e2e`   | 运行 E2E 测试            |
