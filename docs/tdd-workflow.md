# TDD 开发流程

本项目采用测试驱动开发（TDD），所有新功能和 bug 修复必须遵循 Red-Green-Refactor 循环。

## 流程

1. **Red** — 先编写失败的测试，明确预期行为
2. **Green** — 编写最少量的实现代码使测试通过
3. **Refactor** — 在测试保护下重构代码，保持测试绿色

## 测试规范

- 测试文件与源文件同目录，命名为 `*.spec.ts`
- E2E 测试放在 `test/` 目录，命名为 `*.e2e-spec.ts`
- 使用 Jest 作为测试框架，`@nestjs/testing` 提供测试工具
- Service 层必须有单元测试，mock 外部依赖（Prisma、Redis 等）
- Controller 层编写集成测试，验证路由、守卫、管道、拦截器的协作
- 每个 PR 必须包含对应的测试用例

## 测试结构模板

```typescript
describe('XxxService', () => {
  // 1. 设置测试模块，mock 依赖
  beforeEach(async () => { ... });

  describe('methodName', () => {
    it('should 预期行为描述', () => { ... });
    it('should throw when 异常场景', () => { ... });
  });
});
```

## 测试优先级

1. Service 层业务逻辑（必须）
2. Controller 路由和参数校验（必须）
3. Guard / Filter / Interceptor（推荐）
4. E2E 关键业务流程（推荐）
