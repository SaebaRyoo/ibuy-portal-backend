import { Test, TestingModule } from '@nestjs/testing';
import { SeckillGoodsService } from './seckill-goods.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { BusinessException } from '../../../common/filters/business.exception.filter';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import Result from '../../../common/utils/Result';

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

const mockPrisma = {
  ibuySeckillActivity: {
    findUnique: jest.fn(),
  },
  ibuySeckillGoods: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  $executeRaw: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
  del: jest.fn(),
  incrby: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal seckill-goods payload for add() */
function buildAddDto(
  overrides: Partial<{
    activityId: string;
    skuId: string;
    skuName: string;
    skuImage: string;
    skuPrice: number;
    seckillPrice: number;
    stockCount: number;
  }> = {},
) {
  return {
    activityId: 'act-001',
    skuId: 'sku-001',
    skuName: 'Test SKU',
    skuImage: 'https://cdn.example.com/img.jpg',
    skuPrice: 100,
    seckillPrice: 80,
    stockCount: 50,
    ...overrides,
  };
}

/** Build a minimal activity record */
function buildActivity(
  overrides: Partial<{ id: string; status: number }> = {},
) {
  return { id: 'act-001', status: 1, ...overrides };
}

/** Build a minimal seckill-goods record */
function buildGoods(
  overrides: Partial<{
    id: string;
    activityId: string;
    skuId: string;
    stockCount: number;
  }> = {},
) {
  return {
    id: 'goods-001',
    activityId: 'act-001',
    skuId: 'sku-001',
    skuName: 'Test SKU',
    skuPrice: 100,
    seckillPrice: 80,
    stockCount: 50,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SeckillGoodsService', () => {
  let service: SeckillGoodsService;

  beforeEach(async () => {
    // Reset every mock before each test so state never leaks between cases
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeckillGoodsService,
        { provide: PrismaService, useValue: mockPrisma },
        // @InjectRedis() resolves to the token produced by getRedisConnectionToken()
        { provide: getRedisConnectionToken(), useValue: mockRedis },
      ],
    }).compile();

    service = module.get<SeckillGoodsService>(SeckillGoodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // add()
  // =========================================================================

  describe('add()', () => {
    it('should create and return goods when data is valid', async () => {
      const dto = buildAddDto(); // seckillPrice 80 < skuPrice 100 ✓
      const activity = buildActivity();
      const createdGoods = buildGoods();

      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValueOnce(activity);
      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValueOnce(null); // no duplicate
      mockPrisma.ibuySeckillGoods.create.mockResolvedValueOnce(createdGoods);

      const result = await service.add(dto);

      // Should return a Result wrapping the created goods
      expect(result).toBeInstanceOf(Result);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdGoods);

      // Prisma create should have been called with the correct shape
      expect(mockPrisma.ibuySeckillGoods.create).toHaveBeenCalledTimes(1);
      const createArg = mockPrisma.ibuySeckillGoods.create.mock.calls[0][0];
      expect(createArg.data).toMatchObject({
        activityId: dto.activityId,
        skuId: dto.skuId,
        skuName: dto.skuName,
        skuPrice: dto.skuPrice,
        seckillPrice: dto.seckillPrice,
        stockCount: dto.stockCount,
      });
      // ID must be prefixed with "NO."
      expect(createArg.data.id).toMatch(/^NO\./);
    });

    it('should throw BusinessException when seckillPrice equals skuPrice', async () => {
      const dto = buildAddDto({ skuPrice: 100, seckillPrice: 100 });

      const rejection = service.add(dto);
      await expect(rejection).rejects.toThrow(BusinessException);
      await expect(rejection).rejects.toThrow('秒杀价必须低于原价');

      // Validation must short-circuit before any DB call
      expect(mockPrisma.ibuySeckillActivity.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.ibuySeckillGoods.create).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when seckillPrice is greater than skuPrice', async () => {
      const dto = buildAddDto({ skuPrice: 100, seckillPrice: 120 });

      const rejection = service.add(dto);
      await expect(rejection).rejects.toThrow(BusinessException);
      await expect(rejection).rejects.toThrow('秒杀价必须低于原价');

      expect(mockPrisma.ibuySeckillActivity.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when activity does not exist', async () => {
      const dto = buildAddDto();
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValueOnce(null);

      const rejection = service.add(dto);
      await expect(rejection).rejects.toThrow(BusinessException);
      await expect(rejection).rejects.toThrow('活动不存在');

      expect(mockPrisma.ibuySeckillGoods.create).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when SKU is already registered in the same activity', async () => {
      const dto = buildAddDto();
      const activity = buildActivity();
      const existingGoods = buildGoods();

      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValueOnce(activity);
      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValueOnce(
        existingGoods,
      );

      // Capture the rejection once and assert both the type and the message
      const rejection = service.add(dto);
      await expect(rejection).rejects.toThrow(BusinessException);
      await expect(rejection).rejects.toThrow('该商品已在本活动中');

      expect(mockPrisma.ibuySeckillGoods.create).not.toHaveBeenCalled();
    });

    it('should query duplicate check with the correct composite key', async () => {
      const dto = buildAddDto({ activityId: 'act-xyz', skuId: 'sku-xyz' });
      const activity = buildActivity({ id: 'act-xyz' });

      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValueOnce(activity);
      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValueOnce(null);
      mockPrisma.ibuySeckillGoods.create.mockResolvedValueOnce(buildGoods());

      await service.add(dto);

      expect(mockPrisma.ibuySeckillGoods.findUnique).toHaveBeenCalledWith({
        where: {
          activityId_skuId: {
            activityId: 'act-xyz',
            skuId: 'sku-xyz',
          },
        },
      });
    });
  });

  // =========================================================================
  // remove()
  // =========================================================================

  describe('remove()', () => {
    it('should delete goods and return Result(null) when activity is not published', async () => {
      const goods = buildGoods({ id: 'goods-001' });
      const activity = buildActivity({ status: 1 }); // status 1 = not published

      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValueOnce(goods);
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValueOnce(activity);
      mockPrisma.ibuySeckillGoods.delete.mockResolvedValueOnce(goods);

      const result = await service.remove('goods-001');

      expect(result).toBeInstanceOf(Result);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockPrisma.ibuySeckillGoods.delete).toHaveBeenCalledWith({
        where: { id: 'goods-001' },
      });
    });

    it('should delete goods when activity status is 2 (not yet published)', async () => {
      const goods = buildGoods({ id: 'goods-002' });
      const activity = buildActivity({ status: 2 });

      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValueOnce(goods);
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValueOnce(activity);
      mockPrisma.ibuySeckillGoods.delete.mockResolvedValueOnce(goods);

      const result = await service.remove('goods-002');

      expect(result.success).toBe(true);
      expect(mockPrisma.ibuySeckillGoods.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw BusinessException when goods does not exist', async () => {
      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValueOnce(null);

      const rejection = service.remove('ghost-id');
      await expect(rejection).rejects.toThrow(BusinessException);
      await expect(rejection).rejects.toThrow('秒杀商品不存在');

      expect(mockPrisma.ibuySeckillGoods.delete).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when activity status is 3 (published)', async () => {
      const goods = buildGoods({ id: 'goods-003' });
      const publishedActivity = buildActivity({ status: 3 }); // PUBLISHED

      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValueOnce(goods);
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValueOnce(
        publishedActivity,
      );

      const rejection = service.remove('goods-003');
      await expect(rejection).rejects.toThrow(BusinessException);
      await expect(rejection).rejects.toThrow('已上架活动不允许修改商品');

      expect(mockPrisma.ibuySeckillGoods.delete).not.toHaveBeenCalled();
    });

    it('should still delete goods when activity record is missing (null)', async () => {
      // If activity lookup returns null we treat it as "not published" and allow deletion
      const goods = buildGoods({ id: 'goods-004' });

      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValueOnce(goods);
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValueOnce(null);
      mockPrisma.ibuySeckillGoods.delete.mockResolvedValueOnce(goods);

      const result = await service.remove('goods-004');

      expect(result.success).toBe(true);
      expect(mockPrisma.ibuySeckillGoods.delete).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // findByActivityId()
  // =========================================================================

  describe('findByActivityId()', () => {
    it('should return a Result wrapping the goods list for a given activityId', async () => {
      const goodsList = [
        buildGoods({ id: 'goods-001', skuId: 'sku-001' }),
        buildGoods({ id: 'goods-002', skuId: 'sku-002' }),
      ];
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce(goodsList);

      const result = await service.findByActivityId('act-001');

      expect(result).toBeInstanceOf(Result);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(goodsList);
      expect(mockPrisma.ibuySeckillGoods.findMany).toHaveBeenCalledWith({
        where: { activityId: 'act-001' },
      });
    });

    it('should return a Result with an empty array when no goods exist for the activity', async () => {
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce([]);

      const result = await service.findByActivityId('act-empty');

      expect(result).toBeInstanceOf(Result);
      expect(result.data).toEqual([]);
    });
  });

  // =========================================================================
  // warmUp()
  // =========================================================================

  describe('warmUp()', () => {
    it('should set Redis stock key with correct value and TTL for each goods item', async () => {
      const goods1 = buildGoods({ id: 'goods-001', stockCount: 100 });
      const goods2 = buildGoods({ id: 'goods-002', stockCount: 200 });
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce([
        goods1,
        goods2,
      ]);
      mockRedis.set.mockResolvedValue('OK');

      // Activity ends 2 hours from now
      const endTime = new Date(Date.now() + 2 * 3600 * 1000);

      await service.warmUp('act-001', endTime);

      expect(mockRedis.set).toHaveBeenCalledTimes(2);

      // Verify key names and stock values
      const calls = mockRedis.set.mock.calls;
      const keyForGoods1 = `seckill:stock:${goods1.id}`;
      const keyForGoods2 = `seckill:stock:${goods2.id}`;

      const callMap = Object.fromEntries(calls.map((c) => [c[0], c]));
      expect(callMap[keyForGoods1][1]).toBe('100');
      expect(callMap[keyForGoods2][1]).toBe('200');

      // EX flag must be the 3rd argument
      expect(callMap[keyForGoods1][2]).toBe('EX');
      expect(callMap[keyForGoods2][2]).toBe('EX');
    });

    it('should set TTL = ceil((endTime - now) / 1000) + 3600 seconds', async () => {
      const goods = buildGoods({ id: 'goods-ttl', stockCount: 10 });
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce([goods]);
      mockRedis.set.mockResolvedValue('OK');

      const nowMs = Date.now();
      // Fix Date.now() to get a deterministic TTL
      const fixedNow = nowMs;
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const endTime = new Date(fixedNow + 5000); // 5 seconds from now
      await service.warmUp('act-001', endTime);

      const expectedTtl = Math.ceil(5000 / 1000 + 3600); // 3605
      const ttlArg = mockRedis.set.mock.calls[0][3] as number;
      expect(ttlArg).toBe(expectedTtl);

      jest.restoreAllMocks();
    });

    it('should not call Redis when the activity has no goods', async () => {
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce([]);

      await service.warmUp('act-empty', new Date(Date.now() + 3600 * 1000));

      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should use the correct key pattern seckill:stock:{id}', async () => {
      const goods = buildGoods({ id: 'unique-goods-id', stockCount: 30 });
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce([goods]);
      mockRedis.set.mockResolvedValue('OK');

      await service.warmUp('act-001', new Date(Date.now() + 3600 * 1000));

      const [key] = mockRedis.set.mock.calls[0];
      expect(key).toBe('seckill:stock:unique-goods-id');
    });
  });

  // =========================================================================
  // clearStock()
  // =========================================================================

  describe('clearStock()', () => {
    it('should delete the Redis stock key for each goods item', async () => {
      const goods1 = buildGoods({ id: 'goods-001' });
      const goods2 = buildGoods({ id: 'goods-002' });
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce([
        goods1,
        goods2,
      ]);
      mockRedis.del.mockResolvedValue(1);

      await service.clearStock('act-001');

      expect(mockRedis.del).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith('seckill:stock:goods-001');
      expect(mockRedis.del).toHaveBeenCalledWith('seckill:stock:goods-002');
    });

    it('should query goods by activityId before deleting keys', async () => {
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce([]);

      await service.clearStock('act-xyz');

      expect(mockPrisma.ibuySeckillGoods.findMany).toHaveBeenCalledWith({
        where: { activityId: 'act-xyz' },
      });
    });

    it('should not call Redis del when there are no goods for the activity', async () => {
      mockPrisma.ibuySeckillGoods.findMany.mockResolvedValueOnce([]);

      await service.clearStock('act-empty');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // restoreStock()
  // =========================================================================

  describe('restoreStock()', () => {
    it('should call Redis INCRBY with the correct key and count', async () => {
      mockRedis.incrby.mockResolvedValue(15);

      await service.restoreStock('goods-001', 5);

      expect(mockRedis.incrby).toHaveBeenCalledTimes(1);
      expect(mockRedis.incrby).toHaveBeenCalledWith(
        'seckill:stock:goods-001',
        5,
      );
    });

    it('should use the correct key pattern seckill:stock:{goodsId}', async () => {
      mockRedis.incrby.mockResolvedValue(10);

      await service.restoreStock('special-goods-id', 3);

      const [key] = mockRedis.incrby.mock.calls[0];
      expect(key).toBe('seckill:stock:special-goods-id');
    });

    it('should pass the exact count to INCRBY', async () => {
      mockRedis.incrby.mockResolvedValue(100);

      await service.restoreStock('goods-002', 42);

      const [, count] = mockRedis.incrby.mock.calls[0];
      expect(count).toBe(42);
    });
  });

  // =========================================================================
  // removeUserMark()
  // =========================================================================

  describe('removeUserMark()', () => {
    it('should delete the correct user-mark key from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.removeUserMark('act-001', 'alice');

      expect(mockRedis.del).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith('seckill:user:act-001:alice');
    });

    it('should use the key pattern seckill:user:{activityId}:{username}', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.removeUserMark('activity-42', 'bob@example.com');

      const [key] = mockRedis.del.mock.calls[0];
      expect(key).toBe('seckill:user:activity-42:bob@example.com');
    });
  });

  // =========================================================================
  // decrStockCount()
  // =========================================================================

  describe('decrStockCount()', () => {
    it('should execute a raw SQL update and resolve when rows are affected', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1); // 1 row affected

      await expect(
        service.decrStockCount('goods-001', 2),
      ).resolves.toBeUndefined();
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw BusinessException("库存不足") when no rows are affected (result <= 0)', async () => {
      // mockResolvedValue (not Once) so both assertion calls see the same return
      mockPrisma.$executeRaw.mockResolvedValue(0);

      const rejection = service.decrStockCount('goods-001', 999);
      await expect(rejection).rejects.toThrow(BusinessException);
      await expect(rejection).rejects.toThrow('库存不足');
    });

    it('should throw BusinessException when result is negative', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(-1);

      await expect(service.decrStockCount('goods-001', 1)).rejects.toThrow(
        '库存不足',
      );
    });
  });
});
