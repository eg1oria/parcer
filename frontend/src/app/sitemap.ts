import type { MetadataRoute } from "next";

import { getAbsoluteUrl, siteConfig } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return siteConfig.indexableRoutes.map((route) => ({
    url: getAbsoluteUrl(route),
    lastModified,
    changeFrequency: "weekly",
    priority: route === "/absolut-pc" ? 1 : 0.8,
  }));
}
