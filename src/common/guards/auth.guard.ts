import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/common/decorators/metadata/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  /**
   * Determines whether the current request is authorized.
   *
   * Skips authentication for routes decorated with the `@Public()` metadata key.
   * Otherwise, extracts the JWT from the request header, verifies it, and
   * attaches the decoded payload to `request.user` for downstream handlers.
   *
   * @param context - The execution context providing access to the incoming request.
   * @returns A promise that resolves to `true` if the request is authorized.
   * @throws {HttpException} With `HttpStatus.UNAUTHORIZED` if no token is present or verification fails.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('isPublic--->', isPublic);
    if (isPublic) {
      // AuthGuard return true when the "isPublic" metadata is found
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new HttpException(
        'You have to login first',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request.user = payload;
    } catch {
      throw new HttpException(
        'You have to login first',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }

  /**
   * Extracts the Bearer token from the Authorization header.
   *
   * @param request - The incoming HTTP request.
   * @returns The JWT token string if a valid Bearer scheme is found, otherwise `undefined`.
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
