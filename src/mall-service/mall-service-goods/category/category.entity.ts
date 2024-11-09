import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_category')
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number; //分类id

  @Column()
  name: string; //分类名称

  @Column({ name: 'goods_num' })
  goodsNum: number; //商品数量

  @Column({ name: 'is_show' })
  isShow: string; //是否显示 "0" "1"

  @Column({ name: 'is_menu' })
  isMenu: string; //是否导航

  @Column({ name: 'parent_id' })
  parentId: number; //上级ID

  @Column({ name: 'template_id' })
  templateId: number; //模板ID

  @Column({ nullable: true })
  seq: number; // 排序
}
