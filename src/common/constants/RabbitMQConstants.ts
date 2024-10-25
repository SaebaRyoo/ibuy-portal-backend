export const RabbitMQConstants = {
  // 35分钟延时，用于检查订单付款状态的延时队列 + 5分钟再检查，防止用户出现卡点支付
  DELAY_TIME: (1000 * 60 * 35).toString(),

  /*** 普通订单相关队列和交换机 ***/
  QUEUE_ORDER_DELAY: 'queue.order.delay', // 普通订单 延时队列
  QUEUE_ORDER_CHECK: 'queue.order.check', // 普通订单 支付延时消费队列
  QUEUE_ORDER_PAY: 'queue.order.pay', // 普通订单 支付队列

  EXCHANGE_ORDER_DELAY: 'exchange.order.delay', // 普通订单 延时队列交换机
  EXCHANGE_ORDER_PAY: 'exchange.order.pay', // 普通订单 支付交换机

  /*** 秒杀订单相关队列和交换机 ***/
  QUEUE_SEC_KILL_ORDER_DELAY: 'queue.seckill.delay', // 秒杀订单 延时队列
  QUEUE_SEC_KILL_ORDER_CHECK: 'queue.seckill.order.check', // 秒杀订单 支付延时消费队列
  QUEUE_SEC_KILL_ORDER_PAY: 'queue.seckill.order.pay', // 秒杀订单 支付队列

  EXCHANGE_SEC_KILL_ORDER_DELAY: 'exchange.seckill.delay', // 秒杀订单 延时队列交换机
  EXCHANGE_SEC_KILL_ORDER_PAY: 'exchange.seckill.order.pay', // 秒杀订单 支付交换机
};
