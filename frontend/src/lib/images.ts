const DATA_IMAGE_URL_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);base64,[a-z0-9+/=\s]+$/i;

// Разрешаем http/https URL и относительные пути к изображениям
const HTTP_IMAGE_URL_PATTERN = /^https?:\/\/.+/i;

const RELATIVE_IMAGE_URL_PATTERN = /^\/[^/].*\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

export function isSafeQuestionImageUrl(value: string): boolean {
  return normalizeQuestionImageUrl(value) !== null;
}

export function getSafeQuestionImageUrls(imageUrls?: string[]): string[] {
  return (imageUrls ?? [])
    .map(normalizeQuestionImageUrl)
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
}

export function normalizeQuestionImageUrl(value: string): string | null {
  if (!value) return null;

  const normalized = value.trim().replace(/\s+/g, '');

  // base64 data URL
  if (DATA_IMAGE_URL_PATTERN.test(normalized)) {
    return normalized;
  }

  // http/https URL (изображения с сервера)
  if (HTTP_IMAGE_URL_PATTERN.test(normalized)) {
    return normalized;
  }

  // Относительный путь (например /uploads/image.png)
  if (RELATIVE_IMAGE_URL_PATTERN.test(normalized)) {
    return normalized;
  }

  return null;
}
