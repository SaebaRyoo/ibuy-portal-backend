import { SpuEntity } from './spu.entity';
import { SkuEntity } from '../sku/sku.entity';

export type GoodsType = {
  spu: SpuEntity;
  //SKU集合
  skuList: Array<SkuEntity>;
};
