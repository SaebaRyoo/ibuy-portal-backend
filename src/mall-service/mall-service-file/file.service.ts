import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import Result from '../../common/utils/Result';

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
  ) {
    await this.minioClient.putObject(bucketName, `${path}/${objectName}`, data);
    return new Result({
      bucketName,
      path,
      objectName,
    });
  }

  async downloadFile(
    bucketName: string,
    objectName: string,
    path: string = '/',
  ): Promise<Result<any>> {
    await this.minioClient.getObject(bucketName, `${path}/${objectName}`);
    return new Result(null, '下载成功');
  }

  async deleteFile(
    bucketName: string,
    objectName: string,
    path: string = '/',
  ): Promise<Result<null>> {
    await this.minioClient.removeObject(bucketName, `${path}/${objectName}`);

    return new Result(null, '删除成功');
  }

  /**
   * 获取目录列表
   * @param bucketName 分组名
   * @returns director list
   */
  async getDirectoryStructure(
    bucketName: string,
  ): Promise<Result<{ data: string[] }>> {
    const result = await this.listObjects(bucketName);
    const directories = new Set<string>();

    result.data.forEach((object) => {
      const pathSegments = object.name.split('/');
      if (pathSegments.length > 1) {
        const directory = pathSegments.slice(0, -1).join('/');
        directories.add(directory);
      }
    });

    const data = Array.from(directories);
    return new Result({ data });
  }

  private async listObjects(
    bucketName: string,
  ): Promise<Result<Minio.BucketItem[]>> {
    const data = await new Promise<Minio.BucketItem[]>((resolve, reject) => {
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
    return new Result(data);
  }
}
