import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { SpuService } from './spu.service';
import { Public } from '../../../common/decorators/metadata/public.decorator';

@Controller('spu')
export class SpuController {
  @Inject(SpuService)
  private spuService: SpuService;

  @Post('/list/:current/:pageSize')
  async findList(
    @Param('current') current: number,
    @Param('pageSize') pageSize: number,
  ) {
    return this.spuService.findList({ current, pageSize });
  }

  @Get('/:id')
  async findById(@Param('id') id: string) {
    return this.spuService.findById(id);
  }
}
