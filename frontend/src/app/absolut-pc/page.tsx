import type { Metadata } from 'next';

import { BenefitsSection } from './_components/benefits-section';
import { CategoriesSection } from './_components/categories-section';
import { ComparisonSection } from './_components/comparison-section';
import { FaqSection } from './_components/faq-section';
import { FinalCtaSection } from './_components/final-cta-section';
import { HeroSection } from './_components/hero-section';
import { InstallmentSection } from './_components/installment-section';
import { MobileCta } from './_components/mobile-cta';
import { RepairSection } from './_components/repair-section';
import { ReviewsSection } from './_components/reviews-section';
import { ServiceSection } from './_components/service-section';
import { ShowcaseSection } from './_components/showcase-section';
import { SiteFooter } from './_components/site-footer';
import { SiteHeader } from './_components/site-header';
import { TrustBar } from './_components/trust-bar';
import { landingContent } from './_data/content';

const { metadata: pageMetadata } = landingContent;

export const metadata: Metadata = {
  metadataBase: new URL('https://absolutpc.kz'),
  title: pageMetadata.title,
  description: pageMetadata.description,
  alternates: {
    canonical: landingContent.canonicalUrl,
  },
  openGraph: {
    title: pageMetadata.title,
    description: pageMetadata.description,
    locale: 'ru_KZ',
    siteName: landingContent.storeName,
    type: 'website',
    url: landingContent.canonicalUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: pageMetadata.title,
    description: pageMetadata.description,
  },
};

function buildJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['ComputerStore', 'LocalBusiness'],
    name: landingContent.storeName,
    description: landingContent.metadata.description,
    url: landingContent.canonicalUrl,
    telephone: landingContent.phoneDisplay,
    image: `${landingContent.canonicalUrl}/opengraph-image`,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KZ',
      addressLocality: landingContent.city,
      streetAddress: landingContent.address,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '10:30',
        closes: '19:00',
      },
    ],
    areaServed: landingContent.city,
    sameAs: [landingContent.reviewsUrl],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '15',
      ratingCount: '19',
    },
  };
}

export default function AbsolutPcPage() {
  const whatsappAction = {
    href: landingContent.whatsappHref,
    icon: 'message-circle' as const,
    label: 'Написать в WhatsApp',
  };

  const phoneAction = {
    href: landingContent.phoneHref,
    icon: 'phone' as const,
    label: 'Позвонить',
  };

  const repairAction = {
    href: 'https://wa.me/77476245578?text=%D0%A5%D0%BE%D1%87%D1%83%20%D0%BE%D1%82%D0%BF%D1%80%D0%B0%D0%B2%D0%B8%D1%82%D1%8C%20%D0%B7%D0%B0%D1%8F%D0%B2%D0%BA%D1%83%20%D0%BD%D0%B0%20%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82%20%D0%B2%20AbsolutPc',
    icon: 'message-circle' as const,
    label: 'Отправить заявку на ремонт',
  };

  const jsonLd = buildJsonLd();

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />

      <div className="absolutpc-shell font-ui relative min-h-screen overflow-x-hidden bg-absolut-bg text-absolut-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-100">
          <div className="absolutpc-grid absolute inset-0" />
          <div className="absolutpc-noise absolute inset-0" />
        </div>

        <SiteHeader
          phoneAction={phoneAction}
          storeName={landingContent.storeName}
          whatsappAction={whatsappAction}
        />

        <main className="relative z-10">
          <HeroSection
            address={`${landingContent.city}, ${landingContent.address}`}
            description={landingContent.hero.description}
            hours={landingContent.hours}
            imageAlt={landingContent.hero.imageAlt}
            imageHeight={landingContent.hero.imageHeight}
            imageSrc={landingContent.hero.imageSrc}
            imageWidth={landingContent.hero.imageWidth}
            primaryAction={landingContent.hero.primaryAction}
            ratingLabel={landingContent.stats[0].value}
            secondaryAction={landingContent.hero.secondaryAction}
            title={landingContent.hero.title}
          />

          <TrustBar items={landingContent.stats} />
          <BenefitsSection items={landingContent.benefits} />
          <CategoriesSection items={landingContent.categories} />
          <ShowcaseSection items={landingContent.showcase} />
          <ComparisonSection items={landingContent.comparison} />
          <InstallmentSection
            action={whatsappAction}
            description={landingContent.installment.description}
            points={landingContent.installment.points}
            title={landingContent.installment.title}
          />
          <ServiceSection
            address={`${landingContent.city}, ${landingContent.address}`}
            hours={landingContent.hours}
            items={landingContent.deliveryFeatures}
          />
          <RepairSection
            action={repairAction}
            checklist={landingContent.repair.checklist}
            description={landingContent.repair.description}
            imageAlt={landingContent.repair.imageAlt}
            imageHeight={landingContent.repair.imageHeight}
            imageSrc={landingContent.repair.imageSrc}
            imageWidth={landingContent.repair.imageWidth}
            title={landingContent.repair.title}
          />
          <ReviewsSection items={landingContent.reviews} reviewsUrl={landingContent.reviewsUrl} />
          <FaqSection items={landingContent.faqs} />
          <FinalCtaSection
            note={landingContent.cta.note}
            phoneAction={phoneAction}
            title={landingContent.cta.title}
            whatsappAction={whatsappAction}
          />
        </main>

        <SiteFooter
          address={`${landingContent.city}, ${landingContent.address}`}
          hours={landingContent.hours}
          phoneDisplay={landingContent.phoneDisplay}
          phoneHref={landingContent.phoneHref}
          reviewsUrl={landingContent.reviewsUrl}
          storeName={landingContent.storeName}
          whatsappAction={whatsappAction}
        />

        <MobileCta
          phoneHref={landingContent.phoneHref}
          whatsappHref={landingContent.whatsappHref}
        />
      </div>
    </>
  );
}
