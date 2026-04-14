# API 响应格式统一化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 废弃 `Result` 类，由 `TransformInterceptor` 统一包装响应，消除前后端双重嵌套问题，统一错误格式。

**Architecture:** 后端 Service 直接返回业务数据，`TransformInterceptor` 包装为 `{ success, code, message, data, extra }`；需要自定义 message 时用 `ResponseMessage` 类；三个 Exception Filter 统一字段名为 `code`。前端 RTK Query 加响应拦截器剥离 envelope，组件层去掉所有 `.data.data` 嵌套。

**Tech Stack:** NestJS 10, TypeScript, Prisma 7, RTK Query (React), Jest

**Spec:** `docs/superpowers/specs/2026-04-11-unified-api-response-design.md`

---

## Task 1: 创建 ResponseMessage 类

**Files:**
- Create: `src/common/utils/ResponseMessage.ts`

- [ ] **Step 1: 创建 ResponseMessage 类**

```typescript
// src/common/utils/ResponseMessage.ts
export class ResponseMessage<T> {
  constructor(
    public readonly data: T,
    public readonly message: string,
  ) {}
}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/common/utils/ResponseMessage.ts
git commit -m "feat: add ResponseMessage class for custom response messages"
```

---

## Task 2: 改造 TransformInterceptor

**Files:**
- Modify: `src/common/interceptors/transform.interceptor.ts`
- Create: `src/common/interceptors/transform.interceptor.spec.ts`

- [ ] **Step 1: 编写 TransformInterceptor 单元测试**

```typescript
// src/common/interceptors/transform.interceptor.spec.ts
import { TransformInterceptor } from './transform.interceptor';
import { ResponseMessage } from '../utils/ResponseMessage';
import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/v1/test' }),
      }),
    } as any;
  });

  it('should wrap raw data in standard envelope', (done) => {
    mockCallHandler = { handle: () => of({ id: 1, name: 'test' }) };
    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        code: 200,
        message: 'success',
        data: { id: 1, name: 'test' },
        extra: { path: '/v1/test' },
      });
      done();
    });
  });

  it('should extract message from ResponseMessage', (done) => {
    const msg = new ResponseMessage({ token: 'abc' }, '登录成功');
    mockCallHandler = { handle: () => of(msg) };
    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        code: 200,
        message: '登录成功',
        data: { token: 'abc' },
        extra: { path: '/v1/test' },
      });
      done();
    });
  });

  it('should wrap null/undefined as data: null', (done) => {
    mockCallHandler = { handle: () => of(undefined) };
    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toBeNull();
      expect(result.success).toBe(true);
      done();
    });
  });

  it('should wrap array data directly', (done) => {
    mockCallHandler = { handle: () => of([1, 2, 3]) };
    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toEqual([1, 2, 3]);
      done();
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx jest src/common/interceptors/transform.interceptor.spec.ts --verbose`
Expected: 测试失败（现有 interceptor 逻辑不匹配新断言）

- [ ] **Step 3: 重写 TransformInterceptor**

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseMessage } from '../utils/ResponseMessage';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const path = request?.url ?? '';

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

- [ ] **Step 4: 运行测试确认通过**

Run: `npx jest src/common/interceptors/transform.interceptor.spec.ts --verbose`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/common/interceptors/transform.interceptor.ts src/common/interceptors/transform.interceptor.spec.ts
git commit -m "refactor: rewrite TransformInterceptor to wrap raw data instead of unwrapping Result"
```

---

## Task 3: 统一 Exception Filters

**Files:**
- Modify: `src/common/filters/http.excepition.filter.ts`
- Modify: `src/common/filters/base.exception.filter.ts`

- [ ] **Step 1: 重写 HttpExceptionFilter — 统一字段名为 `code`**

读取 `src/common/filters/http.excepition.filter.ts`，将 BusinessException 分支的 `status` 改为 `code`，将 HTTP 异常分支的 `status` 改为 `code`，并增加 `data: null` 字段。

修改后两个分支的输出格式均为：
```typescript
{
  data: null,
  code: <errorCode>,
  extra: { path, timestamp },
  message: <errorMessage>,
  success: false,
}
```

- [ ] **Step 2: 重写 AllExceptionsFilter — 统一格式**

读取 `src/common/filters/base.exception.filter.ts`，将 `{ statusCode, timestamp, path, message }` 改为：
```typescript
{
  success: false,
  code: 503,
  message: 'Service Unavailable',
  data: null,
  extra: { path, timestamp },
}
```

- [ ] **Step 3: 运行 build 验证编译**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add src/common/filters/http.excepition.filter.ts src/common/filters/base.exception.filter.ts
git commit -m "refactor: unify exception filter response format — use 'code' field consistently"
```

---

## Task 4: 移除 mall-service-goods 模块的 Result 用法

**Files:**
- Modify: `src/mall-service/mall-service-goods/brand/brand.service.ts` — 移除 6 处 `new Result`
- Modify: `src/mall-service/mall-service-goods/sku/sku.service.ts` — 移除 6 处
- Modify: `src/mall-service/mall-service-goods/spu/spu.service.ts` — 移除 2 处
- Modify: `src/mall-service/mall-service-goods/spec/spec.service.ts` — 移除 5 处
- Modify: `src/mall-service/mall-service-goods/para/para.service.ts` — 移除 5 处
- Modify: `src/mall-service/mall-service-goods/template/template.service.ts` — 移除 5 处
- Modify: `src/mall-service/mall-service-goods/category/category.service.ts` — 移除 6 处
- Modify: `src/mall-service/mall-service-goods/category-brand/category-brand.service.ts` — 移除 5 处

- [ ] **Step 1: 批量改造 goods 模块**

每个文件的改造模式相同：
1. 删除 `import Result from '../../../common/utils/Result'`
2. 删除所有返回类型注解中的 `Result<...>` → 直接用具体类型或 `any`
3. 分页方法：`return new Result({ data, total })` → `return { items: data, total }`（变量名 `data` 改为 `items`，或保留 `data` 但字段名用 `items`）
4. 单实体方法：`return new Result(data)` → `return data`
5. 删除方法：`return new Result(null)` → 不返回（void）

示例 — `brand.service.ts`：
```typescript
// 之前
async findList(pageParma: any) {
  const [data, total] = await Promise.all([...]);
  return new Result({ data, total });
}
async findById(id: number) {
  const data = await this.prisma.ibuyBrand.findUnique({ where: { id } });
  return new Result(data);
}
async remove(id: number) {
  await this.prisma.ibuyBrand.delete({ where: { id } });
  return new Result(null);
}

// 之后
async findList(pageParma: any) {
  const [items, total] = await Promise.all([...]);
  return { items, total };
}
async findById(id: number) {
  return this.prisma.ibuyBrand.findUnique({ where: { id } });
}
async remove(id: number): Promise<void> {
  await this.prisma.ibuyBrand.delete({ where: { id } });
}
```

对 8 个文件重复上述模式。

- [ ] **Step 2: 运行 build 确认编译通过**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add src/mall-service/mall-service-goods/
git commit -m "refactor(goods): remove Result wrapper from all goods services — return raw data"
```

---

## Task 5: 移除 mall-service-system 模块的 Result 用法

**Files:**
- Modify: `src/mall-service/mall-service-system/address/address.service.ts` — 移除 6 处
- Modify: `src/mall-service/mall-service-system/member/member.service.ts` — 移除 4 处 + 修复 `findList` 元组返回
- Modify: `src/mall-service/mall-service-system/auth/auth.service.ts` — 移除 4 处 `new Result` + 修复 3 处 `.data` 消费
- Modify: `src/mall-service/mall-service-system/auth/auth.controller.ts` — 移除 1 处 `new Result`

- [ ] **Step 1: 改造 address.service.ts**

同 Task 4 模式。分页用 `{ items, total }`，单实体直接返回，删除返回 void。

- [ ] **Step 2: 改造 member.service.ts**

- 移除 `import Result`
- `findOne` / `findOneById` / `create`：`return new Result(data)` → `return data`
- `remove`：`return new Result(null)` → void
- `findList`（目前返回 `[data, total]` 元组）：改为 `return { items: data, total }`

- [ ] **Step 3: 改造 auth.service.ts — 关键文件**

此文件既产出 Result，也消费其他 Service 的 Result.data。当其他 Service 不再返回 Result 后，`.data` 提取变成直接使用：

```typescript
// 之前
const result = await this.usersService.findOne(loginName);
const user = result.data;
return new Result(data, '登录成功');

// 之后
const user = await this.usersService.findOne(loginName);
return new ResponseMessage(data, '登录成功');
```

具体改动：
- `import Result` → `import { ResponseMessage } from '../../../common/utils/ResponseMessage'`
- L82-83: `result.data` → 直接用返回值
- L126: `new Result(data, '登录成功')` → `new ResponseMessage(data, '登录成功')`
- L143: `{ data: user }` 解构 → 直接赋值
- L174: `new Result({ access_token }, 'Token刷新成功')` → `new ResponseMessage({ access_token }, 'Token刷新成功')`
- L193-194: `result.data` → 直接用返回值
- L198-212: `new Result({...})` → 直接返回对象

- [ ] **Step 4: 改造 auth.controller.ts**

```typescript
// 之前
import Result from 'src/common/utils/Result';
return new Result(null, '退出登录成功');

// 之后
import { ResponseMessage } from 'src/common/utils/ResponseMessage';
return new ResponseMessage(null, '退出登录成功');
```

- [ ] **Step 5: 运行 build 确认编译通过**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 6: Commit**

```bash
git add src/mall-service/mall-service-system/
git commit -m "refactor(system): remove Result from auth/member/address — use ResponseMessage for custom messages"
```

---

## Task 6: 移除 mall-service-order 模块的 Result 用法

**Files:**
- Modify: `src/mall-service/mall-service-order/order/order.service.ts` — 移除 6 处 `new Result` + 修复 6 处 `.data` 消费 + 修复错误反模式
- Modify: `src/mall-service/mall-service-order/order-items/order-items.service.ts` — 移除 6 处
- Modify: `src/mall-service/mall-service-order/cart/cart.service.ts` — 移除 4 处 + 修复 2 处 `.data` 消费

- [ ] **Step 1: 改造 order-items.service.ts**

同 Task 4 模式。分页 `{ items, total }`，单实体直接返回。

- [ ] **Step 2: 改造 cart.service.ts**

- 移除 `import Result`
- `add` 方法中的 `return new Result(null)` → void；`return new Result(null, '购物车添加成功')` → `return new ResponseMessage(null, '购物车添加成功')`
- `list` 方法：`return new Result({ data, totalPrice, totalItems, totalDiscount })` → `return { items: data, totalPrice, totalItems, totalDiscount }`
- L87: `skuResult.data` → `skuResult`（SkuService 现在直接返回数据）
- L93: `spuResult.data` → `spuResult`

- [ ] **Step 3: 改造 order.service.ts — 最复杂的文件**

改动要点：
1. 移除 `import Result`，添加 `import { ResponseMessage }`（如需要）和 `import { BusinessException }`
2. 分页：`return new Result({ data, total })` → `return { items: data, total }`
3. 消费端修复（其他 Service 不再返回 Result）：
   - L91: `skuResult.data` → `skuResult`
   - L100: `spuResult.data` → `spuResult`
   - L175: `orderItemsResult.data.data` → `orderItemsResult.items`（CartService.list 现在返回 `{ items, ... }`）
   - L267: `result.data` → `result`
   - L272-273: `skuResult.data` → `skuResult`
4. **修复错误反模式**：
   - L94: `return new Result(null, '商品不存在')` → `throw new BusinessException('商品不存在')`
   - L162: `return new Result(null, err)` → `throw new BusinessException(err.message || '下单失败')`
   - L240: `return new Result(null, err)` → `throw new BusinessException(err.message || '下单失败')`

- [ ] **Step 4: 运行 build**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 5: Commit**

```bash
git add src/mall-service/mall-service-order/
git commit -m "refactor(order): remove Result, fix error anti-patterns — throw BusinessException instead"
```

---

## Task 7: 移除 file/search/alipay 模块的 Result 用法

**Files:**
- Modify: `src/mall-service/mall-service-file/file.service.ts` — 移除 5 处 + 修复 1 处内部 `.data` 消费
- Modify: `src/mall-service/mall-service-search/search.service.ts` — 移除 1 处
- Modify: `src/mall-service/alipay/alipay.service.ts` — 移除 3 处 + 修复 1 处 `.data` 消费

- [ ] **Step 1: 改造 file.service.ts**

- `uploadFile`: `return new Result({ bucketName, path, objectName })` → `return { bucketName, path, objectName }`
- `downloadFile`: `return new Result(null, '下载成功')` → `return new ResponseMessage(null, '下载成功')`
- `deleteFile`: `return new Result(null, '删除成功')` → `return new ResponseMessage(null, '删除成功')`
- `getDirectoryStructure`: `return new Result({ data })` → `return { items: data }`
- `listObjects` (private): `return new Result(data)` → `return data`
- L72: `result.data.forEach` → `result.forEach`（listObjects 现在返回裸数组）

- [ ] **Step 2: 改造 search.service.ts**

- `return new Result({ data: Object.fromEntries(resultMap) })` → `return Object.fromEntries(resultMap)`

- [ ] **Step 3: 改造 alipay.service.ts**

- `goAlipay`: `return new Result({ alipayUrl })` → `return { alipayUrl }`
- `tradeQuery`: `return new Result(data, '支付成功')` → `return new ResponseMessage(data, '支付成功')`
- `tradeClose`: `return new Result(null, msg)` → `return new ResponseMessage(null, msg)`
- L50: `result.data` → `result`（OrderItemsService 不再返回 Result）

- [ ] **Step 4: 运行 build**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 5: Commit**

```bash
git add src/mall-service/mall-service-file/ src/mall-service/mall-service-search/ src/mall-service/alipay/
git commit -m "refactor(file,search,alipay): remove Result wrapper — return raw data"
```

---

## Task 8: 移除 mall-service-seckill 模块的 Result 用法

**Files:**
- Modify: `src/mall-service/mall-service-seckill/seckill-activity/seckill-activity.service.ts` — 移除 8 处
- Modify: `src/mall-service/mall-service-seckill/seckill-goods/seckill-goods.service.ts` — 移除 3 处
- Modify: `src/mall-service/mall-service-seckill/seckill-order/seckill-order.service.ts` — 移除 3 处

- [ ] **Step 1: 改造 seckill-activity.service.ts**

- 移除 `import Result`
- `create/update/audit/publish/unpublish/findById`: `return new Result(x)` → `return x`
- `findAll`: `return new Result({ data, total })` → `return { items: data, total }`
- `findActive`: `return new Result(activities)` → `return activities`

- [ ] **Step 2: 改造 seckill-goods.service.ts**

- `add`: `return new Result(goods)` → `return goods`
- `remove`: `return new Result(null)` → void
- `findByActivityId`: `return new Result(data)` → `return data`

- [ ] **Step 3: 改造 seckill-order.service.ts**

- `placeOrder`: `return new Result({ orderId, status: 'queued' })` → `return { orderId, status: 'queued' }`
- `findById`: `return new Result(order)` → `return order`
- `findByUser`: `return new Result({ data, total })` → `return { items: data, total }`

- [ ] **Step 4: 运行 build**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 5: Commit**

```bash
git add src/mall-service/mall-service-seckill/
git commit -m "refactor(seckill): remove Result wrapper from all seckill services"
```

---

## Task 9: 删除 Result.ts + 更新单元测试

**Files:**
- Delete: `src/common/utils/Result.ts`
- Modify: `src/mall-service/mall-service-seckill/seckill-activity/seckill-activity.service.spec.ts`
- Modify: `src/mall-service/mall-service-seckill/seckill-goods/seckill-goods.service.spec.ts`
- Modify: `src/mall-service/mall-service-seckill/seckill-order/seckill-order.service.spec.ts`

- [ ] **Step 1: 删除 Result.ts**

```bash
rm src/common/utils/Result.ts
```

- [ ] **Step 2: 全局搜索确认无残留引用**

Run: `grep -r "from.*Result" src/ --include="*.ts" | grep -v node_modules | grep -v ".spec.ts"`
Expected: 零结果（所有 import 已在前面 task 中移除）

- [ ] **Step 3: 更新 seckill-activity.service.spec.ts**

- 删除 `import Result from '../../../common/utils/Result'`
- 所有 `expect(result).toBeInstanceOf(Result)` → 删除或改为 `expect(result).toBeDefined()`
- `expect(result.data).toEqual(...)` → `expect(result).toEqual(...)` （Service 现在直接返回数据，不再包 Result）
- 分页断言：`expect(result.data).toEqual({ data: [...], total })` → `expect(result).toEqual({ items: [...], total })`

- [ ] **Step 4: 更新 seckill-goods.service.spec.ts**

同上模式：移除 Result import，修改所有 `result.data` → `result` 的断言。

- [ ] **Step 5: 更新 seckill-order.service.spec.ts**

同上模式。

- [ ] **Step 6: 运行全量测试**

Run: `npx jest --verbose`
Expected: 全部通过

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: delete Result.ts and update all test assertions to match raw data returns"
```

---

## Task 10: 前端 — RTK Query 响应拦截器

**Files:**
- Modify: `../ibuy-portal/store/services/api.js`

- [ ] **Step 1: 改造 baseQueryWithIntercept**

读取 `../ibuy-portal/store/services/api.js` 的完整内容，然后修改 `baseQueryWithIntercept` 函数：

```javascript
const baseQueryWithIntercept = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // 网络/超时错误
  if (result.error) {
    const { status } = result.error;

    // 401 刷新 token（保持现有逻辑）
    if (status === 401) {
      const refreshResult = await baseQuery(
        { url: '/auth/refresh', method: 'POST' },
        api,
        extraOptions,
      );
      if (refreshResult.data?.data?.access_token) {
        api.dispatch(userLogin(refreshResult.data.data.access_token));
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(userLogout());
        return result;
      }
    }

    // 统一错误格式
    if (result.error) {
      return {
        error: {
          status: result.error.status,
          message: result.error.data?.message || 'Unknown error',
          code: result.error.data?.code,
        },
      };
    }
  }

  // 成功响应：剥离 envelope
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

  // 只返回 data 部分
  return { data: body?.data };
};
```

**注意**：refresh token 部分可能需要在后续 commit 中再适配（因为 refresh 接口也会被新 interceptor 改造影响），先保持 `refreshResult.data.data` 兼容现有格式，等后端部署后再简化为 `refreshResult.data`。

- [ ] **Step 2: Commit**

```bash
cd ../ibuy-portal
git add store/services/api.js
git commit -m "feat: add response envelope stripping in RTK Query baseQuery interceptor"
```

---

## Task 11: 前端 — 批量替换数据访问

**Files:**（所有在 `../ibuy-portal/` 下）
- Modify: `components/Search.jsx` L29
- Modify: `components/sliders/BestSellsSlider.jsx` L14
- Modify: `components/Navbar.jsx` L14
- Modify: `components/order/OrderCard.jsx` L30
- Modify: `components/order/Orders.jsx` L23-24
- Modify: `components/address/AddressSelector.jsx` L48
- Modify: `hooks/useUserInfo.js` L16
- Modify: `hooks/useCartList.js` L16-21
- Modify: `store/slices/cart.slice.js` L14-19
- Modify: `app/(main)/(client-layout)/products/item/page.jsx` L23,34-35
- Modify: `app/(main)/(client-layout)/products/page.jsx` L43
- Modify: `app/(main)/(client-layout)/search/page.jsx` L28
- Modify: `app/(main)/(client-layout)/checkout/shipping/page.jsx` L112,121
- Modify: `app/(main)/(client-layout)/checkout/payment/page.jsx` L30,164,167,169
- Modify: `app/(main)/profile/orders/page.jsx` L37-38,82
- Modify: `app/(main)/profile/addresses/page.jsx` L46

- [ ] **Step 1: 替换所有 `data?.data` → 直接访问**

按文件逐一替换。拦截器已剥离外层 envelope，所以 `data` 现在直接就是 `body.data`（业务数据本身）。

模式映射：
```
data?.data?.data   → data          (搜索、订单列表)
data?.data         → data          (单实体、列表)
data?.data?.xxx    → data?.xxx     (嵌套字段)
```

具体改动（关键文件）：

- `Search.jsx:29`: `data?.data?.data ?? {}` → `data ?? {}`
- `products/page.jsx:43`: `data?.data.data ?? []` → `data ?? []`
- `search/page.jsx:28`: `data?.data.data ?? []` → `data ?? []`
- `orders/page.jsx:37`: `data?.data?.data || []` → `data?.items || []`
- `orders/page.jsx:38`: `data?.data?.total || 0` → `data?.total || 0`
- `orders/page.jsx:82`: `data?.data?.pagination` → `data?.pagination`
- `shipping/page.jsx:112`: `orderResult?.data?.data?.id` → `orderResult?.data?.id`
- `shipping/page.jsx:121`: `alipayData?.data?.data?.alipayUrl` → `alipayData?.data?.alipayUrl`
- `payment/page.jsx:30`: `response?.data?.data?.tradeStatus` → `response?.data?.tradeStatus`
- `payment/page.jsx:164-169`: `data?.data?.xxx` → `data?.xxx`
- `BestSellsSlider.jsx:14`: `data?.data` → `data`
- `Navbar.jsx:14`: `data?.data` → `data`
- `useUserInfo.js:16`: `data?.data` → `data`
- `products/item/page.jsx:23`: `data?.data ?? {}` → `data ?? {}`
- `products/item/page.jsx:34-35`: `data?.data` → `data`
- `addresses/page.jsx:46`: `data?.data` → `data`
- `OrderCard.jsx:30`: `data?.data || []` → `data || []`
- `Orders.jsx:23-24`: `data?.data?.orders` → `data?.items`（后端改为 `items` 字段）
- `AddressSelector.jsx:48`: `data?.data` → `data`

- [ ] **Step 2: 更新购物车相关**

`hooks/useCartList.js`:
```javascript
// 之前
if (isSuccess && data?.data) {
  dispatch(setCartData(data.data))
}
return { cartData: data?.data, ... }

// 之后（拦截器已剥离 envelope，data 直接就是 { items, totalPrice, ... }）
if (isSuccess && data) {
  dispatch(setCartData(data))
}
return { cartData: data, ... }
```

`store/slices/cart.slice.js`:
```javascript
// 之前
state.cartItems = action.payload.data

// 之后
state.cartItems = action.payload.items
```

- [ ] **Step 3: Commit**

```bash
cd ../ibuy-portal
git add -A
git commit -m "refactor: remove all data.data double-nesting — interceptor now strips envelope"
```

---

## Task 12: 前端 — 修复错误消息 + providesTags

**Files:**（所有在 `../ibuy-portal/` 下）
- Modify: `app/(main)/(empty-layout)/login/page.jsx` L37
- Modify: `app/(main)/(empty-layout)/register/page.jsx` L73,82
- Modify: `app/(main)/(client-layout)/checkout/shipping/page.jsx` L141
- Modify: `components/modals/UserNameModal.jsx` L40
- Modify: `components/modals/UserMobileModal.jsx` L42
- Modify: `components/modals/AddressModal.jsx` L159
- Modify: `components/common/DropList.jsx` L44
- Modify: `components/common/ShowWrapper.jsx` L23
- Modify: `components/order/OrderCard.jsx` L37
- Modify: `store/services/product.service.js` L27-37,50-60,82-92
- Modify: `store/services/category.service.js` L10-19
- Modify: `store/services/banner.service.js` L10-19

- [ ] **Step 1: 统一错误消息访问**

```
error?.data?.message → error?.message
error?.data?.err    → error?.message
```

逐文件替换。

- [ ] **Step 2: 修复 OrderCard.jsx**

```javascript
// 之前
<HandleResponse ... error={error} message={data?.msg} />

// 之后
<HandleResponse ... error={error?.message} message={data?.message} />
```

注意：`HandleResponse` 可能需要适配新格式（接收 string 而非 object）。

- [ ] **Step 3: 修复 providesTags**

拦截器剥离了 envelope，所以 `result` 现在直接就是 `data`（业务数据），不再需要 `.data`：

```javascript
// 之前
providesTags: (result) =>
  result ? [...result.data.map(({id}) => ({ type: 'Product', id }))] : ['Product']

// 之后
providesTags: (result) =>
  result ? [...result.map(({id}) => ({ type: 'Product', id }))] : ['Product']
```

对 `product.service.js`、`category.service.js`、`banner.service.js` 中所有 `providesTags` 回调做同样修改。

`banner.service.js` 额外修复：`_id` → 确认后端 banner 模型的 ID 字段名。

- [ ] **Step 4: Commit**

```bash
cd ../ibuy-portal
git add -A
git commit -m "fix: unify error message access pattern and fix providesTags after envelope stripping"
```

---

## Task 13: 后端 — 运行全量验证

**Files:** 无新改动

- [ ] **Step 1: 运行全部测试**

Run: `pnpm test`
Expected: 全部通过

- [ ] **Step 2: 运行 lint**

Run: `pnpm lint`
Expected: 0 errors

- [ ] **Step 3: 验证 build**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 4: 全局搜索确认无 Result 残留**

Run: `grep -r "Result" src/ --include="*.ts" | grep -v node_modules | grep -v ResponseMessage | grep -v ".spec.ts"`
Expected: 零结果（或仅有不相关的 "Result" 字符串出现在注释中）

- [ ] **Step 5: Commit（如有修复）**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, no Result remnants"
```
