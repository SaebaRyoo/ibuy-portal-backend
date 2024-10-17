import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ibuy_order') // 实体对应的表名，可以根据实际的表名调整
export class OrderEntity {
  @PrimaryColumn({ name: 'id' })
  id: string; // 订单id

  @Column({ name: 'total_num', type: 'int' })
  totalNum: number; // 数量合计

  @Column({ name: 'total_money', type: 'int' })
  totalMoney: number; // 金额合计

  @Column({ name: 'pre_money', type: 'int' })
  preMoney: number; // 优惠金额

  @Column({ name: 'post_fee', type: 'int', nullable: true })
  postFee: number; // 邮费

  @Column({ name: 'pay_money', type: 'int' })
  payMoney: number; // 实付金额

  @Column({ name: 'pay_type' })
  payType: string; // 支付类型，1、在线支付、0 货到付款

  @Column({ name: 'create_time', type: 'timestamp' })
  createTime: Date; // 订单创建时间

  @Column({ name: 'update_time', type: 'timestamp' })
  updateTime: Date; // 订单更新时间

  @Column({ name: 'pay_time', type: 'timestamp', nullable: true })
  payTime: Date; // 付款时间

  @Column({ name: 'consign_time', type: 'timestamp', nullable: true })
  consignTime: Date; // 发货时间

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date; // 交易完成时间

  @Column({ name: 'close_time', type: 'timestamp', nullable: true })
  closeTime: Date; // 交易关闭时间

  @Column({ name: 'shipping_name', nullable: true })
  shippingName: string; // 物流名称

  @Column({ name: 'shipping_code', nullable: true })
  shippingCode: string; // 物流单号

  @Column({ name: 'shipping_task_id', nullable: true })
  shippingTaskId: string; // 物流任务id -> 对接的第三方

  @Column({ name: 'shipping_status' })
  shippingStatus: string; // 发货状态, 0: 未发货，1: 已发货，2: 已收货

  @Column({ name: 'username' })
  username: string; // 用户名称

  @Column({ name: 'buyer_message', nullable: true })
  buyerMessage: string; // 买家留言

  @Column({ name: 'buyer_rate', nullable: true })
  buyerRate: string; // 是否评价

  @Column({ name: 'receiver_contact' })
  receiverContact: string; // 收货人

  @Column({ name: 'receiver_mobile' })
  receiverMobile: string; // 收货人手机

  @Column({ name: 'receiver_address', nullable: true })
  receiverAddress: string; // 收货人地址

  @Column({ name: 'source_type', nullable: true })
  sourceType: string; // 订单来源：1: web，2: app，3: 微信公众号，4: 微信小程序，5: H5手机页面

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string; // 交易流水号

  @Column({ name: 'order_status' })
  orderStatus: string; // 订单状态, 0: 未完成, 1: 已完成, 2: 已退货

  @Column({ name: 'pay_status' })
  payStatus: string; // 支付状态, 0: 未支付, 1: 已支付, 2: 支付失败

  @Column({ name: 'is_delete', nullable: true })
  isDelete: string; // 是否删除
}
