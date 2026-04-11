import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const host = configService.get('POSTGRES_HOST');
    const port = configService.get('POSTGRES_PORT');
    const user = configService.get('POSTGRES_USER');
    const password = configService.get('POSTGRES_PASSWORD');
    const database = configService.get('POSTGRES_DATABASE');
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;

    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
