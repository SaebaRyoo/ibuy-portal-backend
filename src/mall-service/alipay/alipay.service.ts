import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AlipaySdk } from 'alipay-sdk';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { OrderService } from '../mall-service-order/order/order.service';
import { OrderItemsService } from '../mall-service-order/order-items/order-items.service';
import { ConfigService } from '@nestjs/config';
import { RabbitMQConstants } from '../../common/constants/RabbitMQConstants';
import Result from '../../common/utils/Result';

@Injectable()
export class AlipayService {
  private alipaySdk: AlipaySdk;
  constructor(
    private readonly amqpConnection: AmqpConnection,

    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    private readonly orderItemService: OrderItemsService,
    private readonly configService: ConfigService,
  ) {
    this.alipaySdk = new AlipaySdk({
      // 应用id
      appId: configService.get('ALIPAY_APP_ID'),
      // 商户秘钥
      privateKey: configService.get('ALIPAY_MERCHANT_PRIVATE_KEY'),
      // 支付宝公钥
      alipayPublicKey: configService.get('ALIPAY_PUBLIC_KEY'),
      // 签名类型
      signType: configService.get('ALIPAY_SIGN_TYPE'),
      // endpoint是在v3上使用的，不用手动改，v3 接口就是默认值 endpoint: 'https://openapi.alipay.com'
      // endpoint: configService.get('ALIPAY_GATEWAY_URL'),
      // 支付宝网关,走的沙箱应用
      gateway: configService.get('ALIPAY_GATEWAY_URL'),
    });
  }

  /**
   *
   * 前往支付宝第三方网关进行支付
   * 支付宝支付接入文档: https://opendocs.alipay.com/open-v3/2423fad5_alipay.trade.page.pay?scene=22&pathHash=b20c762a
   * @param orderId
   * @param queueName  ORDER_PAY: 正常订单支付  SEC_KILL_ORDER_PAY: 秒杀支付
   */
  async goAlipay(orderId: string, queueName: string) {
    const order = await this.orderService.findById(orderId);
    const result = await this.orderItemService.findItemsByOrderId(orderId);
    const orderItems = result.data;
    const subject =
      orderItems.length > 1
        ? orderItems[0]?.name + '等商品'
        : orderItems[0]?.name;

    const goodsDetails: any = [];

    for (const orderItem of orderItems) {
      const goods: any = {};
      goods.goods_id = orderItem.id; // 商品编号
      goods.goods_name = orderItem.name; // 商品名称
      goods.quantity = orderItem.num; // 商品数量
      goods.price = orderItem.price; // 商品价格
      goods.categories_tree = `${orderItem.categoryId1}|${orderItem.categoryId2}|${orderItem.categoryId3}`;

      goodsDetails.push(goods);
    }

    const passbackParams = {
      queueName,
      username: order.username,
    };

    const bizContent: any = {
      //商户订单号，商户网站订单系统中唯一订单号，必填
      out_trade_no: order.id,
      //付款金额，必填
      total_amount: order.totalMoney,
      //订单名称，必填.当有多个商品时，总订单只显示第一个商品名称
      subject: subject,
      // 该笔订单允许的最晚付款时间，逾期将关闭交易。取值范围：1m～15d。m-分钟，h-小时，d-天，1c-当天（1c-当天的情况下，无论交易何时创建，都在0点关闭）。 该参数数值不接受小数点， 如 1.5h，可转换为 90m。
      timeout_express: '30m',
      //销售产品码 必选，商家和支付宝签约的产品码。电脑场景支付为: FAST_INSTANT_TRADE_PAY, 手机网站支付: QUICK_WAP_WAY
      product_code: 'FAST_INSTANT_TRADE_PAY',
      //商品描述，可空
      body: '用户订购商品个数: ' + order.totalNum,
      //公共回传参数
      passback_params: encodeURIComponent(JSON.stringify(passbackParams)), // 转成utf-8编码字符串
      //   商品详情
      goods_detail: goodsDetails,
    };

    const alipayUrl = this.alipaySdk.pageExecute(
      'alipay.trade.page.pay',
      'GET',
      {
        bizContent: bizContent,
        // 同步返回
        // returnUrl: this.configService.get('ALIPAY_RETURN_URL'),
        // 异步返回 （以异步返回数据为准）
        notifyUrl: this.configService.get('ALIPAY_NOTIFY_URL'),
      },
    );

    return new Result({ alipayUrl });
  }

  /**
   * 同步通知
   * @param params
   */
  async alipayReturnNotice(params) {
    console.log('支付成功，进入同步通知接口...', params);
  }

  async alipayNotifyNotice(params) {
    console.log('支付成功，进入异步通知接口...', params);

    // const postData = {
    //   sign_type: this.configService.get('ALIPAY_SIGN_TYPE'),
    //   sign: params.sign,
    //   gmt_create: params.gmt_create,
    //
    // };
    //   验签
    const signVerified = this.alipaySdk.checkNotifySignV2(params);
    const passbackParams = JSON.parse(
      decodeURIComponent(params.passback_params),
    );
    const queueName = passbackParams.queueName;
    const username = passbackParams.username;

    const data: any = {};

    if (signVerified) {
      // 商户订单号
      const out_trade_no: string = params.out_trade_no;
      // 支付宝交易号
      const trade_no: string = params.trade_no;
      //   交易状态
      const trade_status: string = params.trade_status;
      //   付款金额
      const total_amount: string = params.total_amount;
      data.signVerified = 1;
      data.out_trade_no = out_trade_no;
      data.trade_no = trade_no;
      data.trade_status = trade_status;
      data.total_amount = total_amount;
      data.username = username;
    } else {
      data.signVerified = '0';
      data.out_trade_no = '';
      data.trade_no = '';
      data.trade_status = '';
      data.total_amount = '';
      data.username = '';
    }

    // 将消息发送到mq队列，其他服务需要就自己取

    /* 正常订单支付队列 */
    if (queueName === 'ORDER_PAY') {
      await this.amqpConnection.publish(
        RabbitMQConstants.EXCHANGE_ORDER_PAY,
        RabbitMQConstants.QUEUE_ORDER_PAY,
        Buffer.from(JSON.stringify(data)),
        {},
      );
    }
  }

  async tradeQuery(orderId: string) {
    // 使用v3版本时应该走这个
    // const response = await this.alipaySdk.curl('POST', '/v3/alipay/trade/query', {
    //   body: {
    //     biz_content: {
    //       out_trade_no: orderId,
    //     },
    //   },
    // });
    // 沙箱的请求调用走废弃的exec方法
    const response = await this.alipaySdk.exec('alipay.trade.query', {
      biz_content: {
        out_trade_no: orderId,
      },
    });
    const data: any = {};
    if (response.code == '10000') {
      // 支付宝交易号
      data.tradeNo = response.tradeNo;
      //支付状态
      //WAIT_BUYER_PAY    交易创建，等待买家付款
      //TRADE_CLOSED      未付款交易超时关闭，或支付完成后全额退款
      //TRADE_SUCCESS     交易支付成功
      //TRADE_FINISHED    交易结束，不可退款
      data.tradeStatus = response.tradeStatus;
      //   支付金额
      data.totalAmount = response.totalAmount;
      //   买家账号
      data.buyerLogonId = response.buyerLogonId;
    }
    return new Result(data, '支付成功');
  }

  async tradeClose(trade_no: string) {
    // 沙箱的请求调用走废弃的exec方法
    const response = await this.alipaySdk.exec('alipay.trade.close', {
      biz_content: {
        trade_no,
      },
    });

    let msg = '';
    if (response.code == '10000') {
      msg = '订单关闭成功';
    } else {
      msg = '订单关闭失败';
    }

    return new Result(null, msg);
  }
}
