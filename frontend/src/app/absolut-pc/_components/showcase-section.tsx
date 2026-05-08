import Image from "next/image";

import type { ShowcaseItem } from "../_data/types";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function ShowcaseSection({ items }: { items: ShowcaseItem[] }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="Витрина выглядит как готовый к запуску premium-showcase: с акцентом на то, что магазин умеет закрывать и покупку, и апгрейд, и ремонт."
            eyebrow="Витрина"
            title="Сильная showcase-подача вместо сухого каталога без лица"
          />
        </Reveal>

        <div className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {items.map((item, index) => (
            <Reveal className="min-w-[18.5rem] snap-start lg:min-w-0" delay={index * 0.04} key={item.title}>
              <article className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1524]/90 shadow-[0_28px_80px_rgba(0,0,0,0.24)]">
                <div className="relative overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_top,rgba(79,209,255,0.2),transparent_34%),radial-gradient(circle_at_bottom,rgba(255,194,75,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 pb-4 pt-5">
                  <Image
                    alt={item.imageAlt}
                    className="h-auto w-full"
                    height={item.imageHeight}
                    sizes="(max-width: 1024px) 280px, 360px"
                    src={item.imageSrc}
                    width={item.imageWidth}
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                    <span className="rounded-full border border-[#ffc24b]/22 bg-[#ffc24b]/10 px-3 py-1 text-xs font-semibold text-[#ffd574]">
                      {item.price}
                    </span>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-7 text-[#8fa5c2]">{item.blurb}</p>
                  <p className="mt-6 border-t border-white/8 pt-4 text-sm font-medium text-[#dbe6f8]">
                    {item.note}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
