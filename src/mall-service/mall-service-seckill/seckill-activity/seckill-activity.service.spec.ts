import { Test, TestingModule } from '@nestjs/testing';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import {
  SeckillActivityService,
  ActivityStatus,
} from './seckill-activity.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SeckillGoodsService } from '../seckill-goods/seckill-goods.service';
import { BusinessException } from '../../../common/filters/business.exception.filter';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  ibuySeckillActivity: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockRedis = {};

const mockSeckillGoodsService = {
  warmUp: jest.fn(),
  clearStock: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 构造一个活动对象，status 默认为 PENDING */
function buildActivity(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'NO.1001',
    name: '双11秒杀活动',
    startTime: new Date('2026-11-11T00:00:00.000Z'),
    endTime: new Date('2026-11-11T23:59:59.000Z'),
    intro: '活动简介',
    status: ActivityStatus.PENDING,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('SeckillActivityService', () => {
  let service: SeckillActivityService;

  beforeEach(async () => {
    // 每个测试前重置所有 mock 调用记录
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeckillActivityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getRedisConnectionToken(), useValue: mockRedis },
        { provide: SeckillGoodsService, useValue: mockSeckillGoodsService },
      ],
    }).compile();

    service = module.get<SeckillActivityService>(SeckillActivityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // create()
  // =========================================================================

  describe('create()', () => {
    const validData = {
      name: '双11秒杀',
      startTime: new Date('2026-11-11T00:00:00.000Z'),
      endTime: new Date('2026-11-11T23:59:59.000Z'),
      intro: '全场五折',
    };

    it('should create an activity and return the new record', async () => {
      const created = buildActivity({ name: validData.name });
      mockPrisma.ibuySeckillActivity.create.mockResolvedValue(created);

      const result = await service.create(validData);

      expect(result).toBeDefined();
      expect(result).toEqual(created);
      expect(mockPrisma.ibuySeckillActivity.create).toHaveBeenCalledTimes(1);

      // 确认写入时 status 为 PENDING
      const callArg = mockPrisma.ibuySeckillActivity.create.mock.calls[0][0];
      expect(callArg.data.status).toBe(ActivityStatus.PENDING);
      expect(callArg.data.name).toBe(validData.name);
      expect(callArg.data.startTime).toBe(validData.startTime);
      expect(callArg.data.endTime).toBe(validData.endTime);
    });

    it('should set status to PENDING (0) for newly created activity', async () => {
      mockPrisma.ibuySeckillActivity.create.mockResolvedValue(
        buildActivity({ status: ActivityStatus.PENDING }),
      );

      await service.create(validData);

      const callArg = mockPrisma.ibuySeckillActivity.create.mock.calls[0][0];
      expect(callArg.data.status).toBe(0);
    });

    it('should create activity without optional intro field', async () => {
      const dataWithoutIntro = {
        name: '无简介活动',
        startTime: new Date('2026-11-11T00:00:00.000Z'),
        endTime: new Date('2026-11-11T23:59:59.000Z'),
      };
      mockPrisma.ibuySeckillActivity.create.mockResolvedValue(
        buildActivity({ name: '无简介活动', intro: undefined }),
      );

      const result = await service.create(dataWithoutIntro);

      expect(result).toBeDefined();
      expect(mockPrisma.ibuySeckillActivity.create).toHaveBeenCalledTimes(1);
    });

    it('should throw BusinessException when startTime equals endTime', async () => {
      const sameTime = new Date('2026-11-11T12:00:00.000Z');

      await expect(
        service.create({
          ...validData,
          startTime: sameTime,
          endTime: sameTime,
        }),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.create({
          ...validData,
          startTime: sameTime,
          endTime: sameTime,
        }),
      ).rejects.toThrow('开始时间必须早于结束时间');

      // 数据库不应被访问
      expect(mockPrisma.ibuySeckillActivity.create).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when startTime is after endTime', async () => {
      const start = new Date('2026-11-11T23:00:00.000Z');
      const end = new Date('2026-11-11T10:00:00.000Z'); // end 早于 start

      await expect(
        service.create({ ...validData, startTime: start, endTime: end }),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.create({ ...validData, startTime: start, endTime: end }),
      ).rejects.toThrow('开始时间必须早于结束时间');

      expect(mockPrisma.ibuySeckillActivity.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // update()
  // =========================================================================

  describe('update()', () => {
    const activityId = 'NO.1001';
    const updateData = { name: '更新后的活动名称' };

    it('should update activity when status is PENDING (0)', async () => {
      const existing = buildActivity({ status: ActivityStatus.PENDING });
      const updated = buildActivity({
        ...updateData,
        status: ActivityStatus.PENDING,
      });
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(existing);
      mockPrisma.ibuySeckillActivity.update.mockResolvedValue(updated);

      const result = await service.update(activityId, updateData);

      expect(result).toBeDefined();
      expect(result).toEqual(updated);
      expect(mockPrisma.ibuySeckillActivity.update).toHaveBeenCalledWith({
        where: { id: activityId },
        data: updateData,
      });
    });

    it('should update activity when status is REJECTED (2)', async () => {
      const existing = buildActivity({ status: ActivityStatus.REJECTED });
      const updated = buildActivity({
        ...updateData,
        status: ActivityStatus.REJECTED,
      });
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(existing);
      mockPrisma.ibuySeckillActivity.update.mockResolvedValue(updated);

      const result = await service.update(activityId, updateData);

      expect(result).toBeDefined();
      expect(mockPrisma.ibuySeckillActivity.update).toHaveBeenCalledTimes(1);
    });

    it('should throw BusinessException when activity is not found', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(null);

      await expect(service.update(activityId, updateData)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.update(activityId, updateData)).rejects.toThrow(
        '活动不存在',
      );

      expect(mockPrisma.ibuySeckillActivity.update).not.toHaveBeenCalled();
    });

    it('should throw BusinessException "当前状态不允许编辑" when status is PUBLISHED (3)', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.PUBLISHED }),
      );

      await expect(service.update(activityId, updateData)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.update(activityId, updateData)).rejects.toThrow(
        '当前状态不允许编辑',
      );

      expect(mockPrisma.ibuySeckillActivity.update).not.toHaveBeenCalled();
    });

    it('should throw BusinessException "当前状态不允许编辑" when status is APPROVED (1)', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.APPROVED }),
      );

      await expect(service.update(activityId, updateData)).rejects.toThrow(
        '当前状态不允许编辑',
      );
    });

    it('should throw BusinessException "当前状态不允许编辑" when status is UNPUBLISHED (4)', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.UNPUBLISHED }),
      );

      await expect(service.update(activityId, updateData)).rejects.toThrow(
        '当前状态不允许编辑',
      );
    });

    it('should throw BusinessException when both startTime and endTime provided but startTime >= endTime', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.PENDING }),
      );

      const sameTime = new Date('2026-12-01T10:00:00.000Z');
      await expect(
        service.update(activityId, { startTime: sameTime, endTime: sameTime }),
      ).rejects.toThrow('开始时间必须早于结束时间');

      expect(mockPrisma.ibuySeckillActivity.update).not.toHaveBeenCalled();
    });

    it('should not validate times when only startTime is provided (no endTime)', async () => {
      const existing = buildActivity({ status: ActivityStatus.PENDING });
      const updated = buildActivity();
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(existing);
      mockPrisma.ibuySeckillActivity.update.mockResolvedValue(updated);

      // 只传 startTime，无法比较，不应抛出
      const result = await service.update(activityId, {
        startTime: new Date('2026-11-11T08:00:00.000Z'),
      });

      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // audit()
  // =========================================================================

  describe('audit()', () => {
    const activityId = 'NO.1001';

    it('should approve (status → APPROVED) when approved=true', async () => {
      const pending = buildActivity({ status: ActivityStatus.PENDING });
      const approved = buildActivity({ status: ActivityStatus.APPROVED });
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(pending);
      mockPrisma.ibuySeckillActivity.update.mockResolvedValue(approved);

      const result = await service.audit(activityId, true);

      expect(result).toBeDefined();
      expect(result.status).toBe(ActivityStatus.APPROVED);
      expect(mockPrisma.ibuySeckillActivity.update).toHaveBeenCalledWith({
        where: { id: activityId },
        data: { status: ActivityStatus.APPROVED },
      });
    });

    it('should reject (status → REJECTED) when approved=false', async () => {
      const pending = buildActivity({ status: ActivityStatus.PENDING });
      const rejected = buildActivity({ status: ActivityStatus.REJECTED });
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(pending);
      mockPrisma.ibuySeckillActivity.update.mockResolvedValue(rejected);

      const result = await service.audit(activityId, false);

      expect(result).toBeDefined();
      expect(result.status).toBe(ActivityStatus.REJECTED);
      expect(mockPrisma.ibuySeckillActivity.update).toHaveBeenCalledWith({
        where: { id: activityId },
        data: { status: ActivityStatus.REJECTED },
      });
    });

    it('should throw BusinessException when activity is not found', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(null);

      await expect(service.audit(activityId, true)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.audit(activityId, true)).rejects.toThrow(
        '活动不存在',
      );
    });

    it('should throw BusinessException when activity is already APPROVED (not PENDING)', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.APPROVED }),
      );

      await expect(service.audit(activityId, true)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.audit(activityId, true)).rejects.toThrow(
        '只有未审核状态的活动才能审核',
      );

      expect(mockPrisma.ibuySeckillActivity.update).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when activity is REJECTED (not PENDING)', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.REJECTED }),
      );

      await expect(service.audit(activityId, false)).rejects.toThrow(
        '只有未审核状态的活动才能审核',
      );
    });

    it('should throw BusinessException when activity is PUBLISHED (not PENDING)', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.PUBLISHED }),
      );

      await expect(service.audit(activityId, true)).rejects.toThrow(
        '只有未审核状态的活动才能审核',
      );
    });
  });

  // =========================================================================
  // publish()
  // =========================================================================

  describe('publish()', () => {
    const activityId = 'NO.1001';

    it('should publish activity (status → PUBLISHED) and call seckillGoodsService.warmUp', async () => {
      const endTime = new Date('2026-11-11T23:59:59.000Z');
      const approved = buildActivity({
        status: ActivityStatus.APPROVED,
        endTime,
      });
      const published = buildActivity({
        status: ActivityStatus.PUBLISHED,
        endTime,
      });
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(approved);
      mockPrisma.ibuySeckillActivity.update.mockResolvedValue(published);
      mockSeckillGoodsService.warmUp.mockResolvedValue(undefined);

      const result = await service.publish(activityId);

      expect(result).toBeDefined();
      expect(result.status).toBe(ActivityStatus.PUBLISHED);
      expect(mockPrisma.ibuySeckillActivity.update).toHaveBeenCalledWith({
        where: { id: activityId },
        data: { status: ActivityStatus.PUBLISHED },
      });
      // 必须触发库存预热
      expect(mockSeckillGoodsService.warmUp).toHaveBeenCalledTimes(1);
      expect(mockSeckillGoodsService.warmUp).toHaveBeenCalledWith(
        activityId,
        endTime,
      );
    });

    it('should throw BusinessException when activity is not found', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(null);

      await expect(service.publish(activityId)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.publish(activityId)).rejects.toThrow('活动不存在');

      expect(mockSeckillGoodsService.warmUp).not.toHaveBeenCalled();
    });

    it('should throw BusinessException "只有已审核状态的活动才能上架" when status is PENDING', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.PENDING }),
      );

      await expect(service.publish(activityId)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.publish(activityId)).rejects.toThrow(
        '只有已审核状态的活动才能上架',
      );

      expect(mockPrisma.ibuySeckillActivity.update).not.toHaveBeenCalled();
      expect(mockSeckillGoodsService.warmUp).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when status is PUBLISHED (already published)', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.PUBLISHED }),
      );

      await expect(service.publish(activityId)).rejects.toThrow(
        '只有已审核状态的活动才能上架',
      );
    });

    it('should throw BusinessException when status is REJECTED', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.REJECTED }),
      );

      await expect(service.publish(activityId)).rejects.toThrow(
        '只有已审核状态的活动才能上架',
      );
    });

    it('should not call warmUp when publish fails due to wrong status', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.UNPUBLISHED }),
      );

      await expect(service.publish(activityId)).rejects.toThrow(
        BusinessException,
      );

      expect(mockSeckillGoodsService.warmUp).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // unpublish()
  // =========================================================================

  describe('unpublish()', () => {
    const activityId = 'NO.1001';

    it('should unpublish activity (status → UNPUBLISHED) and call seckillGoodsService.clearStock', async () => {
      const published = buildActivity({ status: ActivityStatus.PUBLISHED });
      const unpublished = buildActivity({ status: ActivityStatus.UNPUBLISHED });
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(published);
      mockPrisma.ibuySeckillActivity.update.mockResolvedValue(unpublished);
      mockSeckillGoodsService.clearStock.mockResolvedValue(undefined);

      const result = await service.unpublish(activityId);

      expect(result).toBeDefined();
      expect(result.status).toBe(ActivityStatus.UNPUBLISHED);
      expect(mockPrisma.ibuySeckillActivity.update).toHaveBeenCalledWith({
        where: { id: activityId },
        data: { status: ActivityStatus.UNPUBLISHED },
      });
      // 必须清理 Redis 库存
      expect(mockSeckillGoodsService.clearStock).toHaveBeenCalledTimes(1);
      expect(mockSeckillGoodsService.clearStock).toHaveBeenCalledWith(
        activityId,
      );
    });

    it('should throw BusinessException when activity is not found', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(null);

      await expect(service.unpublish(activityId)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.unpublish(activityId)).rejects.toThrow('活动不存在');

      expect(mockSeckillGoodsService.clearStock).not.toHaveBeenCalled();
    });

    it('should throw BusinessException "只有已上架状态的活动才能下架" when status is PENDING', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.PENDING }),
      );

      await expect(service.unpublish(activityId)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.unpublish(activityId)).rejects.toThrow(
        '只有已上架状态的活动才能下架',
      );

      expect(mockPrisma.ibuySeckillActivity.update).not.toHaveBeenCalled();
      expect(mockSeckillGoodsService.clearStock).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when status is APPROVED (not published yet)', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.APPROVED }),
      );

      await expect(service.unpublish(activityId)).rejects.toThrow(
        '只有已上架状态的活动才能下架',
      );
    });

    it('should throw BusinessException when status is already UNPUBLISHED', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.UNPUBLISHED }),
      );

      await expect(service.unpublish(activityId)).rejects.toThrow(
        '只有已上架状态的活动才能下架',
      );
    });

    it('should not call clearStock when unpublish fails due to wrong status', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(
        buildActivity({ status: ActivityStatus.REJECTED }),
      );

      await expect(service.unpublish(activityId)).rejects.toThrow(
        BusinessException,
      );

      expect(mockSeckillGoodsService.clearStock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // findAll()
  // =========================================================================

  describe('findAll()', () => {
    it('should return paginated results without status filter', async () => {
      const activities = [buildActivity(), buildActivity({ id: 'NO.1002' })];
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue(activities);
      mockPrisma.ibuySeckillActivity.count.mockResolvedValue(2);

      const result = await service.findAll({ current: 1, pageSize: 10 });

      expect(result).toBeDefined();
      expect(result.items).toEqual(activities);
      expect(result.total).toBe(2);

      // 验证 skip/take 计算正确：(current-1) * pageSize
      expect(mockPrisma.ibuySeckillActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should apply status filter when status is provided', async () => {
      const published = [buildActivity({ status: ActivityStatus.PUBLISHED })];
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue(published);
      mockPrisma.ibuySeckillActivity.count.mockResolvedValue(1);

      const result = await service.findAll({
        current: 1,
        pageSize: 5,
        status: ActivityStatus.PUBLISHED,
      });

      expect(result.items).toEqual(published);
      expect(result.total).toBe(1);

      // where 中必须有 status 过滤
      expect(mockPrisma.ibuySeckillActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ActivityStatus.PUBLISHED },
        }),
      );
      expect(mockPrisma.ibuySeckillActivity.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ActivityStatus.PUBLISHED },
        }),
      );
    });

    it('should not apply status filter when status is undefined', async () => {
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue([]);
      mockPrisma.ibuySeckillActivity.count.mockResolvedValue(0);

      await service.findAll({ current: 1, pageSize: 10, status: undefined });

      expect(mockPrisma.ibuySeckillActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should not apply status filter when status is null', async () => {
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue([]);
      mockPrisma.ibuySeckillActivity.count.mockResolvedValue(0);

      await service.findAll({ current: 1, pageSize: 10, status: null as any });

      expect(mockPrisma.ibuySeckillActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should calculate skip correctly for page 2', async () => {
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue([]);
      mockPrisma.ibuySeckillActivity.count.mockResolvedValue(20);

      await service.findAll({ current: 2, pageSize: 5 });

      // skip = pageSize * (current - 1) = 5 * 1 = 5
      expect(mockPrisma.ibuySeckillActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should order results by startTime desc', async () => {
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue([]);
      mockPrisma.ibuySeckillActivity.count.mockResolvedValue(0);

      await service.findAll({ current: 1, pageSize: 10 });

      expect(mockPrisma.ibuySeckillActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { startTime: 'desc' } }),
      );
    });

    it('should return empty items array when no activities match', async () => {
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue([]);
      mockPrisma.ibuySeckillActivity.count.mockResolvedValue(0);

      const result = await service.findAll({
        current: 1,
        pageSize: 10,
        status: 99,
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // =========================================================================
  // findActive()
  // =========================================================================

  describe('findActive()', () => {
    it('should return activities where status is PUBLISHED and now is between startTime and endTime', async () => {
      const activeActivities = [
        buildActivity({ status: ActivityStatus.PUBLISHED }),
        buildActivity({ id: 'NO.1002', status: ActivityStatus.PUBLISHED }),
      ];
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue(
        activeActivities,
      );

      const result = await service.findActive();

      expect(result).toBeDefined();
      expect(result).toEqual(activeActivities);

      const callArg = mockPrisma.ibuySeckillActivity.findMany.mock.calls[0][0];
      // 必须过滤 status = PUBLISHED
      expect(callArg.where.status).toBe(ActivityStatus.PUBLISHED);
      // 必须有 startTime lte now
      expect(callArg.where.startTime).toHaveProperty('lte');
      // 必须有 endTime gte now
      expect(callArg.where.endTime).toHaveProperty('gte');
      // lte/gte 的值应为 Date 对象
      expect(callArg.where.startTime.lte).toBeInstanceOf(Date);
      expect(callArg.where.endTime.gte).toBeInstanceOf(Date);
    });

    it('should use a Date close to now for the time boundary query', async () => {
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue([]);

      const before = new Date();
      await service.findActive();
      const after = new Date();

      const callArg = mockPrisma.ibuySeckillActivity.findMany.mock.calls[0][0];
      const usedNow: Date = callArg.where.startTime.lte;

      // 查询中用到的 now 应处于 before 和 after 之间（容忍少量时钟误差）
      expect(usedNow.getTime()).toBeGreaterThanOrEqual(before.getTime() - 10);
      expect(usedNow.getTime()).toBeLessThanOrEqual(after.getTime() + 10);
    });

    it('should order active activities by startTime desc', async () => {
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue([]);

      await service.findActive();

      expect(mockPrisma.ibuySeckillActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { startTime: 'desc' } }),
      );
    });

    it('should return empty array when no active activities exist', async () => {
      mockPrisma.ibuySeckillActivity.findMany.mockResolvedValue([]);

      const result = await service.findActive();

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // findById()
  // =========================================================================

  describe('findById()', () => {
    const activityId = 'NO.1001';

    it('should return the activity when found', async () => {
      const activity = buildActivity();
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(activity);

      const result = await service.findById(activityId);

      expect(result).toBeDefined();
      expect(result).toEqual(activity);
      expect(mockPrisma.ibuySeckillActivity.findUnique).toHaveBeenCalledWith({
        where: { id: activityId },
      });
    });

    it('should return null when activity does not exist', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(null);

      const result = await service.findById('NON_EXISTENT_ID');

      expect(result).toBeNull();
    });
  });
});
