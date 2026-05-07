const DATA_IMAGE_URL_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);base64,[a-z0-9+/=\s]+$/i;

const HTTP_IMAGE_URL_PATTERN = /^https?:\/\/.+/i;

const RELATIVE_IMAGE_URL_PATTERN = /^\/[^/].*\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

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

  if (DATA_IMAGE_URL_PATTERN.test(normalized)) {
    return normalized;
  }

  if (HTTP_IMAGE_URL_PATTERN.test(normalized)) {
    return normalized;
  }

  // Relative path from backend — prepend the API base URL so the browser
  // fetches the image from the backend, not from the frontend dev server.
  if (RELATIVE_IMAGE_URL_PATTERN.test(normalized)) {
    return `${getApiBaseUrl()}${normalized}`;
  }

  return null;
}
