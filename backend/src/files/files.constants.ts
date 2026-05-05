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
