import type { ActionLink, LandingStat } from "../_data/types";
import { ActionLinkButton } from "./action-link";
import { HeroVisual } from "./hero-visual";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";

export function HeroSection({
  address,
  description,
  hours,
  imageAlt,
  imageHeight,
  imageSrc,
  imageWidth,
  primaryAction,
  ratingLabel,
  secondaryAction,
  title,
}: {
  address: string;
  description: string;
  hours: string;
  imageAlt: string;
  imageHeight: number;
  imageSrc: string;
  imageWidth: number;
  primaryAction: ActionLink;
  ratingLabel: string;
  secondaryAction: ActionLink;
  title: string;
}) {
  const quickProof: LandingStat[] = [
    {
      value: address,
      label: "Адрес магазина",
      detail: "Самовывоз и живая консультация",
      icon: "map-pinned",
    },
    {
      value: hours,
      label: "Часы работы",
      detail: "Открыто по будням",
      icon: "clock-3",
    },
    {
      value: ratingLabel,
      label: "Репутация в 2GIS",
      detail: "Реальные отзывы покупателей",
      icon: "star",
    },
  ];

  return (
    <section className="relative overflow-hidden pb-18 pt-14 sm:pb-24 sm:pt-20" id="top">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(79,209,255,0.16),transparent_22%),radial-gradient(circle_at_85%_14%,rgba(255,194,75,0.18),transparent_18%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_50%)]" />
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-8">
        <div className="relative z-10">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#7ee0ff]">
              <span className="h-2 w-2 rounded-full bg-[#4fd1ff]" />
              Premium store launch-ready
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.34em] text-[#ffc24b]">
              Экспертный магазин техники
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <h1 className="font-brand mt-5 max-w-4xl text-4xl leading-[1.03] text-white sm:text-5xl lg:text-[5.2rem]">
              {title}
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#b9cae2] sm:text-xl">
              {description}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLinkButton action={primaryAction} className="min-w-[15rem] px-6 py-4 text-base" />
              <ActionLinkButton
                action={secondaryAction}
                className="min-w-[15rem] px-6 py-4 text-base"
                variant="secondary"
              />
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {quickProof.map((item) => (
                <div
                  className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                  key={item.label}
                >
                  <LandingIcon className="h-5 w-5 text-[#7ee0ff]" name={item.icon} />
                  <p className="mt-4 text-sm text-[#90a6c4]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white">{item.value}</p>
                  <p className="mt-1 text-xs leading-5 text-[#7f94b1]">{item.detail}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal className="relative z-10" delay={0.18}>
          <HeroVisual alt={imageAlt} height={imageHeight} src={imageSrc} width={imageWidth} />
        </Reveal>
      </div>
    </section>
  );
}
