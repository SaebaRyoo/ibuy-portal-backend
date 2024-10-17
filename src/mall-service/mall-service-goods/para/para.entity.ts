import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_para')
export class ParaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  options: string;

  @Column({ nullable: true })
  seq: number; // 排序

  @Column()
  template_id: number;
}
