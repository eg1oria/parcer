import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { getPositiveIntConfig } from './common/config/env-number';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from './files/files.constants';

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
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
