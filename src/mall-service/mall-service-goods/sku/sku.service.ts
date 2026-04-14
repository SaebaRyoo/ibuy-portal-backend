import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class SkuService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis()
    private readonly redisService: Redis,
  ) {}

  async findList(pageParma: any) {
    const skip = pageParma.pageSize * (pageParma.current - 1);
    const take = pageParma.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ibuySku.findMany({ skip, take }),
      this.prisma.ibuySku.count(),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.ibuySku.findUnique({ where: { id } });
  }

  async findBySpuId(spuId: string) {
    return this.prisma.ibuySku.findMany({ where: { spuId } });
  }

  async findTopBySaleNum(limit: number) {
    return this.prisma.ibuySku.findMany({
      where: { saleNum: { not: null } },
      orderBy: { saleNum: 'desc' },
      take: limit,
    });
  }

  async updateSku(id: string, sku: any) {
    return this.prisma.ibuySku.update({
      where: { id },
      data: sku,
    });
  }

  /**
   * 库存递减
   * @param username
   * @param tx  Prisma 事务客户端（可选）
   */
  async decrCount(username: string, tx?: any) {
    const db = tx ?? this.prisma;
    const redisClient = this.redisService;

    const cartKey = `Cart_${username}`;
    const orderItems = await redisClient.hvals(cartKey);

    for (const orderItem of orderItems) {
      const parsed = JSON.parse(orderItem);
      const num = parsed.num;
      const skuId = parsed.skuId;

      const affectedRows = await db.$executeRawUnsafe(
        `UPDATE ibuy_sku SET num=num-$1,sale_num=sale_num+$1 WHERE id=$2 AND num>=$1`,
        Number(num),
        String(skuId),
      );
      if (affectedRows <= 0) {
        throw new HttpException('库存不足，递减失败！', HttpStatus.BAD_REQUEST);
      }
    }
  }
}
