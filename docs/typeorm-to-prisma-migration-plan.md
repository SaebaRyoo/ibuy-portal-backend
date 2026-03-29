# TypeORM → Prisma Migration Plan

**Project:** ibuy-portal-backend
**Target:** NestJS backend using `@nestjs/typeorm` v10 / `typeorm` v0.3 → `prisma` + `@prisma/client`
**Database:** PostgreSQL (`mall`)
**Date:** 2026-03-29

---

## Context

The current backend uses TypeORM (`@nestjs/typeorm: ^10.0.2`, `typeorm: ^0.3.20`) for all database operations. TypeORM was chosen for its NestJS-native integration, but over time it has accumulated several issues identified in the code review:

- **Deprecated sync JWT APIs** (`jwtService.sign()` vs `signAsync()`) mixed with async calls
- **`synchronize: true`** in production — risks data loss
- **No entity relations** defined — all joins are manual SQL or QueryBuilder
- **Inconsistent query patterns** — raw SQL, QueryBuilder, and repository methods mixed
- **Poor TypeScript inference** — widespread `any` types throughout
- **TypeORM's long-term trajectory** — the ecosystem is increasingly moving toward Prisma

Prisma provides a type-safe query layer, auto-generated TypeScript types, a superior migration system, and better IDE support. This migration is incremental — both ORMs coexist during the transition, one module at a time.

---

## Scope

### In Scope

- All 12 TypeORM entity files and their corresponding service/controller/module layers
- All raw SQL queries (`dataSource.query()`, `manager.query()`)
- All QueryRunner-based transactions
- The TypeORM `forRootAsync` configuration in `app.module.ts`
- Dependency updates in `package.json`

### Out of Scope

- Elasticsearch module (`mall-service-search`) — no TypeORM
- Alipay module — no TypeORM
- File upload module — no TypeORM
- Cart service — pure Redis, no TypeORM
- Frontend code changes

### 17 Tables to Migrate

```
ibuy_member          ibuy_brand           ibuy_category       ibuy_category_brand
ibuy_template        ibuy_spec            ibuy_para           ibuy_spu
ibuy_sku            ibuy_order           ibuy_order_item     ibuy_address
ibuy_provinces       ibuy_cities          ibuy_areas          ibuy_album
```

---

## Phase 0: Prerequisites

### 0.1 Install Prisma Packages

```bash
npm install @prisma/client
npm install --save-dev prisma
```

### 0.2 Initialize Prisma

```bash
npx prisma init
```

This creates `prisma/schema.prisma`.

### 0.3 Generate Schema via Database Introspection

```bash
npx prisma db pull --schema=prisma/schema.prisma
```

This introspects the existing PostgreSQL database and generates all models. Review and clean up the generated schema.

### 0.4 Generate Prisma Client

```bash
npx prisma generate
```

This generates `node_modules/@prisma/client` (type-safe query builder).

### 0.5 Create the Prisma Module

Create a NestJS module that provides a singleton `PrismaService`:

**File:** `src/common/modules/prisma/prisma.module.ts`
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**File:** `src/common/modules/prisma/prisma.service.ts`
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 0.6 Register PrismaModule in AppModule

```typescript
// app.module.ts — add PrismaModule alongside TypeOrmModule
import { PrismaModule } from './common/modules/prisma/prisma.module';

@Module({
  imports: [
    // ... existing imports
    PrismaModule,  // add here
  ],
  // ...
})
export class AppModule {}
```

### 0.7 Disable TypeORM Synchronize

**Critical:** Before starting migration, set `synchronize: false` in `app.module.ts`:

```typescript
// app.module.ts
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    // ...
    synchronize: false,  // was true — change this immediately
  }),
}),
```

---

## Phase 1: Generate the Prisma Schema

### 1.1 Introspect Existing Database

```bash
cd /Users/zhuqingyuan/Documents/work/ibuy/ibuy-portal-backend
npx prisma db pull
```

### 1.2 Manual Schema Cleanup and Enhancement

After introspection, the schema will contain all 17 tables. Apply these cleanup steps:

1. **Add `@@map()` for snake_case table names** (Prisma uses camelCase by default):
   ```prisma
   model IbuyMember {
     id            Int      @id @default(autoincrement())
     loginName     String   @unique @map("login_name")
     password      String
     phone         String?  @unique
     email         String?  @unique
     // ...
     tokenVersion  Int      @default(0)
     @@map("ibuy_member")
   }
   ```

2. **Define relations** that TypeORM never declared:
   ```prisma
   model IbuyMember {
     id       Int           @id @default(autoincrement())
     addresses IbuyAddress[]
     @@map("ibuy_member")
   }

   model IbuyAddress {
     id       Int      @id @default(autoincrement())
     memberId Int      @map("member_id")
     member   IbuyMember @relation(fields: [memberId], references: [id])
     @@map("ibuy_address")
   }
   ```

3. **Handle JSON columns** (TypeORM used `@Column({ type: 'json' })`):
   ```prisma
   model IbuySku {
     // ...
     spec Json @default("{}")
     @@map("ibuy_sku")
   }
   ```

4. **Handle string PKs** for SPU/SKU/Order tables (snowflake IDs):
   ```prisma
   model IbuySpu {
     id  String @id @map("id")
     // ...
     skus IbuySku[]
     @@map("ibuy_spu")
   }
   ```

5. **Configure the datasource block**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   Set `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/mall` in `.env`.

### 1.3 Verify Schema

```bash
npx prisma validate
npx prisma format
```

### 1.4 Key Schema Design Decisions

| Decision | Rationale |
|---|---|
| Use `@@map` for all table names | Prisma defaults to camelCase; existing DB uses snake_case |
| Use `@db` annotations where needed | Annotate `Int`, `String`, `DateTime` with `@db.Integer`, `@db.VarChar`, etc. for precision |
| Define relations explicitly | Prisma's relation queries are far superior to manual foreign key handling |
| String PKs for snowflake tables | `ibuy_spu`, `ibuy_sku`, `ibuy_order`, `ibuy_order_item` use string IDs |
| Keep enums as `String` | Many fields like `orderStatus` use `'0'`, `'1'` string codes — map to Prisma enums later |

---

## Phase 2: Module-by-Module Migration Order

Migration proceeds from **simplest to most complex**, with co-existence at every step.

### Migration Sequence

```
Stage 1 — Standalone tables, no transactions (easiest):
  1. TemplateModule  (ibuy_template)
  2. SpecModule      (ibuy_spec)
  3. ParaModule      (ibuy_para)
  4. BrandModule     (ibuy_brand, ibuy_category_brand) ← raw SQL here, handled in step
  5. AddressModule    (ibuy_address)

Stage 2 — Tree structure, no transactions:
  6. CategoryModule  (ibuy_category)

Stage 3 — Product hierarchy, no transactions:
  7. SpuModule       (ibuy_spu) ← 4 repos, needs cross-entity queries
  8. SkuModule       (ibuy_sku) ← raw SQL for inventory decrement

Stage 4 — Auth module (user data):
  9. MemberModule    (ibuy_member) ← password hashing, token versioning

Stage 5 — Order flow, complex transactions:
 10. OrderItemsModule (ibuy_order_item)
 11. OrderModule      (ibuy_order) ← QueryRunner transactions

Stage 6 — Cleanup:
 12. Remove TypeORM entirely
```

---

## Phase 3: Per-Module Migration Steps

For each module, follow this pattern:

### Step A: Create Prisma Repository Layer

Create a `*.prisma.repository.ts` file that wraps Prisma client calls behind the same interface the service expects.

**Pattern:** `src/mall-service/{module}/repository/{entity}.prisma.repository.ts`

### Step B: Update Service to Use Prisma Repository

Inject the Prisma repository instead of the TypeORM repository. Keep the service method signatures identical.

### Step C: Update Module Imports

Remove `TypeOrmModule.forFeature([Entity])` and `MemberModule` imports. Add the new Prisma repository provider.

### Step D: Remove Entity Decorators (last)

Only remove the `.entity.ts` file after the module is fully migrated.

---

## Phase 4: Detailed Migration by Module

### 4.1 TemplateModule (ibuy_template) — Simplest

**Current service (`template.service.ts`):**
```typescript
async findList(pageParma: any) {
  const qb = this.templateRepository
    .createQueryBuilder('template')
    .skip(pageParma.pageSize * (pageParma.current - 1))
    .limit(pageParma.pageSize);
  const [data, total] = await qb.getManyAndCount();
  return new Result({ data, total });
}

async findById(id: number) {
  const data = await this.templateRepository.findOneBy({ id });
  return new Result(data);
}

async create(template: TemplateEntity) {
  const data = await this.templateRepository.insert(template);
  return new Result(data);
}

async updateById(id: number, template: TemplateEntity) {
  const data = await this.templateRepository
    .createQueryBuilder()
    .update(TemplateEntity)
    .set(template)
    .where('id = :id', { id })
    .execute();
  return new Result(data);
}

async remove(id: number) {
  await this.templateRepository.delete(id);
  return new Result(null);
}
```

**Prisma migration:**

```typescript
// src/mall-service/mall-service-goods/template/template.prisma.repository.ts
@Injectable()
export class TemplatePrismaRepository {
  constructor(private prisma: PrismaService) {}

  async findList(pageParam: { pageSize: number; current: number }) {
    const skip = pageParam.pageSize * (pageParam.current - 1);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ibuyTemplate.findMany({ skip, take: pageParam.pageSize }),
      this.prisma.ibuyTemplate.count(),
    ]);
    return { data, total };
  }

  async findById(id: number) {
    return this.prisma.ibuyTemplate.findUnique({ where: { id } });
  }

  async create(data: Prisma.IbuyTemplateCreateInput) {
    return this.prisma.ibuyTemplate.create({ data });
  }

  async updateById(id: number, data: Prisma.IbuyTemplateUpdateInput) {
    return this.prisma.ibuyTemplate.update({ where: { id }, data });
  }

  async remove(id: number) {
    return this.prisma.ibuyTemplate.delete({ where: { id } });
  }
}
```

**Module update (`template.module.ts`):**
```typescript
// Remove: TypeOrmModule.forFeature([TemplateEntity])
// Add: TemplatePrismaRepository as provider
```

---

### 4.2 SpecModule & ParaModule

Identical pattern to TemplateModule. Both are simple CRUD with pagination.

**Files to create:**
- `src/mall-service/mall-service-goods/spec/spec.prisma.repository.ts`
- `src/mall-service/mall-service-goods/para/para.prisma.repository.ts`

**Files to delete after migration:**
- `src/mall-service/mall-service-goods/spec/spec.entity.ts`
- `src/mall-service/mall-service-goods/para/para.entity.ts`

---

### 4.3 BrandModule (ibuy_brand + ibuy_category_brand)

**Complexity:** Uses raw SQL for join query.

**Current service (`brand.service.ts`):**
```typescript
async findBrandByCategoryId(categoryId: number) {
  const [data, total] = await this.dataSource.query(
    `SELECT ib.id, name, image FROM ibuy_category_brand icb,
     ibuy_brand ib WHERE icb.category_id='${categoryId}'
     AND ib.id=icb.brand_id`
  );
  return new Result({ data, total });
}
```

**Prisma migration — raw SQL preserved via `$queryRaw`:**
```typescript
// src/mall-service/mall-service-goods/brand/brand.prisma.repository.ts

async findBrandByCategoryId(categoryId: number) {
  const data = await this.prisma.$queryRaw<{ id: number; name: string; image: string }[]>`
    SELECT ib.id, name, image
    FROM ibuy_category_brand icb, ibuy_brand ib
    WHERE icb.category_id = ${categoryId}
    AND ib.id = icb.brand_id
  `;
  return { data, total: data.length };
}
```

> **Note:** Prisma `$queryRaw` with template literal syntax provides full TypeScript type inference while preserving the raw query. This is safer than string concatenation because Prisma parameterizes the interpolated values.

**List pagination migrates normally:**
```typescript
async findList(pageParam: { pageSize: number; current: number }) {
  const skip = pageParam.pageSize * (pageParam.current - 1);
  const [data, total] = await this.prisma.$transaction([
    this.prisma.ibuyBrand.findMany({ skip, take: pageParam.pageSize }),
    this.prisma.ibuyBrand.count(),
  ]);
  return { data, total };
}
```

---

### 4.4 AddressModule (ibuy_address)

Simple CRUD with a relation to `ibuy_member`.

**Prisma relation (schema.prisma):**
```prisma
model IbuyMember {
  id        Int          @id @default(autoincrement())
  addresses IbuyAddress[]
  @@map("ibuy_member")
}

model IbuyAddress {
  id             Int         @id @default(autoincrement())
  username       String?     @map("username")
  phone          String
  address        String
  contact        String
  isDefault      Int         @map("is_default")
  alias          String?
  memberId       Int?        @map("member_id")
  member         IbuyMember? @relation(fields: [memberId], references: [id])
  @@map("ibuy_address")
}
```

**No entity-level changes needed** — the Prisma relation replaces the manual foreign key handling.

---

### 4.5 CategoryModule (ibuy_category) — Self-Referencing

**Complexity:** Self-referencing relation (`parent_id → category.id`).

**Current entity:**
```typescript
@Column({ name: 'parent_id' })
parentId: number;
```

**Prisma schema:**
```prisma
model IbuyCategory {
  id        Int              @id @default(autoincrement())
  name      String
  parentId  Int              @map("parent_id")
  parent    IbuyCategory?    @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children  IbuyCategory[]   @relation("CategoryHierarchy")
  // ...
  @@map("ibuy_category")
}
```

**Query for root categories (parentId = 0):**
```typescript
async findRootCategories() {
  return this.prisma.ibuyCategory.findMany({
    where: { parentId: 0 },
    orderBy: { seq: 'asc' },
  });
}

async findChildren(parentId: number) {
  return this.prisma.ibuyCategory.findMany({
    where: { parentId },
    orderBy: { seq: 'asc' },
  });
}
```

---

### 4.6 SpuModule (ibuy_spu) — Multi-Entity Service

**Complexity:** Injects 4 repositories (`SpuEntity`, `SkuEntity`, `CategoryEntity`, `BrandEntity`).

**Strategy:** Create 4 separate Prisma repositories, inject `PrismaService` (not individual clients).

```typescript
// src/mall-service/mall-service-goods/spu/spu.prisma.repository.ts
@Injectable()
export class SpuPrismaRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.ibuySpu.findUnique({ where: { id } });
  }

  async findList(pageParam: any) {
    const skip = pageParam.pageSize * (pageParam.current - 1);
    return this.prisma.$transaction([
      this.prisma.ibuySpu.findMany({
        skip,
        take: pageParam.pageSize,
        include: { /* relations */ },
      }),
      this.prisma.ibuySpu.count(),
    ]);
  }

  async create(data: Prisma.IbuySpuCreateInput) {
    return this.prisma.ibuySpu.create({ data });
  }

  async update(id: string, data: Prisma.IbuySpuUpdateInput) {
    return this.prisma.ibuySpu.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.ibuySpu.delete({ where: { id } });
  }
}
```

**Key advantage of Prisma:** Multi-entity transactions are handled by `prisma.$transaction([])` — no need for `QueryRunner`.

---

### 4.7 SkuModule (ibuy_sku) — Raw SQL for Inventory

**Complexity:** Raw SQL for atomic inventory decrement (stock safety check).

**Current service (`sku.service.ts`):**
```typescript
async decrCount(username: string, manager?: EntityManager) {
  // ...
  const { affectedRows } = await _manager.query(
    `UPDATE ibuy_sku SET num=num-${num},sale_num=sale_num+${num}
     WHERE id='${skuId}' AND num>=${num}`
  );
  if (affectedRows <= 0) {
    throw new HttpException('库存不足，递减失败！', HttpStatus.BAD_REQUEST);
  }
}
```

**Prisma migration — `$executeRaw` with parameterized queries:**
```typescript
// src/mall-service/mall-service-goods/sku/sku.prisma.repository.ts

async decrCount(
  username: string,
  manager?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>,
) {
  const cartKey = `Cart_${username}`;
  const orderItems = await this.redisService.hvals(cartKey);

  const prisma = manager ?? this.prisma;

  for (const orderItem of orderItems) {
    const parsed = JSON.parse(orderItem);
    const { num, skuId } = parsed;

    // $executeRaw with parameterized UPDATE — safe from SQL injection
    const result = await prisma.$executeRaw`
      UPDATE ibuy_sku
      SET num = num - ${num}, sale_num = sale_num + ${num}
      WHERE id = ${skuId} AND num >= ${num}
    `;

    if (result === 0) {
      throw new HttpException('库存不足，递减失败！', HttpStatus.BAD_REQUEST);
    }
  }
}
```

> **Note:** The `manager` parameter is still supported — Prisma accepts a client-like object in `$executeRaw` as long as it has the same shape. See Section 5.2 for transaction handling.

---

### 4.8 MemberModule (ibuy_member) — Password Hashing + Token Version

**Current service (`member.service.ts`):**
```typescript
async incrementTokenVersion(userId: number): Promise<void> {
  await this.usersRepository
    .createQueryBuilder()
    .update(MemberEntity)
    .set({ tokenVersion: () => 'tokenVersion + 1' })
    .where('id = :id', { id: userId })
    .execute();
}
```

**Prisma migration:**
```typescript
// src/mall-service/mall-service-system/member/member.prisma.repository.ts

async incrementTokenVersion(userId: number): Promise<void> {
  await this.prisma.ibuyMember.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

// Password hashing (bcrypt) — unchanged, still needed
async create(data: IbuyMemberCreateInput) {
  const hashed = await bcrypt.hash(data.password, 12);
  return this.prisma.ibuyMember.create({
    data: { ...data, password: hashed },
  });
}
```

---

### 4.9 OrderItemsModule (ibuy_order_item) — EntityManager Support

**Current service (`order-items.service.ts`):**
```typescript
async add(orderItem: OrderItemsEntity, manager?: EntityManager) {
  let data;
  if (manager) {
    data = manager.insert(OrderItemsEntity, orderItem);
  } else {
    data = await this.orderItemsRepository.insert(orderItem);
  }
  return new Result(data);
}
```

**Prisma migration — use `prisma.$extends` or pass transaction client:**
```typescript
// src/mall-service/mall-service-order/order-items/order-items.prisma.repository.ts

async add(
  data: Prisma.IbuyOrderItemCreateInput,
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>,
) {
  const client = tx ?? this.prisma;
  return client.ibuyOrderItem.create({ data });
}
```

---

### 4.10 OrderModule (ibuy_order) — QueryRunner → Prisma Transaction

**This is the most complex migration.** OrderService uses `QueryRunner` for ACID transactions across `OrderEntity`, `OrderItemsEntity`, and `SkuEntity`.

**Current pattern (`order.service.ts`):**
```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
try {
  await queryRunner.manager.save(OrderEntity, order);
  await this.orderItemsService.add(orderItem, queryRunner.manager);
  await this.skuService.decrCount(username, queryRunner.manager);
  await this.sendDelayMessage(order.id);
  await queryRunner.commitTransaction();
} catch (err) {
  await queryRunner.rollbackTransaction();
} finally {
  await queryRunner.release();
}
```

**Prisma migration — Interactive Transactions:**
```typescript
// src/mall-service/mall-service-order/order/order.prisma.repository.ts

async createOrderWithItems(
  orderData: Prisma.IbuyOrderCreateInput,
  orderItemsData: Prisma.IbuyOrderItemCreateInput[],
  username: string,
) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Create order
    const order = await tx.ibuyOrder.create({ data: orderData });

    // 2. Create order items
    for (const item of orderItemsData) {
      await tx.ibuyOrderItem.create({
        data: { ...item, orderId: order.id },
      });
    }

    // 3. Decrement inventory — pass the tx client
    await this.skuService.decrCountWithTx(username, tx);

    // 4. Send delay message (no DB, not in transaction)
    await this.sendDelayMessage(order.id);

    return order;
  });
}
```

**`skuService.decrCountWithTx` — decrCount using Prisma transaction client:**
```typescript
async decrCountWithTx(
  username: string,
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>,
) {
  const cartKey = `Cart_${username}`;
  const orderItems = await this.redisService.hvals(cartKey);

  for (const orderItem of orderItems) {
    const parsed = JSON.parse(orderItem);
    const result = await tx.$executeRaw`
      UPDATE ibuy_sku
      SET num = num - ${parsed.num}, sale_num = sale_num + ${parsed.num}
      WHERE id = ${parsed.skuId} AND num >= ${parsed.num}
    `;
    if (result === 0) {
      throw new HttpException('库存不足', HttpStatus.BAD_REQUEST);
    }
  }
}
```

---

## Phase 5: Pattern Reference (TypeORM → Prisma)

### 5.1 Standard CRUD

| TypeORM | Prisma |
|---|---|
| `repo.findOneBy({ id })` | `prisma.model.findUnique({ where: { id } })` |
| `repo.findBy({ field })` | `prisma.model.findMany({ where: { field } })` |
| `repo.find({ where: { field }, take: 10 })` | `prisma.model.findMany({ where: { field }, take: 10 })` |
| `repo.insert(entity)` | `prisma.model.create({ data: entity })` |
| `repo.update(...).execute()` | `prisma.model.update({ where, data })` |
| `repo.delete(id)` | `prisma.model.delete({ where: { id } })` |
| `repo.findOneBy({ id })` → null check | `prisma.model.findUnique({ where: { id } })` → null check |

### 5.2 Transactions

| TypeORM | Prisma |
|---|---|
| `QueryRunner` with `start/commit/rollback` | `prisma.$transaction(async (tx) => { ... })` |
| `manager.insert(Entity, data)` | `tx.model.create({ data })` |
| `manager.query(sql)` | `tx.$executeRaw` or `tx.$queryRaw` |
| Pass `manager` to nested services | Pass `tx` client to nested repository methods |

### 5.3 QueryBuilder → Prisma Fluent API

| TypeORM QueryBuilder | Prisma |
|---|---|
| `.createQueryBuilder('alias')` | `prisma.model.findMany({ where: {}, orderBy: {}, take:, skip: })` |
| `.where('field = :value', { value })` | `.findMany({ where: { field: value } })` |
| `.andWhere('field = :v', { v })` | `.findMany({ where: { AND: [{ field1 }, { field2 }] } })` |
| `.skip(n).limit(m)` | `.findMany({ skip: n, take: m })` |
| `.orderBy('field', 'DESC')` | `.findMany({ orderBy: { field: 'desc' } })` |
| `.getManyAndCount()` | `const [data, total] = await prisma.$transaction([query, countQuery])` |
| `.getMany()` | `.findMany()` |
| `.select(['field1', 'field2'])` | `.findMany({ select: { field1: true, field2: true } })` |

### 5.4 Raw SQL

| TypeORM | Prisma |
|---|---|
| `dataSource.query(sql)` | `prisma.$queryRaw\`sql\`` or `prisma.$queryRaw(sql, params)` |
| `manager.query(sql)` | `tx.$executeRaw\`sql\`` or `tx.$queryRaw\`sql\`` |
| String concatenation in SQL | Template literal with `${variable}` (Prisma auto-parameterizes) |

### 5.5 Special Cases

| TypeORM Pattern | Prisma Solution |
|---|---|
| `Not(IsNull())` | `where: { field: { not: Prisma.DbNull } }` |
| `find({ order: { saleNum: 'DESC' }, take: 10 })` | `.findMany({ orderBy: { saleNum: 'desc' }, take: 10 })` |
| `@PrimaryGeneratedColumn()` auto-increment | `@id @default(autoincrement())` |
| `@PrimaryColumn()` (string, no auto) | `@id @map("id")` (no `@default`) |
| `createQueryBuilder().update().set({ field: () => 'field + 1' })` | `.update({ data: { field: { increment: 1 } } })` |
| `result.data` (unwrapping TypeORM entity) | `result` is already the entity — no `.data` wrapper |

---

## Phase 6: Remove TypeORM

After all modules are migrated, remove TypeORM:

### 6.1 Uninstall Packages

```bash
npm uninstall @nestjs/typeorm typeorm
```

### 6.2 Remove TypeOrmModule from AppModule

```typescript
// app.module.ts — REMOVE:
import { TypeOrmModule } from '@nestjs/typeorm';
// REMOVE the TypeOrmModule.forRootAsync({ ... }) block
```

### 6.3 Delete All Entity Files

```bash
find src -name "*.entity.ts" -delete
```

### 6.4 Remove Repository Files (if any intermediate repositories were created)

### 6.5 Clean Up Imports

Search for any remaining TypeORM imports:
```bash
grep -r "from '@nestjs/typeorm'" src/
grep -r "from 'typeorm'" src/
```

---

## Phase 7: Testing Strategy

### 7.1 Unit Tests

Each migrated repository/service should have unit tests. Use **dependency injection** — the `PrismaService` can be mocked easily:

```typescript
const mockPrismaService = {
  ibuyMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};
```

### 7.2 Integration Tests

Test against a **test database** (separate from dev/prod). Use Prisma migrations on the test DB:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/mall_test
npx prisma migrate deploy
npx prisma db seed  # if seeding needed
```

### 7.3 API Contract Tests

**Critical:** The controllers must not change. Run existing API tests (e.g., Postman collections, automated e2e tests) against the migrated modules to verify the response format stays identical.

### 7.4 Rollback per Module

If a module migration breaks, rollback by:
1. Reverting the service file to use TypeORM repository
2. Re-importing `TypeOrmModule.forFeature` in the module
3. No database migration needed — TypeORM and Prisma coexist

### 7.5 Performance Regression

Run query benchmarks on complex queries (pagination, joins) before and after migration. Prisma's query performance should be comparable or better.

---

## Phase 8: Effort Estimates

| Module | Entities | Complexity | Est. Time |
|---|---|---|---|
| TemplateModule | 1 | Simple CRUD | 1-2h |
| SpecModule | 1 | Simple CRUD | 1h |
| ParaModule | 1 | Simple CRUD | 1h |
| BrandModule | 2 | CRUD + raw SQL join | 2-3h |
| AddressModule | 1 | CRUD + relation | 2h |
| CategoryModule | 1 | CRUD + self-ref relation | 2-3h |
| SpuModule | 1 | CRUD + 4-entity queries | 3-4h |
| SkuModule | 1 | CRUD + raw SQL inventory | 3-4h |
| MemberModule | 1 | CRUD + bcrypt + token version | 2-3h |
| OrderItemsModule | 1 | CRUD + EntityManager pattern | 2h |
| OrderModule | 1 | Transaction migration (complex) | 4-6h |
| **Cleanup** | — | Uninstall, remove imports | 1h |
| **Testing** | — | Per-module tests | 8-12h |
| **Total** | **12 entities** | | **~35-45h** |

---

## Files to Create / Modify / Delete

### Create (New Files)

```
prisma/
  schema.prisma                    ← Generated + cleaned up
  migrations/                      ← Auto-generated by Prisma Migrate
  seed.ts                          ← Optional: database seeding

src/common/modules/prisma/
  prisma.module.ts                 ← NestJS module for PrismaService
  prisma.service.ts                ← PrismaService extends PrismaClient

src/{module}/
  {entity}.prisma.repository.ts   ← One per entity (12 total)
  {entity}.repository.ts           ← (temporary during co-existence)
```

### Modify

```
src/app.module.ts                 ← Add PrismaModule, disable TypeORM synchronize, eventually remove TypeOrmModule
package.json                       ← Remove @nestjs/typeorm, typeorm; Add @prisma/client
.env.example                       ← Add DATABASE_URL variable
```

### Delete (Last Step)

```
src/**/*.entity.ts                 ← All 12 entity files
```

---

## Rollback Plan

### During Co-existence Phase

- Each module can be rolled back independently
- Revert service to TypeORM, re-add `TypeOrmModule.forFeature` import
- No data migration needed — both ORMs point to the same database

### After TypeORM Removal

- Re-install `@nestjs/typeorm` and `typeorm` packages
- Re-add `TypeOrmModule.forRootAsync` to `app.module.ts`
- Restore deleted entity files from git
- Roll forward by re-migrating the problematic module

### Database

The database itself **never needs migration** — Prisma uses the exact same PostgreSQL tables. The migration is purely an application-layer ORM swap.

---

## Open Questions for the Team

1. **Prisma versioning strategy:** Should we use Prisma's migrate system going forward, or keep manual SQL migrations? (Recommendation: use Prisma Migrate — it generates migration files from schema changes)
2. **Prisma enums:** Should string-coded fields like `orderStatus: '0' | '1'` be converted to Prisma enums? (Recommendation: yes, as a later enhancement)
3. **Soft deletes:** Should `is_delete` columns become Prisma's `deleteAt` pattern? (Recommendation: implement as a separate enhancement)
4. **Seed data:** Does the team want a Prisma seed script for development data?
5. **Transaction isolation level:** The OrderModule uses default isolation — should we specify `READ COMMITTED` explicitly in Prisma transactions?
