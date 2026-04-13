# API 响应格式统一化设计

## 问题

当前后端接口返回格式存在严重不一致：

1. **双重嵌套**：`TransformInterceptor` 将 `Result` 对象再包一层，导致前端访问分页数据需要 `response.data.data`，搜索甚至需要 `response.data.data.data`（三层）
2. **部分 Service 未使用 Result**：`order.findById`、`order.update` 返回裸 Prisma 对象，经 Interceptor 后产生 `{ data: undefined }`
3. **错误格式不统一**：成功用 `code`，业务异常用 `status`，503 用 `statusCode` — 三个不同字段名
4. **分页数据字段混淆**：分页结果用 `{ data: [...], total }` 与外层 `data` 字段名冲突
5. **前端无统一拦截器**：RTK Query 无 envelope 剥离，每个组件硬编码嵌套深度，12 处不一致

**影响范围**：后端 78 处 `new Result()` 调用 + 4 处裸返回；前端 12 处数据访问不一致。

## 决策

**废弃 `Result` 类，Service 直接返回业务数据，由 `TransformInterceptor` 统一包装。**

选择理由：
- 从根源消除双重嵌套 — Service 不需要关心响应格式
- Service 层最简洁 — 不用记 `new Result()` 的多种用法
- 配合前端拦截器，实现一次性全量修复

## 统一 Wire Format

所有接口最终输出遵循同一格式：

```json
{
  "success": true | false,
  "code": 200,
  "message": "success",
  "data": <业务数据或null>,
  "extra": { "path": "/v1/..." }
}
```

字段说明：
- `success` — 布尔值，区分成功/失败
- `code` — 成功时 200，业务异常时为自定义错误码，HTTP 异常时为 HTTP 状态码
- `message` — 成功时默认 `"success"`，可自定义；失败时为错误描述
- `data` — 业务数据，失败时为 `null`
- `extra` — 附加信息（路径、时间戳等）

### 成功示例

```json
// 单个实体
{ "success": true, "code": 200, "message": "success", "data": { "id": "NO.123", "name": "..." }, "extra": { "path": "/v1/brand/1" } }

// 分页列表（items 代替原来的 data）
{ "success": true, "code": 200, "message": "success", "data": { "items": [...], "total": 42 }, "extra": { "path": "/v1/brand/list" } }

// 无返回值操作
{ "success": true, "code": 200, "message": "success", "data": null, "extra": { "path": "/v1/brand/1" } }

// 自定义 message
{ "success": true, "code": 200, "message": "登录成功", "data": { "access_token": "..." }, "extra": { "path": "/v1/auth/login" } }
```

### 错误示例

```json
// 业务异常 (HTTP 200)
{ "success": false, "code": 40001, "message": "库存不足", "data": null, "extra": { "path": "/v1/seckill/order", "timestamp": "..." } }

// HTTP 异常
{ "success": false, "code": 404, "message": "Not Found", "data": null, "extra": { "path": "/v1/xxx", "timestamp": "..." } }

// 服务不可用
{ "success": false, "code": 503, "message": "Service Unavailable", "data": null, "extra": { "path": "/v1/xxx", "timestamp": "..." } }
```

## 后端改造

### 1. Service 层返回约定

Service 方法直接返回业务数据，不再包装 `Result`：

```typescript
// 单个实体 — 直接返回
async findById(id: number) {
  return this.prisma.ibuyBrand.findUnique({ where: { id } });
}

// 分页列表 — 返回 { items, total }
async findList(pageParam: any) {
  const skip = pageParam.pageSize * (pageParam.current - 1);
  const take = pageParam.pageSize;
  const [items, total] = await Promise.all([
    this.prisma.ibuyBrand.findMany({ skip, take }),
    this.prisma.ibuyBrand.count(),
  ]);
  return { items, total };
}

// 删除 — 返回 void
async remove(id: number): Promise<void> {
  await this.prisma.ibuyBrand.delete({ where: { id } });
}

// 自定义 message — 使用 ResponseMessage
async signIn(...) {
  return new ResponseMessage({ access_token }, '登录成功');
}

// 错误 — 抛 BusinessException（不变）
async placeOrder(...) {
  if (stock <= 0) throw new BusinessException('已售罄');
}
```

### 2. ResponseMessage 类

仅在需要自定义 message 时使用，放在 `src/common/utils/ResponseMessage.ts`：

```typescript
export class ResponseMessage<T> {
  constructor(
    public readonly data: T,
    public readonly message: string,
  ) {}
}
```

### 3. TransformInterceptor 改造

```typescript
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const path = context.switchToHttp().getRequest().url;

    return next.handle().pipe(
      map((result) => {
        if (result instanceof ResponseMessage) {
          return {
            success: true,
            code: 200,
            message: result.message,
            data: result.data ?? null,
            extra: { path },
          };
        }

        return {
          success: true,
          code: 200,
          message: 'success',
          data: result ?? null,
          extra: { path },
        };
      }),
    );
  }
}
```

### 4. Exception Filter 统一

三个 Filter 输出统一字段名：

| Filter | HTTP 状态码 | `code` 字段值 | 变化 |
|--------|------------|--------------|------|
| BusinessExceptionFilter | 200 | 业务错误码 | `status` → `code` |
| HttpExceptionFilter | 原始状态码 | HTTP 状态码 | 增加 `data: null` |
| AllExceptionsFilter | 503 | 503 | `statusCode` → `code`，增加 `success`/`data`/`extra` |

### 5. 废弃 Result 类

删除 `src/common/utils/Result.ts`，全局移除所有 `import Result` 和 `new Result(...)` 调用。

### 6. 分页字段重命名

所有分页返回中 `data` 字段重命名为 `items`：

```typescript
// 之前: return new Result({ data, total })
// 之后: return { items, total }
```

涉及 14 处分页方法（brand、sku、spu、spec、para、template、category、category-brand、address、order、order-items、seckill-activity、seckill-order 的 findList/findAll/findByUser）。

购物车的 `cart.service.ts` `list` 方法同样改为：
```typescript
return { items: cartItems, totalPrice, totalItems, totalDiscount };
```

### 7. 修复反模式

| 文件 | 问题 | 修复 |
|------|------|------|
| `order.service.ts` L94,162,240 | `new Result(null, errMsg)` 用成功响应包错误 | 改为 `throw new BusinessException(errMsg)` |
| `order.service.ts` L65-66 | `findById` 返回裸 Prisma 对象 | 无需改（废弃 Result 后这是正确写法） |
| `order.service.ts` L69-72 | `update` 返回裸 Prisma 对象 | 无需改 |
| `member.service.ts` L20 | `findList` 返回 `[data, total]` 元组 | 改为 `return { items, total }` |
| `auth.controller.ts` L55 | Controller 直接 `new Result(null, '退出登录成功')` | 改为 `return new ResponseMessage(null, '退出登录成功')` |

## 前端改造

### 1. RTK Query 响应拦截器

在 `baseQueryWithIntercept` 中统一处理：

```javascript
const baseQueryWithIntercept = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    const status = result.error.status;
    if (status === 401) { /* refresh token 逻辑保持不变 */ }

    return {
      error: {
        status,
        message: result.error.data?.message || 'Unknown error',
        code: result.error.data?.code,
      },
    };
  }

  const body = result.data;

  // 后端业务异常 (HTTP 200 + success: false)
  if (body?.success === false) {
    return {
      error: {
        status: body.code,
        message: body.message,
      },
    };
  }

  // 剥离 envelope，只返回 data 部分
  return { data: body?.data };
};
```

### 2. 组件数据访问批量替换

| 模式 | 之前 | 之后 |
|------|------|------|
| 分页列表 | `data?.data?.data` 或 `data?.data` | `data?.items` |
| 分页总数 | `data?.data?.total` | `data?.total` |
| 单个实体 | `data?.data` | `data` (直接就是实体) |
| 登录 token | `data.data.access_token` | `data?.access_token` |
| 搜索结果 | `data?.data.data` (三层) | `data` (直接就是 `{ rows, total, ... }`) |
| 支付宝 URL | `data?.data?.data?.alipayUrl` | `data?.alipayUrl` |
| 错误消息 | `error?.data?.message` 或 `error?.data?.err` | `error?.message` |
| 成功消息 | `data?.message` | 由拦截器提取或不需要 |
| providesTags | `result?.data.map(...)` | `result?.map(...)` (拦截器已剥离) |
| 购物车 items | `payload.data` (Redux) | `payload.items` |

### 3. 修复已知 bug

| 文件 | 问题 | 修复 |
|------|------|------|
| `ShowWrapper.jsx:23` / `DropList.jsx:44` | `error?.data?.err` 永远为空 | 改为 `error?.message` |
| `OrderCard.jsx:37` | 传 raw error 对象给 HandleResponse | 改为传 `error?.message` |
| `OrderCard.jsx:37` | `data?.msg` 字段名错误 | 删除或改为从 toast 处理 |
| `Orders.jsx:23-24` | 读 `.orders` 但后端返回 `.data` | 改为 `.items` |
| `orders/page.jsx:81` | 分页组件 TODO 生产报错 | 用正确的 `data?.pagination` 路径修复 |

## 测试策略

- **TransformInterceptor 单元测试**：验证 raw 数据包装、ResponseMessage 识别、undefined/null 处理
- **Exception Filter 单元测试**：验证三种 Filter 输出格式一致
- **现有 Service 测试**：移除 Result 相关断言，改为直接断言返回值
- **前端**：手动验证关键流程（登录、列表、搜索、下单、支付）

## 迁移策略

后端先改（不影响现有前端，因为 Interceptor 仍然产出相同的外层结构），然后前端跟进。

具体顺序：
1. 创建 `ResponseMessage` 类
2. 改造 `TransformInterceptor`
3. 统一三个 `Exception Filter`
4. 逐模块移除 `Result`，Service 直接返回数据
5. 修复反模式（order.service 的错误处理等）
6. 删除 `Result.ts`
7. 更新所有 Service 单元测试
8. 前端加响应拦截器
9. 前端批量替换数据访问
10. 前端修复已知 bug
