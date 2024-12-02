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
import { ParaService } from './para.service';
import { ParaEntity } from './para.entity';

@Controller('para')
export class ParaController {
  @Inject(ParaService)
  private paraService: ParaService;

  @Post('/list')
  async findList(@Body('pageParam') pageParam: any) {
    return await this.paraService.findList(pageParam);
  }

  @Post()
  create(@Body() body: any) {
    return this.paraService.create(body);
  }

  @Get('/:id')
  async findById(@Param('id') id: number) {
    return this.paraService.findById(id);
  }

  @Patch('/:id')
  updateById(@Param('id') id: number, @Body() para: ParaEntity) {
    return this.paraService.updateById(id, para);
  }
}
