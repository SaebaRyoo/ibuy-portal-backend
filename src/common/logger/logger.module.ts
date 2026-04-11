import { Module } from '@nestjs/common';
import * as winston from 'winston';
import { WinstonModule } from 'nest-winston';
import 'winston-daily-rotate-file';

const isDev = process.env.NODE_ENV === 'development';

const transports: winston.transport[] = isDev
  ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(
            ({ timestamp, level, message, ...meta }) =>
              `${timestamp} [${level}] ${typeof message === 'object' ? JSON.stringify(message) : message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`,
          ),
        ),
      }),
    ]
  : [
      new winston.transports.DailyRotateFile({
        dirname: 'logs',
        filename: '%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json(),
        ),
      }),
    ];

@Module({
  imports: [WinstonModule.forRoot({ transports })],
})
export class LoggerModule {}
