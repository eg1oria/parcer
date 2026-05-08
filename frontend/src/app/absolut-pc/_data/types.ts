export type LandingIconKey =
  | "arrow-right"
  | "badge-dollar-sign"
  | "badge-help"
  | "box"
  | "check-check"
  | "clock-3"
  | "cpu"
  | "headset"
  | "laptop-minimal"
  | "map-pinned"
  | "message-circle"
  | "monitor"
  | "package-check"
  | "pc-case"
  | "phone"
  | "shield-check"
  | "sparkles"
  | "star"
  | "truck"
  | "wallet-cards"
  | "wrench";

export interface ActionLink {
  href: string;
  icon: LandingIconKey;
  label: string;
}

export interface LandingStat {
  detail: string;
  icon: LandingIconKey;
  label: string;
  value: string;
}

export interface BenefitItem {
  description: string;
  icon: LandingIconKey;
  title: string;
}

export interface CategoryCard {
  description: string;
  icon: LandingIconKey;
  price: string;
  title: string;
}

export interface ShowcaseItem {
  blurb: string;
  imageAlt: string;
  imageHeight: number;
  imageSrc: string;
  imageWidth: number;
  note: string;
  price: string;
  title: string;
}

export interface ComparisonPoint {
  absolut: string;
  icon: LandingIconKey;
  kaspi: string;
  title: string;
}

export interface ServiceFeature {
  description: string;
  icon: LandingIconKey;
  label: string;
}

export interface ReviewQuote {
  author: string;
  highlight: string;
  sourceHref: string;
  sourceLabel: string;
  text: string;
}

export interface FaqItem {
  answer: string;
  question: string;
}

export interface LandingContent {
  address: string;
  benefits: BenefitItem[];
  canonicalUrl: string;
  categories: CategoryCard[];
  city: string;
  comparison: ComparisonPoint[];
  cta: {
    note: string;
    title: string;
  };
  deliveryFeatures: ServiceFeature[];
  faqs: FaqItem[];
  hero: {
    badge: string;
    description: string;
    imageAlt: string;
    imageHeight: number;
    imageSrc: string;
    imageWidth: number;
    primaryAction: ActionLink;
    secondaryAction: ActionLink;
    title: string;
  };
  hours: string;
  installment: {
    description: string;
    points: string[];
    title: string;
  };
  metadata: {
    description: string;
    title: string;
  };
  phoneDisplay: string;
  phoneHref: string;
  repair: {
    checklist: string[];
    description: string;
    imageAlt: string;
    imageHeight: number;
    imageSrc: string;
    imageWidth: number;
    title: string;
  };
  reviews: ReviewQuote[];
  reviewsUrl: string;
  showcase: ShowcaseItem[];
  stats: LandingStat[];
  storeName: string;
  trustLine: string;
  whatsappHref: string;
}
