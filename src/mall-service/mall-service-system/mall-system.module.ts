import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MemberModule } from './member/member.module';
import { AddressModule } from './address/address.module';

@Module({
  imports: [AuthModule, MemberModule, AddressModule],
})
export class MallSystemModule {}
