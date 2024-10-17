import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_category')
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number; //分类id

  @Column()
  name: string; //分类名称

  @Column()
  goodsNum: number; //商品数量

  @Column()
  isShow: string; //是否显示 "0" "1"

  @Column()
  isMenu: string; //是否导航

  @Column()
  parentId: number; //上级ID

  @Column()
  templateId: number; //模板ID

  @Column({ nullable: true })
  seq: number; // 排序
}
