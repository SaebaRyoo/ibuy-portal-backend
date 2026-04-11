import { ConfigModule } from '@nestjs/config';

export const AppConfigModule = ConfigModule.forRoot({
  envFilePath: process.env.NODE_ENV === 'development' ? ['.env.dev'] : ['.env'],
  isGlobal: true,
});
