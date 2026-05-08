import type { CategoryCard } from "../_data/types";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function CategoriesSection({ items }: { items: CategoryCard[] }) {
  return (
    <section className="py-20 sm:py-28" id="categories">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="PC-first позиционирование остаётся главным: именно здесь бренд выглядит самым экспертным. Бытовая техника добавляет ощущение полноты предложения, но не спорит с ядром."
            eyebrow="Категории"
            title="Категории, которые продают не просто ассортимент, а уверенность в правильном выборе"
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {items.map((item, index) => (
            <Reveal delay={index * 0.04} key={item.title}>
              <article className="h-full rounded-[1.7rem] border border-white/8 bg-[#0d1829]/88 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <LandingIcon className="h-5 w-5 text-[#7ee0ff]" name={item.icon} />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-[#c8d7ed]">
                    {item.price}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#8fa5c2]">{item.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
