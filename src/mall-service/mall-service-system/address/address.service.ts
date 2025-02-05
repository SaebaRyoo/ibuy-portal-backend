import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AddressEntity } from './address.entity';
import { InjectRepository } from '@nestjs/typeorm';
import Result from '../../../common/utils/Result';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(AddressEntity)
    private addressRepository: Repository<AddressEntity>,
  ) {}
  async findList(
    pageParma: any,
  ): Promise<Result<{ data: AddressEntity[]; total: number }>> {
    const qb = this.addressRepository
      .createQueryBuilder('address')
      .skip(pageParma.pageSize * (pageParma.current - 1))
      .limit(pageParma.pageSize);
    const [data, total] = await qb.getManyAndCount();
    return new Result({ data, total });
  }

  async findById(id: number) {
    const data = await this.addressRepository.findOneBy({ id });

    return new Result(data);
  }

  async add(address: AddressEntity) {
    const data = await this.addressRepository.insert(address);
    return new Result(data);
  }

  async update(id: string, address: AddressEntity) {
    const data = await this.addressRepository
      .createQueryBuilder()
      .update(AddressEntity)
      .set(address)
      .where('id = :id', { id })
      .execute();
    return new Result(data);
  }

  async remove(id: number) {
    await this.addressRepository.delete(id);
    return new Result(null);
  }

  async findAll() {
    const data = await this.addressRepository.find();
    return new Result(data);
  }
}
