import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

export enum SeckillStockResult {
  SUCCESS = 1,
  OUT_OF_STOCK = 0,
  ALREADY_PURCHASED = -1,
}

@Injectable()
export class SeckillStockService {
  private luaScript: string;

  constructor(@InjectRedis() private readonly redisService: Redis) {
    this.luaScript = fs.readFileSync(
      path.join(__dirname, '../lua/seckill-stock.lua'),
      'utf-8',
    );
  }

  /**
   * 执行 Lua 脚本进行原子库存扣减 + 限购检查
   * @returns 1=成功, 0=库存不足, -1=已购买
   */
  async decrStock(
    goodsId: string,
    activityId: string,
    username: string,
    count: number = 1,
    ttlSeconds: number = 3600,
  ): Promise<SeckillStockResult> {
    const stockKey = `seckill:stock:${goodsId}`;
    const userKey = `seckill:user:${activityId}:${username}`;

    const result = await this.redisService.eval(
      this.luaScript,
      2,
      stockKey,
      userKey,
      count.toString(),
      ttlSeconds.toString(),
    );

    return Number(result) as SeckillStockResult;
  }
}
