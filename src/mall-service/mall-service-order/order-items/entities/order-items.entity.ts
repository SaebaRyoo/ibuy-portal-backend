import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ibuy_order_item')
export class OrderItemsEntity {
  @PrimaryColumn()
  id: string; // ID

  @Column({ name: 'category_id1', type: 'int' })
  categoryId1: number; // 1级分类

  @Column({ name: 'category_id2', type: 'int' })
  categoryId2: number; // 2级分类

  @Column({ name: 'category_id3', type: 'int' })
  categoryId3: number; // 3级分类

  @Column({ name: 'spu_id' })
  spuId: string; // SPU_ID

  @Column({ name: 'sku_id' })
  skuId: string; // SKU_ID

  @Column({ name: 'order_id' })
  orderId: string; // 订单ID

  @Column()
  name: string; // 商品名称

  @Column({ type: 'int' })
  price: number; // 单价

  @Column({ type: 'int' })
  num: number; // 数量

  @Column({ type: 'int' })
  money: number; // 总金额

  @Column({ name: 'pay_money', type: 'int' })
  payMoney: number; // 实付金额

  @Column()
  image: string; // 图片地址

  @Column({ type: 'int', nullable: true })
  weight: number; // 重量

  @Column({ name: 'post_fee', type: 'int', nullable: true })
  postFee: number; // 运费

  @Column({ name: 'is_return', nullable: true })
  isReturn: string; // 是否退货, 0:未退货，1:已退货
}
