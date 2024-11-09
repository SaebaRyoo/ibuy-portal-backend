import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_template')
export class TemplateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'spec_num' })
  specNum: number;

  @Column({ name: 'para_num' })
  paraNum: number;
}
