## Why

iBuy 商城目前只有常规下单流程，无法支撑限时限量促销场景。电商平台需要秒杀能力来拉新促活、制造营销事件。秒杀场景的核心挑战在于瞬时高并发下的库存安全（超卖）和系统稳定性，常规订单流程无法满足这些要求。

## What Changes

- 新增秒杀活动管理能力：创建/编辑/审核/上下架秒杀活动及商品
- 新增秒杀商品预热机制：活动开始前将库存预加载至 Redis，用 Lua 脚本原子扣减
- 新增秒杀下单流程：用户限购校验 → Redis 原子扣库存 → MQ 异步创建订单
- 新增秒杀订单超时自动关闭：复用已有死信队列模式（`EXCHANGE_SEC_KILL_ORDER_DELAY`）
- 新增秒杀支付回调处理：复用 Alipay 回调路由（`SEC_KILL_ORDER_PAY` 队列已预留）
- 新增 Prisma 数据模型：`IbuySeckillActivity`、`IbuySeckillGoods`、`IbuySeckillOrder`
- 新增 `mall-service-seckill/` 模块目录

## Capabilities

### New Capabilities

- `seckill-activity`: 秒杀活动的创建、编辑、审核、上下架、时间段管理
- `seckill-goods`: 秒杀商品的关联、定价、库存设置、Redis 预热与库存扣减
- `seckill-order`: 秒杀下单（限购校验 → Redis 扣库存 → MQ 异步落库）、超时关单、支付状态同步

### Modified Capabilities

（无现有 spec 需要变更）

## Impact

- **数据库**: 新增 3 张 Prisma 模型表（`ibuy_seckill_activity`、`ibuy_seckill_goods`、`ibuy_seckill_order`），需执行 `pnpm db:migrate`
- **Redis**: 新增秒杀库存 key（`seckill:stock:{goodsId}`）、用户限购 key（`seckill:user:{activityId}:{username}`），引入 Lua 脚本
- **RabbitMQ**: 激活已预留的 6 个秒杀队列/交换机常量，新增 listener
- **支付**: `AlipayService` 需补全 `SEC_KILL_ORDER_PAY` 分支逻辑
- **API**: 新增 `/v1/seckill/activity`、`/v1/seckill/goods`、`/v1/seckill/order` 系列端点
- **依赖**: 无新外部依赖，复用现有 Redis + RabbitMQ + Prisma 基础设施
