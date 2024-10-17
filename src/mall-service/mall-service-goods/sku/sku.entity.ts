import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ibuy_sku')
export class SkuEntity {
  // 这里的id使用的是雪花算法
  @PrimaryColumn()
  id: string; // 商品id

  @Column()
  sn: string; // 商品条码

  @Column()
  name: string; // SKU名称

  @Column()
  price: number; // 价格（分）

  @Column()
  num: number; // 库存数量

  @Column({ name: 'alert_num' })
  alertNum: number; // 库存预警数量

  @Column()
  image: string; // 商品图片

  @Column()
  images: string; // 商品图片列表

  @Column()
  weight: number; // 重量（克）

  @Column({ name: 'create_time' })
  createTime: Date; // 创建时间

  @Column({ name: 'update_time' })
  updateTime: Date; // 更新时间

  @Column({ name: 'spu_id' })
  spuId: string; // SPUID

  @Column({ name: 'category_id' })
  categoryId: number; // 类目ID

  @Column({ name: 'category_name' })
  categoryName: string; // 类目名称

  @Column({ name: 'brand_name' })
  brandName: string; // 品牌名称

  @Column({ type: 'json' })
  spec: object; // 规格

  @Column({ name: 'sale_num' })
  saleNum: number; // 销量

  @Column({ name: 'comment_num' })
  commentNum: number; // 评论数

  @Column()
  status: string; // 商品状态 1-正常，2-下架，3-删除
}
