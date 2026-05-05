import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, static as serveStatic, urlencoded } from 'express';
import { getPositiveIntConfig } from './common/config/env-number';
import {
  IMPORTED_IMAGE_ROUTE_PREFIX,
  IMPORTED_IMAGE_STORAGE_PATH,
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from './files/files.constants';

const DEFAULT_REQUEST_BODY_SIZE_BYTES = Math.ceil(
  MAX_UPLOAD_FILE_SIZE_BYTES * 2,
);

export const NEST_APP_FACTORY_OPTIONS = {
  bodyParser: false,
} as const;

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const requestBodySizeLimit = getPositiveIntConfig(
    configService,
    'MAX_REQUEST_BODY_SIZE_BYTES',
    DEFAULT_REQUEST_BODY_SIZE_BYTES,
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
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
