## ADDED Requirements

### Requirement: 创建秒杀活动
系统 SHALL 允许创建秒杀活动，包含活动名称、开始时间、结束时间、活动介绍。活动创建后状态为「未审核」。活动 ID 使用 Snowflake 算法生成（`NO.` 前缀）。

#### Scenario: 成功创建活动
- **WHEN** 提交有效的活动名称、开始时间（未来时间）、结束时间（晚于开始时间）
- **THEN** 系统创建活动记录，状态为 `0`（未审核），返回活动详情

#### Scenario: 开始时间晚于结束时间
- **WHEN** 提交的开始时间晚于或等于结束时间
- **THEN** 系统返回 BusinessException，提示"开始时间必须早于结束时间"

### Requirement: 编辑秒杀活动
系统 SHALL 允许编辑未审核或已驳回状态的活动信息。已审核/已上架/已结束的活动不允许编辑。

#### Scenario: 编辑未审核活动
- **WHEN** 活动状态为「未审核」，提交修改后的活动信息
- **THEN** 系统更新活动记录

#### Scenario: 编辑已上架活动
- **WHEN** 活动状态为「已上架」，尝试编辑
- **THEN** 系统返回 BusinessException，提示"当前状态不允许编辑"

### Requirement: 审核秒杀活动
系统 SHALL 支持审核操作，将活动状态从「未审核」变更为「已审核」或「已驳回」。

#### Scenario: 审核通过
- **WHEN** 活动状态为「未审核」，执行审核通过操作
- **THEN** 活动状态变更为 `1`（已审核）

#### Scenario: 审核驳回
- **WHEN** 活动状态为「未审核」，执行驳回操作
- **THEN** 活动状态变更为 `2`（已驳回）

#### Scenario: 重复审核
- **WHEN** 活动状态不是「未审核」，尝试审核
- **THEN** 系统返回 BusinessException

### Requirement: 上架秒杀活动
系统 SHALL 支持将已审核的活动上架。上架操作 MUST 触发商品库存预热（将关联秒杀商品的库存加载到 Redis）。

#### Scenario: 成功上架
- **WHEN** 活动状态为「已审核」，执行上架操作
- **THEN** 活动状态变更为 `3`（已上架），关联秒杀商品的库存写入 Redis key `seckill:stock:{goodsId}`

#### Scenario: 上架未审核活动
- **WHEN** 活动状态不是「已审核」，尝试上架
- **THEN** 系统返回 BusinessException

### Requirement: 下架秒杀活动
系统 SHALL 支持将已上架的活动下架。下架操作 MUST 清理 Redis 中的库存数据。

#### Scenario: 成功下架
- **WHEN** 活动状态为「已上架」，执行下架操作
- **THEN** 活动状态变更为 `4`（已下架），清理 Redis 中相关库存 key

### Requirement: 查询秒杀活动列表
系统 SHALL 支持分页查询秒杀活动，可按状态筛选。

#### Scenario: 按状态筛选
- **WHEN** 查询参数包含 `status=3`（已上架）
- **THEN** 返回所有已上架的活动列表，按开始时间降序排列

#### Scenario: 查询全部
- **WHEN** 不传状态参数
- **THEN** 返回所有活动列表，分页返回

### Requirement: 查询当前进行中的活动
系统 SHALL 提供公开接口（`@Public()`），返回当前时间窗口内正在进行的秒杀活动。

#### Scenario: 存在进行中的活动
- **WHEN** 当前时间在某活动的 startTime 和 endTime 之间，且活动状态为「已上架」
- **THEN** 返回该活动详情及关联的秒杀商品列表
