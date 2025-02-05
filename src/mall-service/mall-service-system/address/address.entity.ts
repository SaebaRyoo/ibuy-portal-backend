import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_address')
export class AddressEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'username', nullable: true })
  username: string;

  @Column({ name: 'province_id', nullable: true })
  provinceId: string;

  @Column({ name: 'city_id', nullable: true })
  cityId: string;

  @Column({ name: 'area_id', nullable: true })
  areaId: string;

  @Column({ name: 'phone' })
  phone: string;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'contact' })
  contact: string;

  @Column({ name: 'is_default' })
  isDefault: number;

  @Column({ name: 'alias', nullable: true })
  alias: string;
}
