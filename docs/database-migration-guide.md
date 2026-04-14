# 线上数据库迁移安全指南

## 目录

- [当前问题](#当前问题)
- [安全迁移原则](#安全迁移原则)
- [迁移工作流](#迁移工作流)
- [命令速查](#命令速查)
- [危险操作清单](#危险操作清单)
- [回滚策略](#回滚策略)
- [CI/CD 集成建议](#cicd-集成建议)

---

## 当前问题

当前 `Dockerfile` 中将迁移和应用启动耦合在一起：

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

**风险点：**

1. **多副本竞争** — 如果有多个容器同时启动，会并发执行 migrate，可能导致锁冲突或重复执行
2. **迁移失败 = 应用无法启动** — migrate 失败会阻止应用启动，无法做灰度/回滚
3. **无法预审 SQL** — 没有机会在执行前审查将要应用的 SQL 变更
4. **没有备份流程** — 迁移前没有自动备份，出问题后无法快速恢复

---

## 安全迁移原则

### 1. 迁移与部署分离

迁移应该是一个**独立步骤**，在应用部署之前单独执行，而不是嵌入到应用启动流程中。

### 2. 向后兼容的 Schema 变更

每次迁移必须保证**新旧代码都能正常运行**，这样才能做到零停机部署：

| ✅ 安全操作                 | ❌ 危险操作                 |
| --------------------------- | --------------------------- |
| 新增列（带默认值或可空）    | 删除列                      |
| 新增表                      | 重命名列                    |
| 新增索引（CONCURRENTLY）    | 重命名表                    |
| 放宽约束（NOT NULL → NULL） | 收紧约束（NULL → NOT NULL） |

### 3. 多阶段部署

对于不兼容的变更，拆分为多次部署：

```
阶段1: 添加新列 → 部署新代码（写新列+旧列）
阶段2: 数据回填 → 迁移历史数据
阶段3: 切换代码（只读新列）→ 部署
阶段4: 删除旧列 → 最终清理
```

---

## 迁移工作流

### 开发环境（本地）

```bash
# 1. 修改 schema.prisma
# 2. 生成迁移文件（会创建 SQL 文件）
pnpm db:migrate --name descriptive_name

# 3. 检查生成的 SQL 文件
cat prisma/migrations/2026XXXX_descriptive_name/migration.sql

# 4. 重新生成 Prisma Client
pnpm db:generate
```

### 线上环境（生产）

```bash
# ===== 迁移前 =====

# 1. 查看待执行的迁移
pnpm db:migrate:status

# 2. 审查即将执行的 SQL（人工检查）
cat prisma/migrations/<pending_migration>/migration.sql

# 3. 备份数据库
pnpm db:backup

# ===== 执行迁移 =====

# 4. 在单独的容器/进程中执行迁移
pnpm db:migrate:deploy

# ===== 迁移后 =====

# 5. 验证迁移状态
pnpm db:migrate:status

# 6. 部署新版本代码
docker compose up -d nestjs
```

---

## 命令速查

| 命令                     | 环境       | 说明                             |
| ------------------------ | ---------- | -------------------------------- |
| `pnpm db:migrate`        | 开发       | 创建并执行迁移（交互式）         |
| `pnpm db:migrate:deploy` | 生产       | 执行所有待处理的迁移（非交互式） |
| `pnpm db:migrate:status` | 任意       | 查看迁移状态                     |
| `pnpm db:migrate:reset`  | **仅开发** | 重置数据库（⚠️ 会删除所有数据）  |
| `pnpm db:backup`         | 生产       | 备份数据库到 `backups/` 目录     |
| `pnpm db:generate`       | 任意       | 重新生成 Prisma Client           |

---

## 危险操作清单

### 删除列/表

**绝对不要直接删除正在使用的列。** 按以下步骤操作：

```
1. 新代码停止读写该列 → 部署
2. 等待旧版本完全下线
3. 创建迁移删除该列 → 执行迁移
```

### 重命名列/表

Prisma 会把"重命名"理解为"删除旧的 + 创建新的"，**这会导致数据丢失**。

正确做法：

```sql
-- 手动编辑生成的 migration.sql
-- 将 DROP + CREATE 替换为：
ALTER TABLE "ibuy_xxx" RENAME COLUMN "old_name" TO "new_name";
```

### 添加 NOT NULL 约束

```
1. 先添加可空列 → 部署
2. 回填数据（确保所有行都有值）
3. 添加 NOT NULL 约束 → 迁移
```

### 大表添加索引

对于数据量大的表，使用 `CREATE INDEX CONCURRENTLY` 避免锁表：

```sql
-- 手动编辑 migration.sql
-- 将：
CREATE INDEX "ibuy_order_username_idx" ON "ibuy_order"("username");
-- 改为：
CREATE INDEX CONCURRENTLY "ibuy_order_username_idx" ON "ibuy_order"("username");
```

> ⚠️ 注意：`CONCURRENTLY` 不能在事务中执行，需要手动编辑迁移文件。

---

## 回滚策略

Prisma Migrate **不支持自动回滚**。回滚方案：

### 方案 A：数据库备份恢复

```bash
# 从备份恢复
pg_restore -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE backup_file.sql

# 标记迁移为已回滚（在 _prisma_migrations 表中）
prisma migrate resolve --rolled-back <migration_name>
```

### 方案 B：编写反向迁移

```bash
# 创建新的迁移来撤销变更
pnpm db:migrate --name rollback_xxx

# 在生成的 SQL 中写反向操作
# 例如：删除刚添加的列
ALTER TABLE "ibuy_order" DROP COLUMN "new_column";
```

### 方案 C：标记迁移为已应用（紧急情况）

如果迁移失败但数据库已部分变更：

```bash
# 手动修复数据库后，标记迁移为已应用
prisma migrate resolve --applied <migration_name>
```

---

## CI/CD 集成建议

### 推荐流程

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  代码合并    │ ──→ │  构建镜像    │ ──→ │  执行迁移    │ ──→ │  滚动部署    │
│  (PR 合并)  │     │  (docker     │     │  (单独Job)  │     │  (更新容器)   │
│             │     │   build)     │     │             │     │              │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                               │
                                         ┌─────┴─────┐
                                         │ 失败则停止 │
                                         │ 不执行部署 │
                                         └───────────┘
```

### GitHub Actions 示例

```yaml
# .github/workflows/deploy.yml
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx prisma generate
      - name: Backup database
        run: ./scripts/db-backup.sh
      - name: Check migration status
        run: npx prisma migrate status
      - name: Deploy migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  deploy:
    needs: migrate # 迁移成功后才部署
    runs-on: ubuntu-latest
    steps:
      - name: Deploy application
        run: docker compose up -d nestjs
```

### 独立迁移容器方式

```bash
# 使用一次性容器执行迁移，不影响正在运行的应用
docker compose run --rm nestjs sh -c "npx prisma migrate deploy"

# 迁移成功后再更新应用容器
docker compose up -d nestjs
```
