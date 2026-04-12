## 1. 数据模型与基础设施

- [x] 1.1 在 `prisma/schema.prisma` 中添加 `IbuySeckillActivity` 模型（id, name, startTime, endTime, intro, status, createTime, updateTime）
- [x] 1.2 在 `prisma/schema.prisma` 中添加 `IbuySeckillGoods` 模型（id, activityId, skuId, skuName, skuImage, skuPrice, seckillPrice, stockCount, createTime）
- [x] 1.3 在 `prisma/schema.prisma` 中添加 `IbuySeckillOrder` 模型（id, activityId, seckillGoodsId, skuId, username, seckillPrice, money, orderStatus, payStatus, payTime, transactionId, receiverAddress, createTime, updateTime）
- [x] 1.4 运行 `pnpm db:migrate` 生成迁移并更新 Prisma Client

## 2. 模块脚手架

- [x] 2.1 创建 `src/mall-service/mall-service-seckill/` 目录结构
- [x] 2.2 创建 `seckill-activity/` 子模块（controller、service、module）
- [x] 2.3 创建 `seckill-goods/` 子模块（controller、service、module）
- [x] 2.4 创建 `seckill-order/` 子模块（controller、service、module）
- [x] 2.5 创建 `mall-seckill.module.ts` 聚合模块，在 `AppModule` 中注册
- [x] 2.6 创建 Redis Lua 脚本文件 `src/mall-service/mall-service-seckill/lua/seckill-stock.lua`

## 3. 秒杀活动管理（seckill-activity）

- [x] 3.1 编写 SeckillActivityService 单元测试：创建活动（成功 + 时间校验失败）
- [x] 3.2 实现 SeckillActivityService.create() — 创建活动
- [x] 3.3 编写 SeckillActivityService 单元测试：编辑活动（成功 + 状态不允许）
- [x] 3.4 实现 SeckillActivityService.update() — 编辑活动
- [x] 3.5 编写 SeckillActivityService 单元测试：审核活动（通过 + 驳回 + 重复审核）
- [x] 3.6 实现 SeckillActivityService.audit() — 审核活动
- [x] 3.7 编写 SeckillActivityService 单元测试：上架活动（成功触发预热 + 状态不允许）
- [x] 3.8 实现 SeckillActivityService.publish() — 上架活动 + 触发库存预热
- [x] 3.9 编写 SeckillActivityService 单元测试：下架活动（成功清理 Redis + 状态不允许）
- [x] 3.10 实现 SeckillActivityService.unpublish() — 下架活动 + 清理 Redis
- [x] 3.11 编写 SeckillActivityService 单元测试：分页查询 + 按状态筛选
- [x] 3.12 实现 SeckillActivityService.findAll() — 分页查询
- [x] 3.13 编写 SeckillActivityService 单元测试：查询当前进行中的活动
- [x] 3.14 实现 SeckillActivityService.findActive() — 查询进行中活动（@Public）
- [x] 3.15 编写 SeckillActivityController 集成测试
- [x] 3.16 实现 SeckillActivityController — 路由绑定

## 4. 秒杀商品管理（seckill-goods）

- [x] 4.1 编写 SeckillGoodsService 单元测试：添加秒杀商品（成功 + 重复添加 + 秒杀价校验）
- [x] 4.2 实现 SeckillGoodsService.add() — 添加秒杀商品
- [x] 4.3 编写 SeckillGoodsService 单元测试：删除秒杀商品（成功 + 已上架不允许）
- [x] 4.4 实现 SeckillGoodsService.remove() — 删除秒杀商品
- [x] 4.5 编写 SeckillGoodsService 单元测试：查询活动商品列表
- [x] 4.6 实现 SeckillGoodsService.findByActivityId() — 查询商品列表
- [x] 4.7 编写 SeckillGoodsService 单元测试：库存预热（写 Redis + TTL 设置）
- [x] 4.8 实现 SeckillGoodsService.warmUp() — 库存预热到 Redis
- [x] 4.9 编写 SeckillGoodsService 单元测试：库存回补
- [x] 4.10 实现 SeckillGoodsService.restoreStock() — Redis 库存回补
- [x] 4.11 编写 SeckillGoodsController 集成测试
- [x] 4.12 实现 SeckillGoodsController — 路由绑定

## 5. Redis Lua 脚本

- [x] 5.1 编写 Lua 脚本单元测试（mock Redis eval）：库存充足 + 用户未购买 → 返回 1
- [x] 5.2 编写 Lua 脚本单元测试：库存不足 → 返回 0
- [x] 5.3 编写 Lua 脚本单元测试：用户已购买 → 返回 -1
- [x] 5.4 实现 Lua 脚本 `seckill-stock.lua`
- [x] 5.5 实现 SeckillStockService 封装 Lua 脚本调用（`eval` 调用 + 结果解析）

## 6. 秒杀下单与异步处理（seckill-order）

- [x] 6.1 编写 SeckillOrderService 单元测试：秒杀下单（成功 + 活动时间校验 + 库存不足 + 已抢购）
- [x] 6.2 实现 SeckillOrderService.placeOrder() — 秒杀下单（Redis 扣库存 → MQ 发消息）
- [x] 6.3 编写 SeckillOrderCreateListener 单元测试：MQ 消费者创建订单（成功 + DB 失败回补库存）
- [x] 6.4 实现 SeckillOrderCreateListener — MQ 消费者异步创建秒杀订单
- [x] 6.5 在 OrderModule（或 SeckillModule）中注册秒杀相关 MQ 交换机声明
- [x] 6.6 编写 SeckillOrderService 单元测试：查询订单状态 + 查询订单列表
- [x] 6.7 实现 SeckillOrderService.findById() + findByUser() — 查询接口
- [x] 6.8 编写 SeckillOrderController 集成测试
- [x] 6.9 实现 SeckillOrderController — 路由绑定

## 7. 超时关单与支付回调

- [x] 7.1 编写 SeckillTimerMessageListener 单元测试：超时关单（未支付关闭 + 已支付跳过）
- [x] 7.2 实现 SeckillTimerMessageListener — 死信队列消费者，关闭超时订单 + 回补库存 + 关闭支付宝交易
- [x] 7.3 编写 SeckillPayMessageListener 单元测试：支付回调（正常支付 + 订单已关闭）
- [x] 7.4 实现 SeckillPayMessageListener — 支付队列消费者，更新支付状态
- [x] 7.5 修改 AlipayService.alipayNotifyNotice() — 补全 `SEC_KILL_ORDER_PAY` 分支路由逻辑

## 8. 集成验证

- [x] 8.1 确保所有单元测试通过（`pnpm test`）
- [x] 8.2 验证 Prisma 迁移可正常执行
- [x] 8.3 验证 RabbitMQ 交换机/队列声明无冲突
- [x] 8.4 运行 `pnpm lint` 确保代码风格一致
