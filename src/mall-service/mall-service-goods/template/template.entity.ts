import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_template')
export class TemplateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'spec_num', nullable: true })
  specNum: number;

  @Column({ name: 'para_num', nullable: true })
  paraNum: number;
}
