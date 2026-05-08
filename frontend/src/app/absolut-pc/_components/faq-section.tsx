import type { FaqItem } from "../_data/types";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <section className="py-20 sm:py-28" id="faq">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            align="center"
            description="FAQ помогает снять остаточные возражения перед обращением и делает лендинг похожим на продуманный запуск, а не на красивую заглушку."
            eyebrow="FAQ"
            title="Частые вопросы, которые ускоряют решение написать или позвонить"
          />
        </Reveal>

        <div className="mt-12 space-y-4">
          {items.map((item, index) => (
            <Reveal delay={index * 0.04} key={item.question}>
              <details className="group rounded-[1.7rem] border border-white/10 bg-white/[0.03] px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <span className="text-left text-lg font-semibold text-white">{item.question}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] p-2 transition group-open:rotate-45">
                    <LandingIcon className="h-4 w-4 text-[#7ee0ff]" name="arrow-right" />
                  </span>
                </summary>
                <p className="mt-4 pr-6 text-sm leading-7 text-[#9eb3cc]">{item.answer}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
