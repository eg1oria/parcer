import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.defaultTitle,
    short_name: siteConfig.defaultTitle,
    description: siteConfig.description,
    start_url: "/absolut-pc",
    display: "standalone",
    background_color: "#07111f",
    theme_color: "#07111f",
    lang: "ru-KZ",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
