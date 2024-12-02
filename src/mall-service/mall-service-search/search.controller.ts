import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/metadata/public.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('/query')
  async search(@Query() searchMap) {
    return this.searchService.search(searchMap);
  }

  @Get('/import')
  async importData() {
    return this.searchService.importSku();
  }
}
