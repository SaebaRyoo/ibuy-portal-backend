import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Request,
  Logger,
  Inject,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/metadata/public.decorator';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Response } from 'express';
import Result from 'src/common/utils/Result';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(
    @Body() user: Record<string, any>,
    @Res({ passthrough: true }) res: Response, // passthrough: 允许我们同时使用 NestJS 的自动响应处理和手动响应处理， 不需要手动调用 res.json() 或 res.send()。
  ) {
    return this.authService.signIn(user.loginName, user.password, res);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('refresh')
  async refresh(@Request() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token;
    return this.authService.refreshToken(refreshToken, res);
  }

  @Get('profile')
  getProfile(@Request() req) {
    this.logger.log('info', 'Calling getProfile()', AuthController.name);
    return this.authService.getProfile(req);
  }

  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.user_id;
    await this.authService.logout(userId);
    // 只清除 refresh_token cookie
    res.clearCookie('refresh_token');
    return new Result(null, '退出登录成功');
  }
}
