import type { ReactNode } from "react";

import type { ActionLink } from "../_data/types";
import { LandingIcon } from "./icon-map";

type Variant = "ghost" | "primary" | "secondary";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#ffc24b] text-slate-950 shadow-[0_18px_40px_rgba(255,194,75,0.28)] hover:-translate-y-0.5 hover:bg-[#ffd16d]",
  secondary:
    "border border-white/12 bg-white/[0.05] text-[#eaf2ff] shadow-[0_14px_32px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]",
  ghost:
    "border border-white/10 bg-transparent text-[#c6d5ec] hover:border-white/16 hover:bg-white/[0.04] hover:text-white",
};

export function ActionLinkButton({
  action,
  className,
  suffix,
  variant = "primary",
}: {
  action: ActionLink;
  className?: string;
  suffix?: ReactNode;
  variant?: Variant;
}) {
  return (
    <a
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold tracking-[0.02em] transition duration-300 ${variantClasses[variant]} ${className ?? ""}`}
      href={action.href}
      rel={action.href.startsWith("http") ? "noreferrer" : undefined}
      target={action.href.startsWith("http") ? "_blank" : undefined}
    >
      <LandingIcon className="h-4 w-4" name={action.icon} />
      <span>{action.label}</span>
      {suffix}
    </a>
  );
}
