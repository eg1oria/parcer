import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  json,
  static as serveStatic,
  type NextFunction,
  type Request,
  type Response,
  urlencoded,
} from 'express';
import { getPositiveIntConfig } from './common/config/env-number';
import {
  IMPORTED_IMAGE_ROUTE_PREFIX,
  IMPORTED_IMAGE_STORAGE_PATH,
} from './files/files.constants';

export const DEFAULT_REQUEST_BODY_SIZE_BYTES = 1024 * 1024;
export const MAX_REQUEST_BODY_SIZE_BYTES = 2 * 1024 * 1024;
const DEFAULT_CORS_ORIGINS = ['http://localhost:3001', 'http://127.0.0.1:3001'];
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_REJECTION_MESSAGE = 'Cross-site unsafe requests are not allowed';

export const NEST_APP_FACTORY_OPTIONS = {
  bodyParser: false,
} as const;

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const requestBodySizeLimit = getRequestBodySizeLimit(configService);
  const allowedCorsOrigins = getAllowedCorsOrigins(configService);

  app.use(
    createUnsafeRequestOriginProtectionMiddleware(
      getTrustedUnsafeRequestOrigins(configService, allowedCorsOrigins),
    ),
  );
  app.use(json({ limit: requestBodySizeLimit }));
  app.use(urlencoded({ extended: true, limit: requestBodySizeLimit }));
  app.use(
    IMPORTED_IMAGE_ROUTE_PREFIX,
    serveStatic(IMPORTED_IMAGE_STORAGE_PATH, {
      fallthrough: true,
      immutable: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    }),
  );
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        allowedCorsOrigins.includes('*') ||
        allowedCorsOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

export function getRequestBodySizeLimit(configService: ConfigService): number {
  return Math.min(
    getPositiveIntConfig(
      configService,
      'MAX_REQUEST_BODY_SIZE_BYTES',
      DEFAULT_REQUEST_BODY_SIZE_BYTES,
    ),
    MAX_REQUEST_BODY_SIZE_BYTES,
  );
}

function getAllowedCorsOrigins(configService: ConfigService): string[] {
  const configuredOrigins = configService.get<string>('CORS_ORIGINS');

  if (!configuredOrigins) {
    return DEFAULT_CORS_ORIGINS;
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function getTrustedUnsafeRequestOrigins(
  configService: ConfigService,
  allowedCorsOrigins: string[],
): string[] {
  const configuredOrigins = configService.get<string>('CSRF_TRUSTED_ORIGINS');

  if (!configuredOrigins) {
    return allowedCorsOrigins.filter((origin) => origin !== '*');
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function createUnsafeRequestOriginProtectionMiddleware(
  trustedOrigins: string[],
): (request: Request, response: Response, next: NextFunction) => void {
  const normalizedTrustedOrigins = new Set(
    trustedOrigins
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin)),
  );

  return (request: Request, response: Response, next: NextFunction) => {
    if (SAFE_HTTP_METHODS.has(request.method.toUpperCase())) {
      next();
      return;
    }

    const requestOrigin = getRequestOrigin(request);

    if (requestOrigin) {
      normalizedTrustedOrigins.add(requestOrigin);
    }

    const originHeader = readFirstHeaderValue(request.headers.origin);

    if (originHeader) {
      const normalizedOrigin = normalizeOrigin(originHeader);

      if (normalizedOrigin && normalizedTrustedOrigins.has(normalizedOrigin)) {
        next();
        return;
      }

      rejectUnsafeCrossSiteRequest(response);
      return;
    }

    const refererHeader = readFirstHeaderValue(request.headers.referer);

    if (refererHeader) {
      const normalizedRefererOrigin = extractOrigin(refererHeader);

      if (
        normalizedRefererOrigin &&
        normalizedTrustedOrigins.has(normalizedRefererOrigin)
      ) {
        next();
        return;
      }

      rejectUnsafeCrossSiteRequest(response);
      return;
    }

    next();
  };
}

function rejectUnsafeCrossSiteRequest(response: Response): void {
  response.status(403).json({
    statusCode: 403,
    error: 'Forbidden',
    message: CSRF_REJECTION_MESSAGE,
  });
}

function getRequestOrigin(request: Request): string | null {
  const protocolHeader = readFirstHeaderValue(
    request.headers['x-forwarded-proto'],
  );
  const hostHeader =
    readFirstHeaderValue(request.headers['x-forwarded-host']) ??
    readFirstHeaderValue(request.headers.host);
  const protocol = protocolHeader ?? request.protocol;

  if (!protocol || !hostHeader) {
    return null;
  }

  return normalizeOrigin(`${protocol}://${hostHeader}`);
}

function extractOrigin(value: string): string | null {
  try {
    return normalizeOrigin(new URL(value).origin);
  } catch {
    return null;
  }
}

function normalizeOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin.toLowerCase();
  } catch {
    return null;
  }
}

function readFirstHeaderValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === 'string' ? value : null;
}
