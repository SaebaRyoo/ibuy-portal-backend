## Context

iBuy 商城当前只有常规下单流程（购物车 → 创建订单 → 支付 → 延时关单）。秒杀场景的瞬时并发量可达常规流量的 10-100 倍，直接走常规数据库事务会导致行锁等待、超卖、甚至数据库崩溃。

现有基础设施已为秒杀做好准备：
- **RabbitMQ**: `RabbitMQConstants` 已预定义 6 个秒杀队列/交换机常量
- **Alipay**: `goAlipay()` 已支持 `queueName` 参数，`alipayNotifyNotice()` 已预留 `SEC_KILL_ORDER_PAY` 分支
- **Redis**: 已集成 ioredis，可直接使用 Lua 脚本
- **Prisma**: 已有 `$transaction` 和 raw SQL 原子扣库存模式

约束条件：
- 单体架构，不引入新中间件
- 不使用分布式锁（复杂度过高），用 Redis 原子操作替代
- 秒杀订单与普通订单数据隔离（独立表），但共享支付网关

## Goals / Non-Goals

**Goals:**
- 秒杀活动的完整生命周期管理（创建 → 审核 → 预热 → 进行 → 结束）
- 基于 Redis 的高并发库存安全扣减，防止超卖
- 每用户每活动限购（默认 1 件），防止重复抢购
- 异步下单（MQ 削峰），降低数据库压力
- 秒杀订单超时自动关闭，复用死信队列模式
- 支付回调正确路由到秒杀订单处理逻辑

**Non-Goals:**
- 不实现前端页面或 WebSocket 实时推送
- 不做分布式部署（多实例 Redis 分片 / 集群）
- 不做秒杀活动的数据分析/报表
- 不做管理员权限控制（RBAC 是独立功能）
- 不做商品详情页缓存/静态化

## Decisions

### 1. 库存扣减策略：Redis 预扣 + DB 最终一致

**选择**: 活动开始前将库存加载到 Redis，用 Lua 脚本原子执行「检查库存 → 扣减 → 记录用户」，MQ 消费者异步写 DB。

**Lua 脚本逻辑**:
```lua
-- KEYS[1] = seckill:stock:{goodsId}
-- KEYS[2] = seckill:user:{activityId}:{username}
-- ARGV[1] = 购买数量 (通常为 1)

-- 1. 检查用户是否已抢购
if redis.call('EXISTS', KEYS[2]) == 1 then
    return -1  -- 已抢购
end
-- 2. 检查并扣减库存
local stock = redis.call('GET', KEYS[1])
if not stock or tonumber(stock) < tonumber(ARGV[1]) then
    return 0  -- 库存不足
end
redis.call('DECRBY', KEYS[1], ARGV[1])
-- 3. 标记用户已抢购 (过期时间 = 活动结束时间)
redis.call('SET', KEYS[2], '1', 'EX', ARGV[2])
return 1  -- 成功
```

**替代方案考虑**:
- ❌ 纯数据库悲观锁（`SELECT FOR UPDATE`）：高并发下行锁等待严重
- ❌ 纯数据库乐观锁（`WHERE num >= N`）：大量重试，浪费连接
- ❌ Redis DECR 无 Lua：检查+扣减非原子，可能超卖

### 2. 下单流程：Redis 预扣 → MQ 异步 → DB 落库

**选择**: 请求到达后只做 Redis 操作 + 发 MQ 消息，秒级响应；MQ 消费者负责创建 DB 订单。

**流程**:
```
用户请求 → Controller
  → Redis Lua (库存扣减 + 限购检查)      ← 同步，毫秒级
  → MQ Publish (订单创建消息)              ← 同步，毫秒级
  → 返回 "排队中" + 临时订单号             ← 响应用户
  
MQ Consumer (异步)
  → Prisma $transaction
    → 创建 IbuySeckillOrder
    → 扣减 IbuySeckillGoods.stockCount
    → 发送延时关单消息
  → 如果 DB 失败 → Redis 回补库存
```

**替代方案**: 同步创建订单 → 但无法抵挡瞬时高并发，直接打穿数据库。

### 3. 数据模型：独立表，不复用普通订单

**选择**: 新建 `ibuy_seckill_activity`、`ibuy_seckill_goods`、`ibuy_seckill_order` 三张表。

**理由**:
- 秒杀订单字段与普通订单差异大（活动ID、秒杀价、限购等）
- 查询/统计需隔离，不影响常规订单性能
- 秒杀商品有独立的库存（`stockCount`），与 SKU 的 `num` 独立管理
- 关单/支付逻辑可独立演进

### 4. 活动时间段：简单起止时间

**选择**: 每个活动一个 `startTime` + `endTime`，不做复杂的多时间段/多场次。

**理由**: MVP 阶段保持简单。多场次可作为后续迭代。

### 5. 预热机制：手动触发 + 自动校验

**选择**: 管理员将活动状态设为"已上架"时触发预热（加载库存到 Redis）。下单时校验活动时间窗口。

**替代方案**: 定时任务自动预热 → 增加复杂度，且 NestJS 单体中定时任务的可靠性不如手动触发。

### 6. MQ 拓扑：复用已预留常量

**选择**: 直接使用 `RabbitMQConstants` 中已定义的秒杀常量，与普通订单完全隔离。

```
秒杀下单 → EXCHANGE_SEC_KILL_ORDER_DELAY → QUEUE_SEC_KILL_ORDER_DELAY (TTL) 
                                         ↘ QUEUE_SEC_KILL_ORDER_CHECK (死信消费)
支付回调 → EXCHANGE_SEC_KILL_ORDER_PAY   → QUEUE_SEC_KILL_ORDER_PAY
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Redis 宕机导致库存数据丢失 | 无法下单或超卖 | 预热时记录 DB 快照；Redis 开启 AOF 持久化；消费者端做 DB 层二次校验 |
| MQ 消费者处理失败 | 用户 Redis 扣了库存但没生成订单 | 消费者 catch 异常后回补 Redis 库存（`INCRBY`）；死信队列兜底 |
| 活动结束后 Redis key 残留 | 内存泄漏 | 所有 key 设置 TTL = 活动结束时间 + 1小时缓冲 |
| 单体架构并发上限 | 单进程 Node.js 吞吐有限 | Redis + MQ 已将热路径从 DB 剥离；后续可水平扩展无状态 Node 进程 |
| 用户重复请求（网络重试） | 可能扣两次库存 | Lua 脚本内置用户去重（`EXISTS` 检查） |
