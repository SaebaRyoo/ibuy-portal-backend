import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQConstants } from '../../../../common/constants/RabbitMQConstants';
import { Public } from '../../../../common/decorators/metadata/public.decorator';
import { OrderService } from '../order.service';
import { OrderEntity } from '../entities/order.entity';

@Injectable()
export class OrderPayMessageListener {
  constructor(private readonly orderService: OrderService) {}

  @Public()
  @RabbitSubscribe({
    exchange: RabbitMQConstants.EXCHANGE_ORDER_PAY,
    routingKey: RabbitMQConstants.QUEUE_ORDER_PAY,
    queue: RabbitMQConstants.QUEUE_ORDER_PAY,
  })
  public async consumeOrderPayMessage(msg: any) {
    console.log('consume pay message: ');
    console.log(msg);

    const signVerified = msg?.signVerified;
    //商户订单号
    const out_trade_no = msg?.out_trade_no;
    //支付宝交易号
    const trade_no = msg?.trade_no;
    //交易状态
    const trade_status = msg?.trade_status;
    //付款金额
    const total_amount = msg?.total_amount;

    /* 实际验证过程建议商户务必添加以下校验：
    1、需要验证该通知数据中的out_trade_no是否为商户系统中创建的订单号，
    2、判断total_amount是否确实为该订单的实际金额（即商户订单创建时的金额），
    3、校验通知中的seller_id（或者seller_email) 是否为out_trade_no这笔单据的对应的操作方（有的时候，一个商户可能有多个seller_id/seller_email）
    4、验证app_id是否为该商户本身。
    */
    if (!(signVerified === '1')) {
      return;
    }

    if (trade_status === 'TRADE_SUCCESS') {
      //判断该笔订单是否在商户网站中已经做过处理
      //如果没有做过处理，根据订单号（out_trade_no）在商户网站的订单系统中查到该笔订单的详细，并执行商户的业务程序
      //如果有做过处理，不执行商户的业务程序
      //注意：
      //付款完成后，支付宝系统发送该交易状态通知
      // 修改订单状态，改为 支付成功，已付款; 同时新增支付流水

      const order = new OrderEntity();
      // order.id = out_trade_no;
      order.payStatus = '1'; // 支付状态变为已支付
      order.orderStatus = '1'; // 订单状态变为待发货
      order.payTime = new Date();
      order.transactionId = trade_no;
      await this.orderService.update(out_trade_no, order);
      console.log('验证成功');
    } else if (trade_status === 'TRADE_FINISHED') {
      //判断该笔订单是否在商户网站中已经做过处理
      //如果没有做过处理，根据订单号（out_trade_no）在商户网站的订单系统中查到该笔订单的详细，并执行商户的业务程序
      //如果有做过处理，不执行商户的业务程序
      //注意： 尚自习的订单没有退款功能, 这个条件判断是进不来的, 所以此处不必写代码
      //退款日期超过可退款期限后（如三个月可退款），支付宝系统发送该交易状态通知
    }
  }
}
