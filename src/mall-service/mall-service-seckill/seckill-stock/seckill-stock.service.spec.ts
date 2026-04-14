import { Test, TestingModule } from '@nestjs/testing';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import * as fs from 'fs';
import {
  SeckillStockService,
  SeckillStockResult,
} from './seckill-stock.service';

// Mock fs so the constructor's readFileSync call does not hit the real filesystem
jest.mock('fs');

const DUMMY_LUA = 'return 1'; // arbitrary lua script content

describe('SeckillStockService', () => {
  let service: SeckillStockService;
  let mockRedis: { eval: jest.Mock };

  beforeEach(async () => {
    // Stub readFileSync before the module (and therefore the constructor) runs
    (fs.readFileSync as jest.Mock).mockReturnValue(DUMMY_LUA);

    mockRedis = { eval: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeckillStockService,
        {
          provide: getRedisConnectionToken(),
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<SeckillStockService>(SeckillStockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── decrStock return values ───────────────────────────────────────────────

  describe('decrStock', () => {
    const GOODS_ID = 'goods-001';
    const ACTIVITY_ID = 'activity-001';
    const USERNAME = 'testuser';

    it('should return SUCCESS (1) when Redis eval returns 1', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const result = await service.decrStock(GOODS_ID, ACTIVITY_ID, USERNAME);

      expect(result).toBe(SeckillStockResult.SUCCESS);
      expect(result).toBe(1);
    });

    it('should return OUT_OF_STOCK (0) when Redis eval returns 0', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const result = await service.decrStock(GOODS_ID, ACTIVITY_ID, USERNAME);

      expect(result).toBe(SeckillStockResult.OUT_OF_STOCK);
      expect(result).toBe(0);
    });

    it('should return ALREADY_PURCHASED (-1) when Redis eval returns -1', async () => {
      mockRedis.eval.mockResolvedValue(-1);

      const result = await service.decrStock(GOODS_ID, ACTIVITY_ID, USERNAME);

      expect(result).toBe(SeckillStockResult.ALREADY_PURCHASED);
      expect(result).toBe(-1);
    });

    // ─── KEYS and ARGV correctness ─────────────────────────────────────────

    it('should pass the correct KEYS and ARGV to Redis eval', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const count = 1;
      const ttlSeconds = 7200;
      await service.decrStock(
        GOODS_ID,
        ACTIVITY_ID,
        USERNAME,
        count,
        ttlSeconds,
      );

      // eval(script, numkeys, key1, key2, arg1, arg2)
      expect(mockRedis.eval).toHaveBeenCalledWith(
        DUMMY_LUA, // lua script loaded by constructor
        2, // number of KEYS
        `seckill:stock:${GOODS_ID}`, // KEYS[1]
        `seckill:user:${ACTIVITY_ID}:${USERNAME}`, // KEYS[2]
        count.toString(), // ARGV[1]
        ttlSeconds.toString(), // ARGV[2]
      );
    });

    it('should build key names from goodsId and activityId/username correctly with default args', async () => {
      mockRedis.eval.mockResolvedValue(1);

      await service.decrStock(GOODS_ID, ACTIVITY_ID, USERNAME);

      const [, , stockKey, userKey, countArg, ttlArg] =
        mockRedis.eval.mock.calls[0];

      expect(stockKey).toBe(`seckill:stock:${GOODS_ID}`);
      expect(userKey).toBe(`seckill:user:${ACTIVITY_ID}:${USERNAME}`);
      // default count = 1, default ttlSeconds = 3600
      expect(countArg).toBe('1');
      expect(ttlArg).toBe('3600');
    });

    it('should load the lua script from disk exactly once (in constructor)', () => {
      // readFileSync was called during module initialisation; additional calls to
      // decrStock should NOT trigger another file read.
      const callsBefore = (fs.readFileSync as jest.Mock).mock.calls.length;

      mockRedis.eval.mockResolvedValue(1);
      void service.decrStock(GOODS_ID, ACTIVITY_ID, USERNAME);

      expect((fs.readFileSync as jest.Mock).mock.calls.length).toBe(
        callsBefore,
      );
    });
  });
});
