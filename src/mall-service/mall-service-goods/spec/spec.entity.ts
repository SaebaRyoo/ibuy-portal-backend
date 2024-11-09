import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_spec')
export class SpecEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  options: string;

  @Column({ nullable: true })
  seq: number;

  @Column({ name: 'template_id' })
  templateId: number;
}
