import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_brand')
export class BrandEntity {
  @PrimaryGeneratedColumn()
  id: number; //品牌id

  @Column()
  name: string; //品牌名称

  @Column({ nullable: true })
  image: string; //品牌图片地址

  @Column()
  letter: string; //品牌的首字母

  @Column({ nullable: true })
  seq: number; // 排序
}
