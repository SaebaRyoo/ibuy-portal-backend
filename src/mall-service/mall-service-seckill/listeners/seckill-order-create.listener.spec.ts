import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SeckillOrderCreateListener } from './seckill-order-create.listener';
import { SeckillOrderService } from '../seckill-order/seckill-order.service';

const mockSeckillOrderService = {
  createOrder: jest.fn(),
  closeOrder: jest.fn(),
  paySuccess: jest.fn(),
};

const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('SeckillOrderCreateListener', () => {
  let listener: SeckillOrderCreateListener;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeckillOrderCreateListener,
        { provide: SeckillOrderService, useValue: mockSeckillOrderService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    listener = module.get<SeckillOrderCreateListener>(
      SeckillOrderCreateListener,
    );
  });

  describe('handleMessage', () => {
    it('should call seckillOrderService.createOrder when msg has orderId, seckillGoodsId, and username', async () => {
      const msg = {
        orderId: 'order-123',
        seckillGoodsId: 'goods-456',
        username: 'testuser',
      };

      await listener.handleMessage(msg);

      expect(mockSeckillOrderService.createOrder).toHaveBeenCalledTimes(1);
      expect(mockSeckillOrderService.createOrder).toHaveBeenCalledWith(msg);
    });

    it('should NOT call createOrder when msg only has out_trade_no (missing required fields)', async () => {
      const msg = { out_trade_no: 'trade-789' };

      await listener.handleMessage(msg);

      expect(mockSeckillOrderService.createOrder).not.toHaveBeenCalled();
    });

    it('should NOT call createOrder when msg is missing orderId', async () => {
      const msg = { seckillGoodsId: 'goods-456', username: 'testuser' };

      await listener.handleMessage(msg);

      expect(mockSeckillOrderService.createOrder).not.toHaveBeenCalled();
    });

    it('should NOT call createOrder when msg is missing seckillGoodsId', async () => {
      const msg = { orderId: 'order-123', username: 'testuser' };

      await listener.handleMessage(msg);

      expect(mockSeckillOrderService.createOrder).not.toHaveBeenCalled();
    });

    it('should NOT call createOrder when msg is missing username', async () => {
      const msg = { orderId: 'order-123', seckillGoodsId: 'goods-456' };

      await listener.handleMessage(msg);

      expect(mockSeckillOrderService.createOrder).not.toHaveBeenCalled();
    });

    it('should log the received message regardless of msg contents', async () => {
      const msg = { out_trade_no: 'trade-789' };

      await listener.handleMessage(msg);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        `Seckill order create message received: ${JSON.stringify(msg)}`,
      );
    });
  });
});
