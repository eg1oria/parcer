import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Sora } from "next/font/google";

import { getAbsoluteUrl, getSiteUrl, siteConfig } from "@/lib/seo";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: siteConfig.defaultTitle,
    template: `%s | ${siteConfig.defaultTitle}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.defaultTitle,
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.defaultTitle,
    url: getSiteUrl(),
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: [
      {
        url: getAbsoluteUrl("/absolut-pc/opengraph-image"),
        width: 1200,
        height: 630,
        alt: siteConfig.defaultTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: [getAbsoluteUrl("/absolut-pc/opengraph-image")],
  },
  verification: {
    google: siteConfig.googleSiteVerification,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru-KZ"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
