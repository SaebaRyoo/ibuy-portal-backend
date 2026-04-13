// ─── Module-level mocks ────────────────────────────────────────────────────────
// These must be declared before any imports so Jest hoists them to the top of
// the file. They prevent transitive Prisma / fs imports from executing during
// test collection.

// Stops the PrismaService → PrismaClient import chain (unresolvable in tests)
jest.mock('../../../common/prisma/prisma.service');
// Stops seckill-stock from reading the .lua file off disk
jest.mock('../seckill-stock/seckill-stock.service');
// Stops AuthService from pulling in its own deep dependency tree
jest.mock('../../mall-service-system/auth/auth.service');

import { Test, TestingModule } from '@nestjs/testing';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SeckillOrderService } from './seckill-order.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  SeckillStockService,
  SeckillStockResult,
} from '../seckill-stock/seckill-stock.service';
import { AuthService } from '../../mall-service-system/auth/auth.service';
import { BusinessException } from '../../../common/filters/business.exception.filter';
import { RabbitMQConstants } from '../../../common/constants/RabbitMQConstants';

// ─── Shared mock factories ─────────────────────────────────────────────────────

const makeMockPrisma = () => ({
  ibuySeckillActivity: { findUnique: jest.fn() },
  ibuySeckillGoods: { findUnique: jest.fn() },
  ibuySeckillOrder: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $executeRaw: jest.fn(),
});

const makeMockRedis = () => ({ incrby: jest.fn(), del: jest.fn() });
const makeMockAmqp = () => ({ publish: jest.fn() });
const makeMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
});
const makeMockSeckillStockService = () => ({ decrStock: jest.fn() });
const makeMockAuthService = () => ({ getDecodedToken: jest.fn() });

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const PAST = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
const FUTURE = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
const FAR_PAST = new Date(Date.now() - 1000 * 60 * 60 * 2); // 2 hours ago

const mockActivity = {
  id: 'activity-001',
  startTime: PAST,
  endTime: FUTURE,
};

const mockGoods = {
  id: 'goods-001',
  skuId: 'sku-001',
  seckillPrice: 99,
};

const mockOrderMsg = {
  orderId: 'NO.123456789',
  activityId: 'activity-001',
  seckillGoodsId: 'goods-001',
  skuId: 'sku-001',
  username: 'testuser',
  seckillPrice: 99,
  money: 99,
  receiverAddress: '北京市朝阳区',
};

const mockOrder = {
  id: 'NO.123456789',
  activityId: 'activity-001',
  seckillGoodsId: 'goods-001',
  username: 'testuser',
  payStatus: '0',
  orderStatus: '0',
};

const mockReq = {}; // opaque request object passed through authService

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('SeckillOrderService', () => {
  let service: SeckillOrderService;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  let mockRedis: ReturnType<typeof makeMockRedis>;
  let mockAmqp: ReturnType<typeof makeMockAmqp>;
  let mockLogger: ReturnType<typeof makeMockLogger>;
  let mockSeckillStockService: ReturnType<typeof makeMockSeckillStockService>;
  let mockAuthService: ReturnType<typeof makeMockAuthService>;

  beforeEach(async () => {
    mockPrisma = makeMockPrisma();
    mockRedis = makeMockRedis();
    mockAmqp = makeMockAmqp();
    mockLogger = makeMockLogger();
    mockSeckillStockService = makeMockSeckillStockService();
    mockAuthService = makeMockAuthService();

    // Default: decoded token returns 'testuser'
    mockAuthService.getDecodedToken.mockResolvedValue({
      loginName: 'testuser',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeckillOrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getRedisConnectionToken(), useValue: mockRedis },
        { provide: AmqpConnection, useValue: mockAmqp },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: SeckillStockService, useValue: mockSeckillStockService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<SeckillOrderService>(SeckillOrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  placeOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('placeOrder', () => {
    beforeEach(() => {
      // Happy-path defaults; individual tests override as needed
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue(mockActivity);
      mockPrisma.ibuySeckillGoods.findUnique.mockResolvedValue(mockGoods);
      mockSeckillStockService.decrStock.mockResolvedValue(
        SeckillStockResult.SUCCESS,
      );
      mockAmqp.publish.mockResolvedValue(undefined);
    });

    it('should publish MQ message and return queued status on success', async () => {
      const result = await service.placeOrder(
        'goods-001',
        'activity-001',
        '北京市朝阳区',
        mockReq,
      );

      // Verifies MQ was called with the seckill-order-delay exchange
      expect(mockAmqp.publish).toHaveBeenCalledTimes(1);
      const [exchange, routingKey] = mockAmqp.publish.mock.calls[0];
      expect(exchange).toBe(RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_DELAY);
      expect(routingKey).toBe(RabbitMQConstants.QUEUE_SEC_KILL_ORDER_DELAY);

      // Verifies the published payload contains an orderId
      const publishedBuffer: Buffer = mockAmqp.publish.mock.calls[0][2];
      const published = JSON.parse(publishedBuffer.toString());
      expect(published).toMatchObject({
        activityId: 'activity-001',
        seckillGoodsId: 'goods-001',
        skuId: 'sku-001',
        username: 'testuser',
        seckillPrice: 99,
        receiverAddress: '北京市朝阳区',
      });
      expect(published.orderId).toBeTruthy();

      // Verifies the returned shape (raw object, no Result wrapper)
      expect(result).toBeDefined();
      expect(result).toMatchObject({ status: 'queued' });
      expect(result.orderId).toBeTruthy();
    });

    it('should throw BusinessException "活动未开始" when activity has not started', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue({
        ...mockActivity,
        startTime: FUTURE,
        endTime: new Date(Date.now() + 1000 * 60 * 120),
      });

      await expect(
        service.placeOrder(
          'goods-001',
          'activity-001',
          '北京市朝阳区',
          mockReq,
        ),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.placeOrder(
          'goods-001',
          'activity-001',
          '北京市朝阳区',
          mockReq,
        ),
      ).rejects.toMatchObject({ response: { message: '活动未开始' } });
    });

    it('should throw BusinessException "活动已结束" when activity has ended', async () => {
      mockPrisma.ibuySeckillActivity.findUnique.mockResolvedValue({
        ...mockActivity,
        startTime: FAR_PAST,
        endTime: PAST,
      });

      await expect(
        service.placeOrder(
          'goods-001',
          'activity-001',
          '北京市朝阳区',
          mockReq,
        ),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.placeOrder(
          'goods-001',
          'activity-001',
          '北京市朝阳区',
          mockReq,
        ),
      ).rejects.toMatchObject({ response: { message: '活动已结束' } });
    });

    it('should throw BusinessException "已售罄" when Lua returns OUT_OF_STOCK (0)', async () => {
      mockSeckillStockService.decrStock.mockResolvedValue(
        SeckillStockResult.OUT_OF_STOCK,
      );

      await expect(
        service.placeOrder(
          'goods-001',
          'activity-001',
          '北京市朝阳区',
          mockReq,
        ),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.placeOrder(
          'goods-001',
          'activity-001',
          '北京市朝阳区',
          mockReq,
        ),
      ).rejects.toMatchObject({ response: { message: '已售罄' } });
    });

    it('should throw BusinessException "每人限购一件" when Lua returns ALREADY_PURCHASED (-1)', async () => {
      mockSeckillStockService.decrStock.mockResolvedValue(
        SeckillStockResult.ALREADY_PURCHASED,
      );

      await expect(
        service.placeOrder(
          'goods-001',
          'activity-001',
          '北京市朝阳区',
          mockReq,
        ),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.placeOrder(
          'goods-001',
          'activity-001',
          '北京市朝阳区',
          mockReq,
        ),
      ).rejects.toMatchObject({ response: { message: '每人限购一件' } });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  createOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createOrder', () => {
    it('should create order in a transaction and send delay message on success', async () => {
      // Simulate a successful transaction: the callback receives a tx proxy
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => {
          const tx = {
            ibuySeckillOrder: { create: jest.fn().mockResolvedValue({}) },
            $executeRaw: jest.fn().mockResolvedValue(1),
          };
          return cb(tx);
        },
      );
      mockAmqp.publish.mockResolvedValue(undefined);

      await service.createOrder(mockOrderMsg);

      // Transaction was initiated
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Delay message was published after the successful transaction
      expect(mockAmqp.publish).toHaveBeenCalledTimes(1);
      const [exchange, , buffer, options] = mockAmqp.publish.mock.calls[0];
      expect(exchange).toBe(RabbitMQConstants.EXCHANGE_SEC_KILL_ORDER_DELAY);
      const payload = JSON.parse((buffer as Buffer).toString());
      expect(payload).toMatchObject({ out_trade_no: mockOrderMsg.orderId });
      expect(options).toMatchObject({ expiration: (1000 * 60 * 5).toString() });

      // No Redis restoration on success
      expect(mockRedis.incrby).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should restore Redis stock and remove user mark when DB transaction fails', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('DB 库存不足'));

      await service.createOrder(mockOrderMsg);

      // Error was logged
      expect(mockLogger.error).toHaveBeenCalled();

      // Redis stock restored
      expect(mockRedis.incrby).toHaveBeenCalledWith(
        `seckill:stock:${mockOrderMsg.seckillGoodsId}`,
        1,
      );

      // User purchase mark removed
      expect(mockRedis.del).toHaveBeenCalledWith(
        `seckill:user:${mockOrderMsg.activityId}:${mockOrderMsg.username}`,
      );

      // MQ delay message should NOT have been sent
      expect(mockAmqp.publish).not.toHaveBeenCalled();
    });

    it('should create the order record with correct data inside the transaction', async () => {
      const capturedTxCreate = jest.fn().mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => {
          const tx = {
            ibuySeckillOrder: { create: capturedTxCreate },
            $executeRaw: jest.fn().mockResolvedValue(1),
          };
          return cb(tx);
        },
      );
      mockAmqp.publish.mockResolvedValue(undefined);

      await service.createOrder(mockOrderMsg);

      expect(capturedTxCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: mockOrderMsg.orderId,
          activityId: mockOrderMsg.activityId,
          seckillGoodsId: mockOrderMsg.seckillGoodsId,
          skuId: mockOrderMsg.skuId,
          username: mockOrderMsg.username,
          seckillPrice: mockOrderMsg.seckillPrice,
          money: mockOrderMsg.money,
          orderStatus: '0',
          payStatus: '0',
          receiverAddress: mockOrderMsg.receiverAddress,
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  closeOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('closeOrder', () => {
    it('should skip closing when order is already paid (payStatus === "1")', async () => {
      mockPrisma.ibuySeckillOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        payStatus: '1',
      });

      await service.closeOrder('NO.123456789');

      expect(mockPrisma.ibuySeckillOrder.update).not.toHaveBeenCalled();
      expect(mockRedis.incrby).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should close order, restore Redis stock and remove user mark when unpaid', async () => {
      mockPrisma.ibuySeckillOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.ibuySeckillOrder.update.mockResolvedValue({});
      mockRedis.incrby.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      await service.closeOrder('NO.123456789');

      // Order status updated to closed
      expect(mockPrisma.ibuySeckillOrder.update).toHaveBeenCalledWith({
        where: { id: 'NO.123456789' },
        data: { orderStatus: '2', payStatus: '0' },
      });

      // Redis stock restored
      expect(mockRedis.incrby).toHaveBeenCalledWith(
        `seckill:stock:${mockOrder.seckillGoodsId}`,
        1,
      );

      // User mark removed
      expect(mockRedis.del).toHaveBeenCalledWith(
        `seckill:user:${mockOrder.activityId}:${mockOrder.username}`,
      );

      // Log written
      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('NO.123456789'),
      );
    });

    it('should do nothing when the order does not exist', async () => {
      mockPrisma.ibuySeckillOrder.findUnique.mockResolvedValue(null);

      await service.closeOrder('NONEXISTENT');

      expect(mockPrisma.ibuySeckillOrder.update).not.toHaveBeenCalled();
      expect(mockRedis.incrby).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('should return the order for the correct user', async () => {
      mockPrisma.ibuySeckillOrder.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findById('NO.123456789', mockReq);

      expect(result).toBeDefined();
      expect(result).toEqual(mockOrder);
    });

    it('should throw BusinessException "订单不存在" when order belongs to another user', async () => {
      mockPrisma.ibuySeckillOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        username: 'anotheruser',
      });

      await expect(service.findById('NO.123456789', mockReq)).rejects.toThrow(
        BusinessException,
      );

      await expect(
        service.findById('NO.123456789', mockReq),
      ).rejects.toMatchObject({
        response: { message: '订单不存在' },
      });
    });

    it('should throw BusinessException "订单不存在" when order is not found', async () => {
      mockPrisma.ibuySeckillOrder.findUnique.mockResolvedValue(null);

      await expect(service.findById('NONEXISTENT', mockReq)).rejects.toThrow(
        BusinessException,
      );

      await expect(
        service.findById('NONEXISTENT', mockReq),
      ).rejects.toMatchObject({
        response: { message: '订单不存在' },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  findByUser
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findByUser', () => {
    it('should return paginated results for the authenticated user', async () => {
      const orders = [mockOrder, { ...mockOrder, id: 'NO.987654321' }];
      mockPrisma.ibuySeckillOrder.findMany.mockResolvedValue(orders);
      mockPrisma.ibuySeckillOrder.count.mockResolvedValue(2);

      const pageParam = { current: 1, pageSize: 10 };
      const result = await service.findByUser(pageParam, mockReq);

      expect(result).toBeDefined();
      expect(result).toEqual({ items: orders, total: 2 });
    });

    it('should pass correct skip/take values derived from pageParam', async () => {
      mockPrisma.ibuySeckillOrder.findMany.mockResolvedValue([]);
      mockPrisma.ibuySeckillOrder.count.mockResolvedValue(0);

      const pageParam = { current: 3, pageSize: 5 };
      await service.findByUser(pageParam, mockReq);

      expect(mockPrisma.ibuySeckillOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { username: 'testuser' },
          skip: 10, // pageSize * (current - 1)  =>  5 * 2 = 10
          take: 5,
          orderBy: { createTime: 'desc' },
        }),
      );
    });

    it('should filter orders by username from the decoded token', async () => {
      mockPrisma.ibuySeckillOrder.findMany.mockResolvedValue([]);
      mockPrisma.ibuySeckillOrder.count.mockResolvedValue(0);

      await service.findByUser({ current: 1, pageSize: 10 }, mockReq);

      // Both findMany and count must use the username as where clause
      expect(mockPrisma.ibuySeckillOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { username: 'testuser' } }),
      );
      expect(mockPrisma.ibuySeckillOrder.count).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should run findMany and count in parallel via Promise.all', async () => {
      const callOrder: string[] = [];
      mockPrisma.ibuySeckillOrder.findMany.mockImplementation(async () => {
        callOrder.push('findMany');
        return [];
      });
      mockPrisma.ibuySeckillOrder.count.mockImplementation(async () => {
        callOrder.push('count');
        return 0;
      });

      await service.findByUser({ current: 1, pageSize: 10 }, mockReq);

      // Both must have been called (order may vary since they run concurrently)
      expect(callOrder).toContain('findMany');
      expect(callOrder).toContain('count');
    });
  });
});
