import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { getReqMainInfo } from '../utils/GetReqMainInfo';

interface Response<T> {
  data: T;
}

/**
 * 统一响应体拦截器
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    return next.handle().pipe(
      map((data) => {
        this.logger.log('response', {
          responseData: data,
          req: getReqMainInfo(req),
        });
        return {
          data: data?.data,
          code: data?.code,
          extra: {
            path: context.switchToHttp().getRequest().url,
          },
          message: data?.message,
          success: true,
        };
      }),
    );
  }
}
