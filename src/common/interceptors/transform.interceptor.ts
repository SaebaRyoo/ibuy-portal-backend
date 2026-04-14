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
import { ResponseMessage } from '../utils/ResponseMessage';

interface StandardResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data: T | null;
  extra: { path: string };
}

/**
 * 统一响应体拦截器
 * - If result is instanceof ResponseMessage → extract result.message and result.data
 * - Otherwise → use result directly as data, message defaults to 'success'
 * - Always output: { success: true, code: 200, message, data: result ?? null, extra: { path } }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const path = context.switchToHttp().getRequest<Request>().url;

    return next.handle().pipe(
      map((result) => {
        let data: T | null;
        let message: string;

        if (result instanceof ResponseMessage) {
          data = result.data ?? null;
          message = result.message;
        } else {
          data = result ?? null;
          message = 'success';
        }

        return {
          success: true,
          code: 200,
          message,
          data,
          extra: { path },
        };
      }),
    );
  }
}
