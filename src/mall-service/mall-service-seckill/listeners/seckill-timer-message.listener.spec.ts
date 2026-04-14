import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SeckillTimerMessageListener } from './seckill-timer-message.listener';
import { SeckillOrderService } from '../seckill-order/seckill-order.service';

const mockSeckillOrderService = {
  createOrder: jest.fn(),
  closeOrder: jest.fn(),
  paySuccess: jest.fn(),
};

const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('SeckillTimerMessageListener', () => {
  let listener: SeckillTimerMessageListener;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeckillTimerMessageListener,
        { provide: SeckillOrderService, useValue: mockSeckillOrderService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    listener = module.get<SeckillTimerMessageListener>(
      SeckillTimerMessageListener,
    );
  });

  describe('handleOrderDelayMessage', () => {
    it('should call seckillOrderService.closeOrder with msg.out_trade_no', async () => {
      const msg = { out_trade_no: 'trade-abc-123' };

      await listener.handleOrderDelayMessage(msg);

      expect(mockSeckillOrderService.closeOrder).toHaveBeenCalledTimes(1);
      expect(mockSeckillOrderService.closeOrder).toHaveBeenCalledWith(
        msg.out_trade_no,
      );
    });

    it('should log the out_trade_no before closing the order', async () => {
      const msg = { out_trade_no: 'trade-abc-123' };

      await listener.handleOrderDelayMessage(msg);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        `Seckill order timer check: ${msg.out_trade_no}`,
      );
    });
  });
});
