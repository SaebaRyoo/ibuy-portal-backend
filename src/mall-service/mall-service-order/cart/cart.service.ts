import { Injectable } from '@nestjs/common';
import { SkuService } from '../../mall-service-goods/sku/sku.service';
import { SpuService } from '../../mall-service-goods/spu/spu.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import Result from '../../../common/utils/Result';
import { AuthService } from '../../mall-service-system/auth/auth.service';

export interface CartItem {
  categoryId1: number;
  categoryId2: number;
  categoryId3: number;
  spuId: string;
  skuId: string;
  name: string;
  price: number;
  num: number;
  money: number;
  payMoney: number;
  image: string;
}

@Injectable()
export class CartService {
  constructor(
    private readonly skuService: SkuService,
    private readonly spuService: SpuService,
    private readonly authService: AuthService,
    @InjectRedis() private readonly redisService: Redis,
  ) {}

  private async resolveUsername(username: string, req?: any): Promise<string> {
    if (req) {
      const decoded = await this.authService.getDecodedToken(req);
      return decoded.loginName || username;
    }
    return username || '';
  }

  private cartKey(username: string): string {
    return `Cart_${username}`;
  }

  private buildCartItem(sku: any, spu: any, num: number): CartItem {
    const money = num * sku.price;
    return {
      categoryId1: spu.category1Id,
      categoryId2: spu.category2Id,
      categoryId3: spu.category3Id,
      spuId: spu.id,
      skuId: sku.id,
      name: sku.name,
      price: sku.price,
      num,
      money,
      payMoney: money,
      image: sku.image,
    };
  }

  private async removeCartItem(username: string, skuId: string): Promise<void> {
    await this.redisService.hdel(this.cartKey(username), skuId);
  }

  private async saveCartItem(
    username: string,
    skuId: string,
    item: CartItem,
  ): Promise<void> {
    await this.redisService.hset(
      this.cartKey(username),
      skuId,
      JSON.stringify(item),
    );
  }

  // 添加商品到购物车
  async add(id: string, num: number, username: string, req: any): Promise<any> {
    const resolvedUsername = await this.resolveUsername(username, req);

    if (num <= 0) {
      await this.removeCartItem(resolvedUsername, id);
      return new Result(null);
    }

    const skuResult = await this.skuService.findById(id);
    const sku = skuResult.data;
    if (!sku) {
      return new Result(null);
    }

    const spuResult = await this.spuService.findById(sku.spuId);
    const cartItem = this.buildCartItem(sku, spuResult.data, num);

    await this.saveCartItem(resolvedUsername, id, cartItem);
    return new Result(null, '购物车添加成功');
  }

  // 获取购物车列表
  async list(username: string, req?: any) {
    const resolvedUsername = await this.resolveUsername(username, req);
    const values = await this.redisService.hvals(
      this.cartKey(resolvedUsername),
    );
    const data: CartItem[] = values.map((value) => JSON.parse(value));

    let totalPrice = 0;
    let totalItems = 0;
    const totalDiscount = 0;
    for (const item of data) {
      totalPrice += item.money * item.num;
      totalItems += item.num;
    }
    return new Result({ data, totalPrice, totalItems, totalDiscount });
  }
}
