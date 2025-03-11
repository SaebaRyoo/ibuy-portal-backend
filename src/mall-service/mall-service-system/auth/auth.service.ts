import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberService } from '../member/member.service';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Result from '../../../common/utils/Result';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import parseTimeToSeconds from 'src/common/utils/parseTimeToSeconds';
import { Response } from 'express';

@Injectable()
export class AuthService {
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  constructor(
    private usersService: MemberService,
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private configService: ConfigService,
  ) {
    this.accessTokenExpiresIn = this.configService.get(
      'JWT_ACCESS_TOKEN_EXPIRES_IN',
    );
    this.refreshTokenExpiresIn = this.configService.get(
      'JWT_REFRESH_TOKEN_EXPIRES_IN',
    );
  }

  private async storeRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.redis.set(
      key,
      refreshToken,
      'EX',
      parseTimeToSeconds(this.refreshTokenExpiresIn), // 7天过期
    );
  }

  private async invalidateRefreshToken(userId: number): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.redis.del(key);
  }

  private async isRefreshTokenValid(
    userId: number,
    refreshToken: string,
  ): Promise<boolean> {
    const storedToken = await this.redis.get(`refresh_token:${userId}`);
    return storedToken === refreshToken;
  }

  private setCookies(res: Response, refreshToken: string): void {
    res.cookie('refresh_token', refreshToken, {
      // 禁用js访问cookie, 防止XSS攻击
      httpOnly: true,
      // 只允许https访问cookie
      // 开发环境下关闭, 否则前端无法访问cookie
      secure: process.env.NODE_ENV === 'development' ? false : true,
      // 这个属性控制跨站请求时是否发送Cookie。
      // lax（默认值）: 表示在导航到目标站点的请求中发送Cookie，但不在POST请求中发送。
      // strict: 表示仅在相同站点（同源）的请求中发送Cookie，防止CSRF攻击。
      // none: 表示始终发送Cookie。必须配合secure属性使用。
      sameSite: 'lax',
      maxAge: parseTimeToSeconds(this.refreshTokenExpiresIn) * 1000, // 7天 (单位:毫秒)
    });
  }

  async signIn(
    loginName: string,
    pass: string,
    res: Response,
  ): Promise<Result<{ access_token: string }>> {
    const result = await this.usersService.findOne(loginName);
    const user = result.data;

    const isMatch = await bcrypt.compare(pass, user?.password);

    if (!isMatch) {
      throw new UnauthorizedException();
    }
    const payload = {
      user_id: user.id,
      loginName: user.loginName,
      tokenVersion: user.tokenVersion,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });
    const refresh_token = await this.jwtService.sign(payload, {
      expiresIn: this.refreshTokenExpiresIn,
    });

    // 存储refresh token到Redis白名单
    await this.storeRefreshToken(user.id, refresh_token);

    // 只将refresh token存储在cookie中
    this.setCookies(res, refresh_token);

    const data = {
      access_token: access_token,
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

  async refreshToken(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const userId = decoded.user_id;

      // 验证refresh token是否在白名单中
      const isValid = await this.isRefreshTokenValid(userId, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Refresh token不在白名单中');
      }

      const { data: user } = await this.usersService.findOneById(userId);
      if (!user || user.status !== '1') {
        throw new UnauthorizedException('用户状态异常');
      }

      // 验证token版本
      if (decoded.tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException('Token版本已失效');
      }

      const payload = {
        user_id: user.id,
        loginName: user.loginName,
        tokenVersion: user.tokenVersion,
      };

      const access_token = this.jwtService.sign(payload, {
        expiresIn: this.accessTokenExpiresIn,
      });

      const new_refresh_token = this.jwtService.sign(payload, {
        expiresIn: this.refreshTokenExpiresIn,
      });

      // 更新Redis中的refresh token
      await this.invalidateRefreshToken(userId);
      await this.storeRefreshToken(userId, new_refresh_token);

      // 更新refresh token cookie
      this.setCookies(res, new_refresh_token);

      return new Result({ access_token }, 'Token刷新成功');
    } catch (e) {
      throw new UnauthorizedException(
        e instanceof TokenExpiredError ? 'token已过期' : e,
      );
    }
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

  async logout(userId: number) {
    await this.invalidateRefreshToken(userId);
    // 增加token版本号，使所有现有token失效
    await this.usersService.incrementTokenVersion(userId);
  }
}
