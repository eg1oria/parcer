import type { ReviewQuote } from "../_data/types";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function ReviewsSection({
  items,
  reviewsUrl,
}: {
  items: ReviewQuote[];
  reviewsUrl: string;
}) {
  return (
    <section className="py-20 sm:py-28" id="reviews">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="Отзывы помогают заземлить премиальную подачу и доказать, что за дизайном стоит реальный сервис. Источник прямо указан, чтобы не было ощущения маркетинговой выдумки."
            eyebrow="Отзывы"
            title="Социальное доказательство, которое усиливает доверие, а не выглядит как декоративный блок"
          />
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#c9d8ee]">
            <LandingIcon className="h-4 w-4 text-[#ffc24b]" name="star" />
            <span>5.0 рейтинг в 2GIS</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <a
              className="font-semibold text-white transition hover:text-[#7ee0ff]"
              href={reviewsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Смотреть карточку магазина
            </a>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {items.map((item, index) => (
            <Reveal delay={index * 0.05} key={item.author}>
              <article className="flex h-full flex-col rounded-[1.8rem] border border-white/10 bg-[#0d1728]/88 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2 text-[#ffc24b]">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <LandingIcon className="h-4 w-4" key={`${item.author}-${starIndex}`} name="star" />
                  ))}
                </div>
                <p className="mt-6 text-lg font-semibold text-white">{item.highlight}</p>
                <p className="mt-4 flex-1 text-sm leading-7 text-[#b2c6df]">{item.text}</p>
                <div className="mt-6 border-t border-white/8 pt-4">
                  <p className="text-sm font-semibold text-white">{item.author}</p>
                  <a
                    className="mt-1 inline-flex text-sm text-[#7ee0ff] transition hover:text-white"
                    href={item.sourceHref}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Источник: {item.sourceLabel}
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
