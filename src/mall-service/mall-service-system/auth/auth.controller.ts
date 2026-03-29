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

  /**
   * Authenticates a user with login credentials and issues access/refresh tokens.
   *
   * @param user - An object containing `loginName` and `password`.
   * @param res - The Express response object used to set the refresh token cookie.
   * @returns A `Result` containing the access token and user profile data.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(
    @Body() user: Record<string, any>,
    @Res({ passthrough: true }) res: Response, // passthrough: 允许我们同时使用 NestJS 的自动响应处理和手动响应处理， 不需要手动调用 res.json() 或 res.send()。
  ) {
    return this.authService.signIn(user.loginName, user.password, res);
  }

  /**
   * Refreshes the access token using a valid refresh token stored in cookies.
   *
   * @param req - The incoming request containing the `refresh_token` cookie.
   * @param res - The Express response object used to update the refresh token cookie.
   * @returns A `Result` containing a new access token.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('refresh')
  async refresh(@Request() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token;
    return this.authService.refreshToken(refreshToken, res);
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   *
   * @param req - The incoming request containing the authenticated user's JWT in the header.
   * @returns A `Result` containing the user's profile information.
   */
  @Get('profile')
  getProfile(@Request() req) {
    this.logger.log('info', 'Calling getProfile()', AuthController.name);
    return this.authService.getProfile(req);
  }

  /**
   * Logs out the current user by invalidating the refresh token and clearing the cookie.
   *
   * @param req - The incoming request containing the authenticated user's JWT.
   * @param res - The Express response object used to clear the refresh token cookie.
   * @returns A `Result` confirming successful logout.
   */
  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.user_id;
    await this.authService.logout(userId);
    // 只清除 refresh_token cookie
    res.clearCookie('refresh_token');
    return new Result(null, '退出登录成功');
  }
}
