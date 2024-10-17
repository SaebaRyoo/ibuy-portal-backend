import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ibuy_spu')
export class SpuEntity {
  @PrimaryColumn()
  id: string; // 主键

  @Column({ name: 'sn' })
  sn: string; // 货号

  @Column({ name: 'name' })
  name: string; // SPU名

  @Column({ name: 'caption' })
  caption: string; // 副标题

  @Column({ name: 'brand_id' })
  brandId: number; // 品牌ID

  @Column({ name: 'category1_id' })
  category1Id: number; // 一级分类

  @Column({ name: 'category2_id', nullable: true })
  category2Id: number; // 二级分类

  @Column({ name: 'category3_id', nullable: true })
  category3Id: number; // 三级分类

  @Column({ name: 'template_id', nullable: true })
  templateId: number; // 模板ID

  @Column({ name: 'freight_id', nullable: true })
  freightId: number; // 运费模板id

  @Column({ name: 'image', nullable: true })
  image: string; // 图片

  @Column({ name: 'images', nullable: true })
  images: string; // 图片列表

  @Column({ name: 'sale_service', nullable: true })
  saleService: string; // 售后服务

  @Column({ name: 'introduction', nullable: true })
  introduction: string; // 介绍

  @Column({ name: 'spec_items', nullable: true, type: 'json' })
  specItems: object; // 规格列表

  @Column({ name: 'para_items', nullable: true, type: 'json' })
  paraItems: object; // 参数列表

  @Column({ name: 'sale_num', nullable: true })
  saleNum: number; // 销量

  @Column({ name: 'comment_num', nullable: true })
  commentNum: number; // 评论数

  @Column({ name: 'is_marketable', nullable: true })
  isMarketable: string; // 是否上架

  @Column({ name: 'is_enable_spec', nullable: true })
  isEnableSpec: string; // 是否启用规格

  @Column({ name: 'is_delete', nullable: true })
  isDelete: string; // 是否删除

  @Column({ name: 'status', nullable: true })
  status: string; // 审核状态
}
