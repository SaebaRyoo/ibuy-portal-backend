## ADDED Requirements

### Requirement: 添加秒杀商品
系统 SHALL 允许将 SKU 商品关联到秒杀活动，设置秒杀价和秒杀库存。一个 SKU 在同一活动中只能关联一次。

#### Scenario: 成功添加秒杀商品
- **WHEN** 提交有效的活动 ID、SKU ID、秒杀价（低于原价）、秒杀库存数量
- **THEN** 系统创建秒杀商品记录，冗余存储 SKU 名称、原价、图片等信息

#### Scenario: 重复添加同一 SKU
- **WHEN** 同一活动中已存在该 SKU 的秒杀商品
- **THEN** 系统返回 BusinessException，提示"该商品已在本活动中"

#### Scenario: 秒杀价高于原价
- **WHEN** 提交的秒杀价大于等于 SKU 原价
- **THEN** 系统返回 BusinessException，提示"秒杀价必须低于原价"

### Requirement: 删除秒杀商品
系统 SHALL 允许从未上架的活动中移除秒杀商品。已上架活动的商品不允许删除。

#### Scenario: 从未上架活动中删除商品
- **WHEN** 活动状态不是「已上架」，删除指定秒杀商品
- **THEN** 系统删除该秒杀商品记录

#### Scenario: 从已上架活动中删除商品
- **WHEN** 活动状态为「已上架」，尝试删除
- **THEN** 系统返回 BusinessException，提示"已上架活动不允许修改商品"

### Requirement: 查询活动关联的秒杀商品
系统 SHALL 支持查询指定活动下的所有秒杀商品列表。

#### Scenario: 查询已上架活动的商品
- **WHEN** 查询参数包含有效的活动 ID
- **THEN** 返回该活动下所有秒杀商品列表，包含秒杀价、剩余库存、SKU 信息

### Requirement: 库存预热
系统 SHALL 在活动上架时将所有关联秒杀商品的库存加载到 Redis。key 格式为 `seckill:stock:{goodsId}`，值为秒杀库存数量。

#### Scenario: 预热成功
- **WHEN** 活动上架触发预热
- **THEN** 每个秒杀商品的库存被写入 Redis，TTL 设置为活动结束时间 + 1 小时

#### Scenario: 预热时商品库存为 0
- **WHEN** 某秒杀商品的库存为 0
- **THEN** 该商品仍写入 Redis（值为 0），不跳过

### Requirement: Redis 原子库存扣减
系统 SHALL 使用 Lua 脚本在 Redis 中原子执行库存检查和扣减。Lua 脚本 MUST 同时检查用户限购标记。

#### Scenario: 库存充足且用户未购买
- **WHEN** Redis 中库存 >= 请求数量，且用户限购 key 不存在
- **THEN** Lua 脚本原子扣减库存、设置用户限购标记，返回 1（成功）

#### Scenario: 库存不足
- **WHEN** Redis 中库存 < 请求数量
- **THEN** Lua 脚本返回 0（库存不足），不做任何修改

#### Scenario: 用户已购买
- **WHEN** 用户限购 key 已存在
- **THEN** Lua 脚本返回 -1（已购买），不做任何修改

### Requirement: 库存回补
系统 SHALL 在秒杀订单创建失败或超时关闭时回补 Redis 库存。

#### Scenario: MQ 消费者创建订单失败
- **WHEN** 异步创建秒杀订单的数据库事务失败
- **THEN** 系统执行 `INCRBY seckill:stock:{goodsId} 数量`，回补库存

#### Scenario: 秒杀订单超时关闭
- **WHEN** 秒杀订单超时未支付被自动关闭
- **THEN** 系统回补 Redis 库存，并删除用户限购标记
