import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from './entitys/users.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
  ) {}

  findAll(): Promise<Users[]> {
    return this.usersRepository.find();
  }

  findOne(login_name: string): Promise<Users | null> {
    return this.usersRepository.findOneBy({ login_name });
  }

  async create(data: Users) {
    const _data = { ...data };

    const saltOrRounds = 10;
    const hash = await bcrypt.hash(_data.password, saltOrRounds);

    _data.password = hash;

    return this.usersRepository.insert(_data);
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
