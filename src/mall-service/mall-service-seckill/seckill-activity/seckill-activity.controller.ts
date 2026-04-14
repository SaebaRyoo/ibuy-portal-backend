import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Inject,
} from '@nestjs/common';
import { SeckillActivityService } from './seckill-activity.service';
import { Public } from '../../../common/decorators/metadata/public.decorator';

@Controller('seckill/activity')
export class SeckillActivityController {
  @Inject(SeckillActivityService)
  private seckillActivityService: SeckillActivityService;

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      startTime: string;
      endTime: string;
      intro?: string;
    },
  ) {
    return this.seckillActivityService.create({
      name: body.name,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      intro: body.intro,
    });
  }

  @Patch('/:id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      startTime?: string;
      endTime?: string;
      intro?: string;
    },
  ) {
    return this.seckillActivityService.update(id, {
      name: body.name,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      intro: body.intro,
    });
  }

  @Post('/:id/audit')
  async audit(@Param('id') id: string, @Body('approved') approved: boolean) {
    return this.seckillActivityService.audit(id, approved);
  }

  @Post('/:id/publish')
  async publish(@Param('id') id: string) {
    return this.seckillActivityService.publish(id);
  }

  @Post('/:id/unpublish')
  async unpublish(@Param('id') id: string) {
    return this.seckillActivityService.unpublish(id);
  }

  @Post('/list')
  async findAll(
    @Body('pageParam')
    pageParam: {
      current: number;
      pageSize: number;
      status?: number;
    },
  ) {
    return this.seckillActivityService.findAll(pageParam);
  }

  @Public()
  @Get('/active')
  async findActive() {
    return this.seckillActivityService.findActive();
  }

  @Get('/:id')
  async findById(@Param('id') id: string) {
    return this.seckillActivityService.findById(id);
  }
}
