## ADDED Requirements

### Requirement: 秒杀下单
系统 SHALL 提供秒杀下单接口，执行 Redis 原子扣库存后通过 MQ 异步创建订单。接口 MUST 在 100ms 内响应。

#### Scenario: 秒杀下单成功
- **WHEN** 已认证用户在活动时间窗口内提交秒杀下单请求（活动 ID、秒杀商品 ID、收货地址 ID）
- **THEN** 系统执行 Lua 脚本扣减 Redis 库存，发送 MQ 消息，返回临时订单号和"排队中"状态

#### Scenario: 活动未开始
- **WHEN** 当前时间早于活动的 startTime
- **THEN** 系统返回 BusinessException，提示"活动未开始"

#### Scenario: 活动已结束
- **WHEN** 当前时间晚于活动的 endTime
- **THEN** 系统返回 BusinessException，提示"活动已结束"

#### Scenario: 库存不足
- **WHEN** Lua 脚本返回 0
- **THEN** 系统返回 BusinessException，提示"已售罄"

#### Scenario: 用户已抢购
- **WHEN** Lua 脚本返回 -1
- **THEN** 系统返回 BusinessException，提示"每人限购一件"

### Requirement: MQ 异步创建秒杀订单
系统 SHALL 通过 MQ 消费者异步创建秒杀订单记录。消费者 MUST 在数据库事务中完成所有操作。

#### Scenario: 异步创建订单成功
- **WHEN** MQ 消费者收到秒杀下单消息
- **THEN** 在 Prisma 事务中创建 `IbuySeckillOrder`、扣减 `IbuySeckillGoods.stockCount`、发送延时关单消息到 `EXCHANGE_SEC_KILL_ORDER_DELAY`

#### Scenario: 数据库事务失败
- **WHEN** 创建订单的数据库事务抛出异常
- **THEN** 系统回补 Redis 库存（`INCRBY`），删除用户限购标记，记录错误日志

### Requirement: 秒杀订单超时关闭
系统 SHALL 通过死信队列自动关闭超时未支付的秒杀订单。超时时间为 5 分钟。

#### Scenario: 订单超时关闭
- **WHEN** 秒杀订单在 5 分钟内未完成支付
- **THEN** 死信消费者将订单状态设为「已关闭」，回补 Redis 库存，删除用户限购标记，关闭支付宝交易

#### Scenario: 订单已支付
- **WHEN** 死信消费者处理时发现订单已支付（payStatus = 1）
- **THEN** 不做任何操作，跳过关闭

### Requirement: 秒杀订单支付回调
系统 SHALL 通过 `QUEUE_SEC_KILL_ORDER_PAY` 队列处理秒杀订单的支付宝回调。

#### Scenario: 支付成功
- **WHEN** 支付宝回调通知支付成功，`passback_params` 中的 `queueName` 为 `SEC_KILL_ORDER_PAY`
- **THEN** 系统将秒杀订单的 payStatus 更新为 `1`（已支付），payTime 设为当前时间，交易流水号存入 transactionId

#### Scenario: 订单已关闭后收到支付回调
- **WHEN** 支付回调到达时订单已被关闭
- **THEN** 系统触发退款流程，记录异常日志

### Requirement: 查询秒杀订单状态
系统 SHALL 提供接口供用户查询自己的秒杀订单状态。

#### Scenario: 查询排队中的订单
- **WHEN** 用户用临时订单号查询，MQ 消费者尚未处理
- **THEN** 返回订单状态为"排队中"

#### Scenario: 查询已创建的订单
- **WHEN** MQ 消费者已成功创建订单
- **THEN** 返回完整的订单详情，包含秒杀价、商品信息、支付状态

#### Scenario: 查询他人订单
- **WHEN** 用户尝试查询不属于自己的秒杀订单
- **THEN** 系统返回 BusinessException，提示"订单不存在"

### Requirement: 查询用户秒杀订单列表
系统 SHALL 提供接口查询当前用户的所有秒杀订单，分页返回，按创建时间降序。

#### Scenario: 查询成功
- **WHEN** 已认证用户请求秒杀订单列表
- **THEN** 返回该用户的秒杀订单列表，包含活动名称、商品信息、秒杀价、订单状态
