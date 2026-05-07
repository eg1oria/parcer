const DATA_IMAGE_URL_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);base64,[a-z0-9+/=\s]+$/i;

const HTTP_IMAGE_URL_PATTERN = /^https?:\/\/.+/i;

const RELATIVE_IMAGE_URL_PATTERN = /^\/[^/].*\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

function getMediaBaseUrl(): string {
  const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");

  if (mediaBase !== undefined) {
    return mediaBase;
  }

  // Fall back to the API base URL, but strip a trailing /api path segment
  // that is used only for API proxying — media files are served directly
  // from the backend root, not under /api/.
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  // If the API URL is a relative path like "/api", media lives at the origin
  // root (e.g. "/media/..."), so return an empty string so the browser
  // resolves the relative image URL against the page origin.
  if (apiBase.startsWith("/")) {
    return "";
  }

  return apiBase;
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
    return `${getMediaBaseUrl()}${normalized}`;
  }

  return null;
}
