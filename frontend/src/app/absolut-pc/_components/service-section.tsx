import type { ServiceFeature } from "../_data/types";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function ServiceSection({
  address,
  hours,
  items,
}: {
  address: string;
  hours: string;
  items: ServiceFeature[];
}) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="В этом блоке лендинг превращает абстрактное доверие в конкретику: как купить, забрать, получить гарантию и к кому обратиться после сделки."
            eyebrow="Доставка и гарантия"
            title="Сценарий покупки выглядит понятным ещё до первого сообщения"
          />
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item, index) => (
              <Reveal delay={index * 0.05} key={item.label}>
                <article className="h-full rounded-[1.7rem] border border-white/10 bg-[#0d1829]/88 p-6 shadow-[0_22px_64px_rgba(0,0,0,0.2)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <LandingIcon className="h-5 w-5 text-[#7ee0ff]" name={item.icon} />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">{item.label}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#8fa5c2]">{item.description}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <aside className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(79,209,255,0.12),rgba(255,255,255,0.03))] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7ee0ff]">
                Локальное доверие
              </p>
              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-sm text-[#8fa5c2]">Адрес</p>
                  <p className="mt-2 text-base font-semibold text-white">{address}</p>
                </div>
                <div>
                  <p className="text-sm text-[#8fa5c2]">Часы работы</p>
                  <p className="mt-2 text-base font-semibold text-white">{hours}</p>
                </div>
                <div>
                  <p className="text-sm text-[#8fa5c2]">Фокус доставки</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    Алматы + понятный самовывоз
                  </p>
                </div>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
