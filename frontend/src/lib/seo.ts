const FALLBACK_SITE_URL = "https://absolutpc.kz";

function normalizeSiteUrl(value?: string) {
  if (!value) {
    return FALLBACK_SITE_URL;
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export const siteConfig = {
  defaultTitle: "AbsolutPc",
  description:
    "AbsolutPc in Almaty: computers, components, monitors, laptops, and repairs with delivery, installment plans, and real support after purchase.",
  locale: "ru_KZ",
  siteUrl: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) || FALLBACK_SITE_URL,
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined,
  indexableRoutes: ["/absolut-pc"],
} as const;

export function getSiteUrl() {
  try {
    return new URL(siteConfig.siteUrl);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

export function getAbsoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}
