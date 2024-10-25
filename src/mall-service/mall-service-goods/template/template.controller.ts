import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TemplateService } from './template.service';
import { TemplateEntity } from './template.entity';

@Controller('template')
export class TemplateController {
  @Inject(TemplateService)
  private templateService: TemplateService;

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    return this.templateService.findList(pageParam);
  }

  @Post('/add')
  async createTemplate(@Body() body: any) {
    return this.templateService.addTemplate(body);
  }

  @Get('/:id')
  async getTemplateById(@Param('id') id: number) {
    return this.templateService.findById(id);
  }

  @Patch('/:id')
  updateTemplate(@Param('id') id: number, @Body() template: TemplateEntity) {
    return this.templateService.updateTemplate(id, template);
  }
}
