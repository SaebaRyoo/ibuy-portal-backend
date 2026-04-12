import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import Result from '../../../common/utils/Result';
import IDWorker from '../../../common/utils/IDWorker';
import { BusinessException } from '../../../common/filters/business.exception.filter';

@Injectable()
export class SeckillGoodsService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redisService: Redis,
  ) {}

  async add(data: {
    activityId: string;
    skuId: string;
    skuName: string;
    skuImage?: string;
    skuPrice: number;
    seckillPrice: number;
    stockCount: number;
  }): Promise<Result<any>> {
    // 校验秒杀价
    if (data.seckillPrice >= data.skuPrice) {
      throw new BusinessException('秒杀价必须低于原价');
    }

    // 校验活动存在
    const activity = await this.prisma.ibuySeckillActivity.findUnique({
      where: { id: data.activityId },
    });
    if (!activity) {
      throw new BusinessException('活动不存在');
    }

    // 检查重复
    const existing = await this.prisma.ibuySeckillGoods.findUnique({
      where: {
        activityId_skuId: {
          activityId: data.activityId,
          skuId: data.skuId,
        },
      },
    });
    if (existing) {
      throw new BusinessException('该商品已在本活动中');
    }

    const idWorker = new IDWorker(1n, 1n);
    const id = `NO.${idWorker.nextId()}`;

    const goods = await this.prisma.ibuySeckillGoods.create({
      data: {
        id,
        ...data,
      },
    });
    return new Result(goods);
  }

  async remove(id: string): Promise<Result<any>> {
    const goods = await this.prisma.ibuySeckillGoods.findUnique({
      where: { id },
    });
    if (!goods) {
      throw new BusinessException('秒杀商品不存在');
    }

    // 检查活动状态
    const activity = await this.prisma.ibuySeckillActivity.findUnique({
      where: { id: goods.activityId },
    });
    if (activity && activity.status === 3) {
      // PUBLISHED
      throw new BusinessException('已上架活动不允许修改商品');
    }

    await this.prisma.ibuySeckillGoods.delete({ where: { id } });
    return new Result(null);
  }

  async findByActivityId(activityId: string): Promise<Result<any[]>> {
    const data = await this.prisma.ibuySeckillGoods.findMany({
      where: { activityId },
    });
    return new Result(data);
  }

  /**
   * 库存预热：将活动下所有秒杀商品的库存加载到 Redis
   */
  async warmUp(activityId: string, endTime: Date): Promise<void> {
    const goods = await this.prisma.ibuySeckillGoods.findMany({
      where: { activityId },
    });

    const ttlSeconds = Math.ceil(
      (endTime.getTime() - Date.now()) / 1000 + 3600,
    ); // 活动结束 + 1 小时缓冲

    for (const item of goods) {
      const key = `seckill:stock:${item.id}`;
      await this.redisService.set(
        key,
        item.stockCount.toString(),
        'EX',
        ttlSeconds,
      );
    }
  }

  /**
   * 清理活动下所有秒杀商品的 Redis 库存
   */
  async clearStock(activityId: string): Promise<void> {
    const goods = await this.prisma.ibuySeckillGoods.findMany({
      where: { activityId },
    });

    for (const item of goods) {
      await this.redisService.del(`seckill:stock:${item.id}`);
    }
  }

  /**
   * 回补 Redis 库存
   */
  async restoreStock(goodsId: string, count: number): Promise<void> {
    const key = `seckill:stock:${goodsId}`;
    await this.redisService.incrby(key, count);
  }

  /**
   * 删除用户限购标记
   */
  async removeUserMark(activityId: string, username: string): Promise<void> {
    const key = `seckill:user:${activityId}:${username}`;
    await this.redisService.del(key);
  }

  /**
   * 扣减 DB 库存
   */
  async decrStockCount(goodsId: string, count: number): Promise<void> {
    const result = await this.prisma.$executeRaw`
      UPDATE ibuy_seckill_goods
      SET stock_count = stock_count - ${count}
      WHERE id = ${goodsId} AND stock_count >= ${count}
    `;
    if (result <= 0) {
      throw new BusinessException('库存不足');
    }
  }
}
