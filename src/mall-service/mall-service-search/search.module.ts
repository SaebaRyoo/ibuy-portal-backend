import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Module({
  imports: [
    // 导入ElasticsearchModule
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get('ES_NODE'),
        auth: {
          username: configService.get('ELASTIC_USERNAME'),
          password: configService.get('ELASTIC_PASSWORD'),
        },
        tls: {
          // 读取ca
          // https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html
          ca: fs.readFileSync('./ca.crt'),
          // 该选项在于开发初期，不使用启用tls时设置，在生产环境部署时，需要使用ca认证
          // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-connecting.html#auth-tls
          // rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
