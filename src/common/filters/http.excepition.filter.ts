import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { BusinessException } from './business.exception.filter';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

/**
 * 捕获 HTTP 相关异常
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    this.logger.error(exception);
    // 处理业务异常
    if (exception instanceof BusinessException) {
      const error = exception.getResponse();
      response.status(HttpStatus.OK).send({
        data: null,
        code: error['code'],
        extra: {
          path: request.url,
          timestamp: new Date().toISOString(),
        },
        message: error['message'],
        success: false,
      });
      return;
    }

    // console.log(exception);
    response.status(status).send({
      data: null,
      code: status,
      extra: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      success: false,
      message: exception.getResponse(),
    });
  }
}
