const DATA_IMAGE_URL_PATTERN =
  /^data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);base64,[a-z0-9+/=\s]+$/i;
const HTTP_IMAGE_URL_PATTERN = /^https?:\/\/.+/i;
const RELATIVE_IMAGE_URL_PATTERN =
  /^\/[^/].*\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

export function normalizeQuestionImageUrl(value: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, '');

  if (DATA_IMAGE_URL_PATTERN.test(normalized)) {
    return normalized;
  }

  if (HTTP_IMAGE_URL_PATTERN.test(normalized)) {
    return normalized;
  }

  if (RELATIVE_IMAGE_URL_PATTERN.test(normalized)) {
    return normalized;
  }

  return null;
}

export function isQuestionImageUrl(value: string): boolean {
  return normalizeQuestionImageUrl(value) !== null;
}
