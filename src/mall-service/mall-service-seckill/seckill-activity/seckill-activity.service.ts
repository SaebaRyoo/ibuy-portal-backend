import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import IDWorker from '../../../common/utils/IDWorker';
import { BusinessException } from '../../../common/filters/business.exception.filter';
import { SeckillGoodsService } from '../seckill-goods/seckill-goods.service';

// 活动状态
export enum ActivityStatus {
  PENDING = 0, // 未审核
  APPROVED = 1, // 已审核
  REJECTED = 2, // 已驳回
  PUBLISHED = 3, // 已上架
  UNPUBLISHED = 4, // 已下架
}

@Injectable()
export class SeckillActivityService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redisService: Redis,
    private readonly seckillGoodsService: SeckillGoodsService,
  ) {}

  async create(data: {
    name: string;
    startTime: Date;
    endTime: Date;
    intro?: string;
  }): Promise<any> {
    if (data.startTime >= data.endTime) {
      throw new BusinessException('开始时间必须早于结束时间');
    }

    const idWorker = new IDWorker(1n, 1n);
    const id = `NO.${idWorker.nextId()}`;

    const activity = await this.prisma.ibuySeckillActivity.create({
      data: {
        id,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        intro: data.intro,
        status: ActivityStatus.PENDING,
      },
    });
    return activity;
  }

  async update(
    id: string,
    data: { name?: string; startTime?: Date; endTime?: Date; intro?: string },
  ): Promise<any> {
    const activity = await this.prisma.ibuySeckillActivity.findUnique({
      where: { id },
    });
    if (!activity) {
      throw new BusinessException('活动不存在');
    }

    if (
      activity.status !== ActivityStatus.PENDING &&
      activity.status !== ActivityStatus.REJECTED
    ) {
      throw new BusinessException('当前状态不允许编辑');
    }

    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      throw new BusinessException('开始时间必须早于结束时间');
    }

    const updated = await this.prisma.ibuySeckillActivity.update({
      where: { id },
      data,
    });
    return updated;
  }

  async audit(id: string, approved: boolean): Promise<any> {
    const activity = await this.prisma.ibuySeckillActivity.findUnique({
      where: { id },
    });
    if (!activity) {
      throw new BusinessException('活动不存在');
    }

    if (activity.status !== ActivityStatus.PENDING) {
      throw new BusinessException('只有未审核状态的活动才能审核');
    }

    const updated = await this.prisma.ibuySeckillActivity.update({
      where: { id },
      data: {
        status: approved ? ActivityStatus.APPROVED : ActivityStatus.REJECTED,
      },
    });
    return updated;
  }

  async publish(id: string): Promise<any> {
    const activity = await this.prisma.ibuySeckillActivity.findUnique({
      where: { id },
    });
    if (!activity) {
      throw new BusinessException('活动不存在');
    }

    if (activity.status !== ActivityStatus.APPROVED) {
      throw new BusinessException('只有已审核状态的活动才能上架');
    }

    const updated = await this.prisma.ibuySeckillActivity.update({
      where: { id },
      data: { status: ActivityStatus.PUBLISHED },
    });

    // 触发库存预热
    await this.seckillGoodsService.warmUp(id, activity.endTime);

    return updated;
  }

  async unpublish(id: string): Promise<any> {
    const activity = await this.prisma.ibuySeckillActivity.findUnique({
      where: { id },
    });
    if (!activity) {
      throw new BusinessException('活动不存在');
    }

    if (activity.status !== ActivityStatus.PUBLISHED) {
      throw new BusinessException('只有已上架状态的活动才能下架');
    }

    const updated = await this.prisma.ibuySeckillActivity.update({
      where: { id },
      data: { status: ActivityStatus.UNPUBLISHED },
    });

    // 清理 Redis 库存
    await this.seckillGoodsService.clearStock(id);

    return updated;
  }

  async findAll(pageParam: {
    current: number;
    pageSize: number;
    status?: number;
  }): Promise<{ items: any[]; total: number }> {
    const where: any = {};
    if (pageParam.status !== undefined && pageParam.status !== null) {
      where.status = pageParam.status;
    }

    const skip = pageParam.pageSize * (pageParam.current - 1);
    const take = pageParam.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.ibuySeckillActivity.findMany({
        where,
        skip,
        take,
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.ibuySeckillActivity.count({ where }),
    ]);
    return { items, total };
  }

  async findActive(): Promise<any[]> {
    const now = new Date();
    const activities = await this.prisma.ibuySeckillActivity.findMany({
      where: {
        status: ActivityStatus.PUBLISHED,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      orderBy: { startTime: 'desc' },
    });
    return activities;
  }

  async findById(id: string): Promise<any> {
    const activity = await this.prisma.ibuySeckillActivity.findUnique({
      where: { id },
    });
    return activity;
  }
}
