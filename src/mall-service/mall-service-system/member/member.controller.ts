import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { MemberEntity } from './member.entity';
import { MemberService } from './member.service';
import { Public } from '../../../common/decorators/metadata/public.decorator';

@Controller('member')
export class MemberController {
  constructor(private userService: MemberService) {}

  @Public()
  @Post()
  async createUser(@Body() user: MemberEntity) {
    return this.userService.create(user);
  }
}
