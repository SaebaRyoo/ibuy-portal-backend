import { Injectable, UnauthorizedException } from '@nestjs/common';
import { MemberService } from '../member/member.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Result from '../../../common/utils/Result';

@Injectable()
export class AuthService {
  constructor(
    private usersService: MemberService,
    private jwtService: JwtService,
  ) {}

  async signIn(
    login_name: string,
    pass: string,
  ): Promise<Result<{ access_token: string }>> {
    const result = await this.usersService.findOne(login_name);
    const user = result.data;

    const isMatch = await bcrypt.compare(pass, user?.password);

    if (!isMatch) {
      throw new UnauthorizedException();
    }
    const payload = { user_id: user.id, login_name: user.loginName };
    const data = {
      access_token: await this.jwtService.signAsync(payload),
    };
    return new Result(data, '登录成功');
  }
}
