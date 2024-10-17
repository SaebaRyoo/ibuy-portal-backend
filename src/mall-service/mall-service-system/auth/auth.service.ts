import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(
    login_name: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(login_name);

    const isMatch = await bcrypt.compare(pass, user?.password);

    if (!isMatch) {
      throw new UnauthorizedException();
    }
    const payload = { user_id: user.id, login_name: user.login_name };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
