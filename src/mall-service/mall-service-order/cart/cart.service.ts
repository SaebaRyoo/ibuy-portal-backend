import { Injectable } from '@nestjs/common';
import { SkuService } from '../../mall-service-goods/sku/sku.service';
import { SpuService } from '../../mall-service-goods/spu/spu.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { OrderItemsEntity } from '../order-items/entities/order-items.entity';
import Result from '../../../common/utils/Result';
import { AuthService } from '../../mall-service-system/auth/auth.service';

@Injectable()
export class CartService {
  constructor(
    private readonly skuService: SkuService,
    private readonly spuService: SpuService,
    private readonly authService: AuthService,
    @InjectRedis() private readonly redisService: Redis,
  ) {}

  // 添加商品到购物车
  async add(id: string, num: number, username: string, req): Promise<any> {
    const decoded = await this.authService.getDecodedToken(req);
    const _username = decoded.loginName || username; // 获取登录用户的用户名
    const redisClient = this.redisService;

    if (num <= 0) {
      // 删除掉原来的商品
      await redisClient.hdel(`Cart_${_username}`, id);
      return new Result(null);
    }

    // 1. 根据商品的 SKU 的 ID 获取 sku 的数据
    const result = await this.skuService.findById(id);
    const sku = result.data;

    if (sku) {
      // 2. 根据 sku 的数据对象 获取该 SKU 对应的 SPU 的数据
      const result = await this.spuService.findById(sku.spuId);
      const spu = result.data;

      // 3. 将数据存储到购物车对象中 (OrderItem)
      const orderItem = new OrderItemsEntity();
      orderItem.categoryId1 = spu.category1Id;
      orderItem.categoryId2 = spu.category2Id;
      orderItem.categoryId3 = spu.category3Id;
      orderItem.spuId = spu.id;
      orderItem.skuId = id;
      orderItem.name = sku.name; // 商品的名称 sku的名称
      orderItem.price = sku.price; // sku的单价
      orderItem.num = num; // 购买的数量
      orderItem.money = orderItem.num * orderItem.price; // 单价*数量
      orderItem.payMoney = orderItem.num * orderItem.price; // 实付金额
      orderItem.image = sku.image; // 商品的图片地址

      // 4. 数据添加到 Redis 中 key:用户名 field:sku 的 ID value: 购物车数据 (OrderItem)
      await redisClient.hset(
        `Cart_${_username}`,
        id,
        JSON.stringify(orderItem),
      );
      return new Result(null, '购物车添加成功');
    }
    return new Result(null);
  }

  // 获取购物车列表
  async list(username: string, req?: any) {
    let decoded = null;
    let _username = username || '';
    if (req) {
      decoded = await this.authService.getDecodedToken(req);
      _username = decoded.loginName; // 获取登录用户的用户名
    }
    const values = await this.redisService.hvals(`Cart_${_username}`);
    const data = values.map((value) => JSON.parse(value));

    // 计算总价格
    let totalPrice = 0;
    // 计算总数量
    let totalItems = 0;
    // 计算总折扣
    const totalDiscount = 0;
    for (const item of data) {
      totalPrice += item.money * item.num;
      totalItems += parseInt(item.num);
    }
    return new Result({ data, totalPrice, totalItems, totalDiscount });
  }
}
