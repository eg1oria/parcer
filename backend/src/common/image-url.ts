const DATA_IMAGE_URL_PATTERN =
  /^data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);base64,[a-z0-9+/=\s]+$/i;

export function normalizeQuestionImageUrl(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, '');

  if (!DATA_IMAGE_URL_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function isQuestionImageUrl(value: string): boolean {
  return normalizeQuestionImageUrl(value) !== null;
}
