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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/metadata/public.decorator';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.signIn(signInDto.login_name, signInDto.password);
  }

  @Get('profile')
  getProfile(@Request() req) {
    this.logger.log('info', 'Calling getProfile()', AuthController.name);
    // this.logger.debug('Calling getProfile()', AuthController.name);
    // this.logger.verbose('Calling getProfile()', AuthController.name);
    // this.logger.error('Calling getProfile()', AuthController.name);
    return req.user;
  }
}
