import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any, @Query() query: any) {
    return await this.fileService.uploadFile(
      'mall',
      file.originalname,
      file.buffer,
      query.path,
    );
  }

  @Get('download')
  downloadFile(@Query() query: any) {
    return this.fileService.downloadFile(
      query.bucketName,
      query.objectName,
      query.path,
    );
  }

  @Delete()
  deleteFile(@Query() query: any) {
    return this.fileService.deleteFile(
      query.bucketName,
      query.objectName,
      query.path,
    );
  }

  @Get('/list')
  getDirectoryStructure() {
    return this.fileService.getDirectoryStructure('mall');
  }
}
