import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { ResponseMessage } from '../utils/ResponseMessage';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Test, TestingModule } from '@nestjs/testing';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

  const buildContext = (url = '/test/path'): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ url }),
      }),
    }) as unknown as ExecutionContext;

  const buildHandler = (returnValue: unknown): CallHandler => ({
    handle: () => of(returnValue),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformInterceptor,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    interceptor = module.get<TransformInterceptor<unknown>>(TransformInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should wrap a raw object in the standard response envelope', async () => {
      const rawData = { id: 1, name: 'test' };
      const context = buildContext('/v1/brands');
      const handler = buildHandler(rawData);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        code: 200,
        message: 'success',
        data: rawData,
        extra: { path: '/v1/brands' },
      });
    });

    it('should extract data and message from a ResponseMessage instance', async () => {
      const innerData = { id: 42, title: 'item' };
      const response = new ResponseMessage(innerData, 'Created successfully');
      const context = buildContext('/v1/orders');
      const handler = buildHandler(response);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        code: 200,
        message: 'Created successfully',
        data: innerData,
        extra: { path: '/v1/orders' },
      });
    });

    it('should wrap undefined as data: null with default message', async () => {
      const context = buildContext('/v1/nothing');
      const handler = buildHandler(undefined);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        code: 200,
        message: 'success',
        data: null,
        extra: { path: '/v1/nothing' },
      });
    });

    it('should wrap null as data: null with default message', async () => {
      const context = buildContext('/v1/null-case');
      const handler = buildHandler(null);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        code: 200,
        message: 'success',
        data: null,
        extra: { path: '/v1/null-case' },
      });
    });

    it('should wrap array data directly without modification', async () => {
      const arrayData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const context = buildContext('/v1/items');
      const handler = buildHandler(arrayData);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        code: 200,
        message: 'success',
        data: arrayData,
        extra: { path: '/v1/items' },
      });
    });

    it('should reflect the correct request path in extra.path', async () => {
      const context = buildContext('/v1/some/deep/route?foo=bar');
      const handler = buildHandler({ ok: true });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result.extra.path).toBe('/v1/some/deep/route?foo=bar');
    });

    it('should wrap null data inside a ResponseMessage as data: null', async () => {
      const response = new ResponseMessage(null, 'No content');
      const context = buildContext('/v1/empty');
      const handler = buildHandler(response);

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({
        success: true,
        code: 200,
        message: 'No content',
        data: null,
        extra: { path: '/v1/empty' },
      });
    });
  });
});
