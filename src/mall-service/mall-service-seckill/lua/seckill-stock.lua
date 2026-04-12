-- KEYS[1] = seckill:stock:{goodsId}
-- KEYS[2] = seckill:user:{activityId}:{username}
-- ARGV[1] = 购买数量
-- ARGV[2] = 限购标记过期时间（秒）

-- 1. 检查用户是否已抢购
if redis.call('EXISTS', KEYS[2]) == 1 then
    return -1
end

-- 2. 检查并扣减库存
local stock = redis.call('GET', KEYS[1])
if not stock or tonumber(stock) < tonumber(ARGV[1]) then
    return 0
end

redis.call('DECRBY', KEYS[1], ARGV[1])

-- 3. 标记用户已抢购
redis.call('SET', KEYS[2], '1', 'EX', ARGV[2])

return 1
