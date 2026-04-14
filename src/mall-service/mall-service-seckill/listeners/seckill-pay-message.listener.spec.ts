import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SeckillPayMessageListener } from './seckill-pay-message.listener';
import { SeckillOrderService } from '../seckill-order/seckill-order.service';

const mockSeckillOrderService = {
  createOrder: jest.fn(),
  closeOrder: jest.fn(),
  paySuccess: jest.fn(),
};

const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('SeckillPayMessageListener', () => {
  let listener: SeckillPayMessageListener;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeckillPayMessageListener,
        { provide: SeckillOrderService, useValue: mockSeckillOrderService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    listener = module.get<SeckillPayMessageListener>(SeckillPayMessageListener);
  });

  describe('handlePayMessage', () => {
    it('should call seckillOrderService.paySuccess with orderId (out_trade_no) and transactionId (trade_no) from msg', async () => {
      const msg = {
        out_trade_no: 'order-999',
        trade_no: 'txn-alipay-888',
      };

      await listener.handlePayMessage(msg);

      expect(mockSeckillOrderService.paySuccess).toHaveBeenCalledTimes(1);
      expect(mockSeckillOrderService.paySuccess).toHaveBeenCalledWith(
        msg.out_trade_no,
        msg.trade_no,
      );
    });

    it('should log the received payment message before processing', async () => {
      const msg = {
        out_trade_no: 'order-999',
        trade_no: 'txn-alipay-888',
      };

      await listener.handlePayMessage(msg);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        `Seckill payment message received: ${JSON.stringify(msg)}`,
      );
    });
  });
});
