import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_category_brand')
export class CategoryBrandEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'category_id' })
  categoryId: number; //分类ID

  @Column({ name: 'brand_id' })
  brandId: number; //品牌ID
}
