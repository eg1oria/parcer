import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  configureApp,
  DEFAULT_REQUEST_BODY_SIZE_BYTES,
  getRequestBodySizeLimit,
  MAX_REQUEST_BODY_SIZE_BYTES,
} from './app.setup';
import { IMPORTED_IMAGE_ROUTE_PREFIX } from './files/files.constants';

function createConfigService(
  values: Record<string, string | number | undefined>,
): ConfigService {
  return {
    get: (key: string) => values[key],
  } as ConfigService;
}

describe('configureApp', () => {
  it('uses the safe default request body limit when config is missing', () => {
    expect(getRequestBodySizeLimit(createConfigService({}))).toBe(
      DEFAULT_REQUEST_BODY_SIZE_BYTES,
    );
  });

  it('caps the configured request body limit to the safe maximum', () => {
    expect(
      getRequestBodySizeLimit(
        createConfigService({
          MAX_REQUEST_BODY_SIZE_BYTES: MAX_REQUEST_BODY_SIZE_BYTES * 10,
        }),
      ),
    ).toBe(MAX_REQUEST_BODY_SIZE_BYTES);
  });

  it('registers unsafe-origin protection before body parsers', () => {
    const use = jest.fn();
    const enableCors = jest.fn();
    const useGlobalPipes = jest.fn();
    const app = {
      get: jest.fn().mockReturnValue(createConfigService({})),
      use,
      enableCors,
      useGlobalPipes,
    } as unknown as INestApplication;

    configureApp(app);

    const useCalls = use.mock.calls as unknown[][];

    expect(useCalls[0]).toHaveLength(1);
    expect(typeof useCalls[0][0]).toBe('function');
    expect(useCalls[1]).toHaveLength(1);
    expect(typeof useCalls[1][0]).toBe('function');
    expect(useCalls[2]).toHaveLength(1);
    expect(typeof useCalls[2][0]).toBe('function');
    expect(useCalls[3][0]).toBe(IMPORTED_IMAGE_ROUTE_PREFIX);
    expect(enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedHeaders: ['Authorization', 'Content-Type'],
      }),
    );
    expect(useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
  });
});
