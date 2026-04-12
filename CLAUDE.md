# CLAUDE.md

iBuy 商城后端服务 — NestJS 单体应用。

## AI 进入须知

### 必读文件（按顺序）

1. **本文件** `CLAUDE.md` — 仓库地图，了解全局
2. `docs/tech-stack.md` — 技术栈，确认你了解项目依赖
3. `docs/project-structure.md` — 目录结构，定位代码位置
4. `docs/coding-standards.md` — 命名、风格、API 约定
5. `docs/tdd-workflow.md` — TDD 流程，理解开发节奏

### 工作流

本仓库采用 **TDD（测试驱动开发）** 工作流：

1. 没有对应的测试用例，**不允许开始写实现代码**
2. 先写失败测试 → 最小实现 → 重构（Red-Green-Refactor）
3. 每个 PR 必须包含测试
4. 详见 → `docs/tdd-workflow.md`

### 受保护目录（禁止手动修改）

| 目录 | 原因 |
|------|------|
| `prisma/generated/` | Prisma Client 自动生成，由 `pnpm db:generate` 管理 |
| `logs/` | 运行时日志输出，自动轮转 |
| `node_modules/` | 依赖目录 |

### 主要命令入口

| 场景 | 命令 |
|------|------|
| 启动开发 | `pnpm start:dev` |
| 运行测试 | `pnpm test` |
| 数据库变更后 | `pnpm db:generate` |
| 完整命令列表 | → `docs/commands.md` |

## 文档地图

| 文档 | 内容 |
|------|------|
| `docs/tech-stack.md` | 技术栈：框架、数据库、中间件、部署 |
| `docs/project-structure.md` | 项目目录结构与模块说明 |
| `docs/commands.md` | 开发、测试、构建、数据库常用命令 |
| `docs/tdd-workflow.md` | TDD 流程、测试规范、测试优先级 |
| `docs/coding-standards.md` | 代码风格、命名约定、API 规范、认证、环境变量 |
| `docs/architecture-notes.md` | Prisma 生成、全局注册机制、日志、端口 |

## 关键入口文件

| 文件 | 作用 |
|------|------|
| `src/main.ts` | 应用入口，配置管道、版本化 |
| `src/app.module.ts` | 根模块，全局 Guard/Filter/Interceptor 注册 |
| `prisma/schema.prisma` | 数据模型定义 |
| `.env.example` | 环境变量模板 |
| `docker-compose.yml` | 生产部署编排 |
| `docker-compose.dev.yml` | 开发环境编排 |
