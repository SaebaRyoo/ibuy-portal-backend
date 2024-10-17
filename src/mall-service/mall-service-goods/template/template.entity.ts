import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_template')
export class TemplateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  spec_num: number;

  @Column()
  para_num: number;
}
