import { resolve } from 'node:path';

export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_FILE_EXTENSIONS = [
  '.txt',
  '.doc',
  '.docx',
  '.pdf',
] as const;

export const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'application/octet-stream',
  'application/msword',
  'application/x-msword',
  'application/vnd.ms-word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
] as const;

export const IMPORTED_IMAGE_ROUTE_PREFIX = '/media/imported-tests';
export const IMPORTED_IMAGE_STORAGE_PATH = resolve(
  process.cwd(),
  '.tmp',
  'imported-tests',
);
export const IMPORTED_IMAGE_PREVIEW_SEGMENT = 'preview';
export const IMPORTED_IMAGE_PREVIEW_ROUTE_PREFIX = `${IMPORTED_IMAGE_ROUTE_PREFIX}/${IMPORTED_IMAGE_PREVIEW_SEGMENT}`;
export const IMPORTED_IMAGE_PREVIEW_STORAGE_PATH = resolve(
  IMPORTED_IMAGE_STORAGE_PATH,
  IMPORTED_IMAGE_PREVIEW_SEGMENT,
);
