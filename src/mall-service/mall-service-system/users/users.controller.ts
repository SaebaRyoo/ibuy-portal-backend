import { Body, Controller, Post } from '@nestjs/common';
import { Users } from './entitys/users.entity';
import { UsersService } from './users.service';
import { Public } from '../../../common/decorators/metadata/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Public()
  @Post()
  async createUser(@Body() user: Users) {
    return this.userService.create(user);
  }
}
