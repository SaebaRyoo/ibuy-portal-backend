export class DirectOrderInfoDto {
  /**
   * 收货人
   */
  receiverContact: string;

  /**
   * 收货人手机
   */
  receiverMobile: string;

  /**
   * 收货人地址
   */
  receiverAddress: string;

  /**
   * 买家留言
   */
  buyerMessage?: string;

  /**
   * 支付类型
   * 0: 支付宝支付、1: 微信支付  2: 银联支付 3: 货到付款
   */
  payType: string;
}