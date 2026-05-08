import type { BenefitItem } from "../_data/types";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function BenefitsSection({ items }: { items: BenefitItem[] }) {
  return (
    <section className="py-20 sm:py-28" id="benefits">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="Сайт должен вызывать ощущение спокойной уверенности: здесь помогут подобрать, объяснят без давления и останутся на связи после покупки."
            eyebrow="Преимущества"
            title="Почему AbsolutPc выглядит и ощущается дороже большинства конкурентов"
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <Reveal delay={index * 0.05} key={item.title}>
              <article className="group h-full rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-[#4fd1ff]/28 hover:bg-white/[0.05]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#101d31] text-[#7ee0ff]">
                  <LandingIcon className="h-5 w-5" name={item.icon} />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#8fa5c2]">{item.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
