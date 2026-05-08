import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeDollarSign,
  BadgeHelp,
  Box,
  CheckCheck,
  Clock3,
  Cpu,
  Headset,
  LaptopMinimal,
  MapPinned,
  MessageCircle,
  Monitor,
  PackageCheck,
  PcCase,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  WalletCards,
  Wrench,
} from "lucide-react";

import type { LandingIconKey } from "../_data/types";

const landingIcons: Record<LandingIconKey, LucideIcon> = {
  "arrow-right": ArrowRight,
  "badge-dollar-sign": BadgeDollarSign,
  "badge-help": BadgeHelp,
  box: Box,
  "check-check": CheckCheck,
  "clock-3": Clock3,
  cpu: Cpu,
  headset: Headset,
  "laptop-minimal": LaptopMinimal,
  "map-pinned": MapPinned,
  "message-circle": MessageCircle,
  monitor: Monitor,
  "package-check": PackageCheck,
  "pc-case": PcCase,
  phone: Phone,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  truck: Truck,
  "wallet-cards": WalletCards,
  wrench: Wrench,
};

export function LandingIcon({
  name,
  className,
  strokeWidth = 1.8,
}: {
  className?: string;
  name: LandingIconKey;
  strokeWidth?: number;
}) {
  const Icon = landingIcons[name];

  return <Icon aria-hidden="true" className={className} strokeWidth={strokeWidth} />;
}
