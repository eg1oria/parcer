import type { ComparisonPoint } from "../_data/types";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function ComparisonSection({ items }: { items: ComparisonPoint[] }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="Сравнение подаётся уважительно и по делу: не через громкие обещания про цену, а через сервисную глубину, экспертность и сопровождение после покупки."
            eyebrow="Kaspi vs AbsolutPc"
            title="Почему клиенту выгоднее обратиться в AbsolutPc, чем остаться один на один с маркетплейсом"
          />
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {items.map((item, index) => (
            <Reveal delay={index * 0.05} key={item.title}>
              <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-[#101b2e] p-3">
                    <LandingIcon className="h-5 w-5 text-[#7ee0ff]" name={item.icon} />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-[#4fd1ff]/18 bg-[#0e1d30] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7ee0ff]">
                      AbsolutPc
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#dce7f8]">{item.absolut}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/8 bg-[#0b1524] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#92a7c3]">
                      Маркетплейс
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#9bb0c9]">{item.kaspi}</p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
