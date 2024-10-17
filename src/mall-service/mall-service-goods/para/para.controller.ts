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
    const [data, total] = await this.paraService.findList(pageParam);
    return { data, total };
  }

  @Post('/add')
  createPara(@Body() body: any) {
    return this.paraService.addPara(body);
  }

  @Get('/:id')
  async getParaById(@Param('id') id: number) {
    return this.paraService.findById(id);
  }

  @Patch('/:id')
  updatePara(@Param('id') id: number, @Body() para: ParaEntity) {
    return this.paraService.updatePara(id, para);
  }
}
