import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
      user: {
        loginName: user.loginName,
        nickName: user.nickName,
        avatar: user.headPic,
        phone: user.phone,
        email: user.email,
        sourceType: user.sourceType,
        sex: user.sex,
        isMobileCheck: user.isMobileCheck,
        isEmailCheck: user.isEmailCheck,
        experienceValue: user.experienceValue,
        birthday: user.birthday,
        points: user.points,
        memberLevel: user.memberLevel,
      },
    };
    return new Result(data, '登录成功');
  }

  async getDecodedToken(req) {
    const token = req.headers.authorization?.split(' ')[1]; // 从请求头中获取 token
    // 验证并解码 token
    return this.jwtService.verify(token);
  }

  /** 获取用户信息 */
  async getProfile(req) {
    const token = req.headers.authorization?.split(' ')[1]; // 从请求头中获取 token
    const decoded = this.jwtService.verify(token); // 验证并解码 token
    const userId = decoded.user_id; // 从解码后的 token 中获取用户 ID
    const result = await this.usersService.findOneById(userId); // 根据用户 ID 查询用户信息
    const user = result.data;
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return new Result({
      loginName: user.loginName,
      nickName: user.nickName,
      avatar: user.headPic,
      phone: user.phone,
      email: user.email,
      sourceType: user.sourceType,
      sex: user.sex,
      isMobileCheck: user.isMobileCheck,
      isEmailCheck: user.isEmailCheck,
      experienceValue: user.experienceValue,
      birthday: user.birthday,
      points: user.points,
      memberLevel: user.memberLevel,
    });
  }
}
