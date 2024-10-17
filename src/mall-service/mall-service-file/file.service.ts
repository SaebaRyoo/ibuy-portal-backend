import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class FileService {
  private readonly minioClient: Minio.Client;

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_HOST'),
      port: parseInt(this.configService.get('MINIO_PORT')),
      useSSL: false,
      accessKey: this.configService.get('MINIO_ACCESS_KEY'),
      secretKey: this.configService.get('MINIO_SECRET_KEY'),
    });
  }

  /**
   * 上传文件
   * @param bucketName 分组名
   * @param objectName 资源名 eg. abc.jpg
   * @param data 具体资源
   * @param path 路径名
   * @returns
   */
  async uploadFile(
    bucketName: string,
    objectName: string,
    data: Buffer,
    path: string = '/',
  ): Promise<Record<string, string>> {
    await this.minioClient.putObject(bucketName, `${path}/${objectName}`, data);
    return {
      bucketName,
      path,
      objectName,
    };
  }

  async downloadFile(
    bucketName: string,
    objectName: string,
    path: string = '/',
  ): Promise<void> {
    await this.minioClient.getObject(bucketName, `${path}/${objectName}`);
  }

  async deleteFile(
    bucketName: string,
    objectName: string,
    path: string = '/',
  ): Promise<void> {
    await this.minioClient.removeObject(bucketName, `${path}/${objectName}`);
  }

  /**
   * 获取目录列表
   * @param bucketName 分组名
   * @returns director list
   */
  async getDirectoryStructure(bucketName: string): Promise<string[]> {
    const objects = await this.listObjects(bucketName);
    const directories = new Set<string>();

    objects.forEach((object) => {
      const pathSegments = object.name.split('/');
      if (pathSegments.length > 1) {
        const directory = pathSegments.slice(0, -1).join('/');
        directories.add(directory);
      }
    });

    return Array.from(directories);
  }

  private async listObjects(bucketName: string): Promise<Minio.BucketItem[]> {
    return new Promise<Minio.BucketItem[]>((resolve, reject) => {
      const objects: Minio.BucketItem[] = [];
      const stream = this.minioClient.listObjects(bucketName, '', true);

      stream.on('data', (obj) => {
        objects.push(obj);
      });
      stream.on('error', (err) => {
        reject(err);
      });
      stream.on('end', () => {
        resolve(objects);
      });
    });
  }
}
