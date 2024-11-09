import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ibuy_member')
export class MemberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'login_name', unique: true })
  loginName: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'source_type', nullable: true })
  sourceType: string; //会员来源：1:PC，2：H5，3：Android，4：IOS

  @Column({ name: 'nick_name', nullable: true })
  nickName: string;

  @Column({ nullable: true })
  status: string; //使用状态（1正常 0非正常）

  @Column({ name: 'head_pic', nullable: true })
  headPic: string; //头像地址

  @Column({ name: 'is_mobile_check', nullable: true })
  isMobileCheck: string; //手机是否验证 （0否  1是）

  @Column({ name: 'is_email_check', nullable: true })
  isEmailCheck: string; //邮箱是否检测（0否  1是）

  @Column({ name: 'sex', nullable: true })
  sex: string; // null: 未填写 0: 女性 1: 男性

  @Column({ name: 'member_level', nullable: true })
  memberLevel: number; //会员等级

  @Column({ name: 'experience_value', nullable: true })
  experienceValue: number; //经验值

  @Column({ name: 'birthday', nullable: true })
  birthday: Date; //生日

  @Column({ name: 'last_login_time', nullable: true })
  lastLoginTime: Date; //最后登录时间

  @Column({ name: 'points', nullable: true })
  points: number; //积分

  @Column({ name: 'create_time', nullable: true })
  createTime: Date; // 创建时间

  @Column({ name: 'update_time', nullable: true })
  updateTime: Date; // 更新时间
}
