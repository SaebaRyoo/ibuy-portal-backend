import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { SkuService } from '../mall-service-goods/sku/sku.service';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { SkuEntity } from '../mall-service-goods/sku/sku.entity';
import Result from '../../common/utils/Result';

@Injectable()
export class SearchService {
  private readonly ES_INDEX = 'skuinfo';
  private readonly SEARCH_PRICE = 'price';
  private readonly SEARCH_CATEGORY = 'categoryName';
  private readonly ES_CATEGORY_AGR = 'categoryNameAgr';
  private readonly SEARCH_BRAND = 'brandName';
  private readonly ES_BRAND_AGR = 'brandNameAgr';
  private readonly ES_SPEC_MAP_AGR = 'specMapAgr';
  private readonly PAGE_SIZE = 30;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly skuService: SkuService, // 注入 SkuService
  ) {}

  // 关键词搜索
  async search(searchMap: Record<string, string>) {
    let keywords = searchMap['keywords'];
    if (!keywords) {
      keywords = ''; // 默认搜索关键字
      // keywords = '华为'; // 默认搜索关键字
    }

    //一.构建过滤语句
    const boolQuery = {
      bool: {
        must: [],
        filter: [],
      },
    };

    // 1.1 关键字查询
    if (keywords) {
      boolQuery.bool.must.push({
        match: {
          name: keywords,
        },
      });
    }

    // 1.2 分类过滤
    if (searchMap[this.SEARCH_CATEGORY]) {
      boolQuery.bool.filter.push({
        term: {
          [`${this.SEARCH_CATEGORY}.keyword`]: searchMap[this.SEARCH_CATEGORY],
        },
      });
    }

    // 1.3. 品牌过滤
    if (searchMap[this.SEARCH_BRAND]) {
      boolQuery.bool.filter.push({
        term: {
          [`${this.SEARCH_BRAND}.keyword`]: searchMap[this.SEARCH_BRAND],
        },
      });
    }

    // 1.4. 规格过滤
    Object.keys(searchMap).forEach((key) => {
      if (key.startsWith('spec_')) {
        if (typeof searchMap[key] === 'string') {
          boolQuery.bool.filter.push({
            term: {
              [`spec.${key.substring(5)}.keyword`]: searchMap[key],
            },
          });
        } else if (Array.isArray(searchMap[key])) {
          boolQuery.bool.filter.push({
            terms: {
              [`spec.${key.substring(5)}.keyword`]: searchMap[key],
            },
          });
        }
      }
    });

    // 1.5. 价格过滤
    const price = searchMap[this.SEARCH_PRICE];
    if (price) {
      const [minPrice, maxPrice] = price.split('-');
      if (maxPrice !== '*') {
        boolQuery.bool.filter.push({
          range: {
            price: { gte: minPrice, lte: maxPrice },
          },
        });
      } else {
        boolQuery.bool.filter.push({
          range: {
            price: { gte: minPrice },
          },
        });
      }
    }

    // 构建搜索请求
    const searchRequest = {
      index: this.ES_INDEX,
      from: (this.pageConvert(searchMap) - 1) * this.PAGE_SIZE,
      size: this.PAGE_SIZE,
      query: boolQuery,
      sort: [],
      aggregations: {},
    };

    // 二. 排序
    const sortField = searchMap['sortField'];
    const sortRule = searchMap['sortRule'];
    if (sortField && sortRule) {
      searchRequest.sort.push({
        [sortField]: {
          order: sortRule.toLowerCase() === 'desc' ? 'desc' : 'asc',
        },
      });
    }

    // 三、聚合数据
    searchRequest.aggregations = {
      // 分类聚合
      [this.ES_CATEGORY_AGR]: {
        terms: { field: `${this.SEARCH_CATEGORY}.keyword`, size: 50 },
      },
      // 品牌聚合
      [this.ES_BRAND_AGR]: {
        terms: { field: `${this.SEARCH_BRAND}.keyword`, size: 50 },
      },
      // 商品规格聚合
      [this.ES_SPEC_MAP_AGR]: {
        terms: { field: 'spec.keyword', size: 10000 },
      },
    };

    const response =
      await this.elasticsearchService.search<SkuEntity>(searchRequest);

    // 解析结果
    const resultMap = new Map();

    // 判断是否需要回显数据
    // 如果没有传分类名，就回显聚合的分类数据
    if (!searchMap[this.SEARCH_CATEGORY]) {
      const categoryList = this.getAggregationData(
        response,
        this.ES_CATEGORY_AGR,
      );
      resultMap.set('categoryList', categoryList);
    }
    // 如果没有传品牌名，就回显聚合的品牌数据
    if (!searchMap[this.SEARCH_BRAND]) {
      const brandList = this.getAggregationData(response, this.ES_BRAND_AGR);
      resultMap.set('brandList', brandList);
    }
    const specMap = this.getStringSetMap(
      response,
      this.ES_SPEC_MAP_AGR,
      searchMap,
    );
    resultMap.set('specMap', specMap);

    const skuInfos = response.hits.hits.map((hit) => hit._source);
    resultMap.set('rows', skuInfos);
    resultMap.set('pageSize', this.PAGE_SIZE);
    resultMap.set('pageNumber', this.pageConvert(searchMap));
    if (
      typeof response.hits.total === 'object' &&
      'value' in response.hits.total
    ) {
      resultMap.set('total', response.hits.total.value);
      resultMap.set(
        'totalPages',
        Math.ceil(response.hits.total.value / this.PAGE_SIZE),
      );
    } else {
      // 如果是 long 类型，直接将其当作 number 使用
      resultMap.set('total', response.hits.total);
      resultMap.set(
        'totalPages',
        Math.ceil(response.hits.total / this.PAGE_SIZE),
      );
    }

    // return resultMap;
    return new Result({ data: Object.fromEntries(resultMap) });
  }

  private pageConvert(searchMap: Record<string, string>): number {
    let pageNum = 1;
    if (searchMap['pageNum']) {
      try {
        pageNum = parseInt(searchMap['pageNum'], 10);
        if (pageNum < 1) pageNum = 1;
      } catch {
        pageNum = 1;
      }
    }
    return pageNum;
  }

  /**
   * 获取分类、品牌数据
   *
   * @param response
   * @param agrName
   * @return
   */
  private getAggregationData(
    response: SearchResponse<SkuEntity>,
    agrName: string,
  ): string[] {
    const data = [];
    const buckets = (response.aggregations[agrName] as any).buckets;
    buckets.forEach((bucket) => data.push(bucket.key));
    return data;
  }

  /**
   * 获取规格列表数据
   *
   * @param response  elasticsearch返回的数据
   * @param agrName   聚合数据时起的别名
   * @param searchMap 客户端传入的数据
   * @return
   */
  private getStringSetMap(
    response: SearchResponse<SkuEntity>,
    agrName: string,
    searchMap: Record<string, string>,
  ): Record<string, Set<string>> {
    const specMap = {};
    const buckets = (response.aggregations[agrName] as any).buckets;
    buckets.forEach((bucket) => {
      const specJson = bucket.key;
      const spec = JSON.parse(specJson);
      Object.keys(spec).forEach((key) => {
        if (!searchMap[`spec_${key}`]) {
          if (!specMap[key]) {
            specMap[key] = new Set();
          }
          specMap[key].add(spec[key]);
        }
      });
    });
    return specMap;
  }

  async importSku(): Promise<void> {
    // 从 sku 服务获取 SKU 列表
    const result = await this.skuService.findList({
      current: 1,
      pageSize: 99999,
    });
    const skuInfos = result.data.data;
    const total = result.data.total;
    // 构建 Bulk 请求  将每个 SKU 信息的索引操作和文档内容展平为一个单一的数组
    const body = skuInfos.flatMap((skuInfo) => {
      return [
        { index: { _index: 'skuinfo', _id: skuInfo.id } }, // 创建索引操作
        skuInfo, // 文档内容
      ];
    });

    // 执行 Bulk 导入
    if (body.length) {
      await this.elasticsearchService.bulk({
        operations: body,
      });
    }
  }
}
