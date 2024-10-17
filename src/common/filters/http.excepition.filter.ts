import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BusinessException } from './business.exception.filter';
import { Request, Response } from 'express';

/**
 * 捕获 HTTP 相关异常
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // 处理业务异常
    if (exception instanceof BusinessException) {
      const error = exception.getResponse();
      response.status(HttpStatus.OK).send({
        data: null,
        status: error['code'],
        extra: {
          path: request.url,
        },
        message: error['message'],
        success: false,
      });
      return;
    }

    console.log(exception);
    response.status(status).send({
      data: null,
      status: status,
      extra: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      success: false,
      message: exception.getResponse(),
    });
  }
}
