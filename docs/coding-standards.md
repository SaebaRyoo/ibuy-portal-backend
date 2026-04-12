# 开发规范

## 代码风格

- 包管理器：**pnpm**
- Prettier：单引号，尾逗号 `all`
- ESLint：`@typescript-eslint/recommended` + `prettier`
- 缩进：2 空格

## 命名约定

| 类型         | 风格                     | 示例                  |
| ------------ | ------------------------ | --------------------- |
| 文件         | kebab-case               | `brand.controller.ts` |
| 类           | PascalCase               | `BrandService`        |
| 函数/变量    | camelCase                | `findById`            |
| 常量         | UPPER_SNAKE_CASE         | `BUSINESS_ERROR_CODE` |
| 数据库表     | snake*case，前缀 `ibuy*` | `ibuy_brand`          |
| Prisma Model | PascalCase 前缀 `Ibuy`   | `IbuyBrand`           |

## API 规范

- RESTful 风格
- URI 版本化：`/v1/...`
- 统一响应格式：`{ data, code, message, success, extra }`
- 业务异常使用 `BusinessException`，返回 HTTP 200 + 业务错误码
- 参数校验使用 `class-validator` + `class-transformer`（全局 `ValidationPipe`）

## 认证

- 全局 `AuthGuard`（JWT），使用 `@Public()` 装饰器跳过
- JWT token 通过 cookie 传递

## 环境变量

- 配置文件：`.env`（参考 `.env.example`）
- 通过 `@nestjs/config` 的 `ConfigService` 读取
- 区分 `NODE_ENV=development / production`
