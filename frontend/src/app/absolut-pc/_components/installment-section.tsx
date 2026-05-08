import type { ActionLink } from "../_data/types";
import { ActionLinkButton } from "./action-link";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";

export function InstallmentSection({
  action,
  description,
  points,
  title,
}: {
  action: ActionLink;
  description: string;
  points: string[];
  title: string;
}) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#0d1b2c_0%,#132840_56%,#0d1828_100%)] p-8 shadow-[0_36px_90px_rgba(0,0,0,0.24)] sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#ffc24b]">
                  Рассрочка
                </p>
                <h2 className="font-brand mt-4 text-3xl leading-tight text-white sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[#bad0e7]">{description}</p>
                <div className="mt-8 grid gap-3">
                  {points.map((point) => (
                    <div
                      className="flex items-start gap-3 rounded-[1.25rem] border border-white/8 bg-white/[0.04] px-4 py-4"
                      key={point}
                    >
                      <LandingIcon className="mt-0.5 h-5 w-5 text-[#7ee0ff]" name="wallet-cards" />
                      <p className="text-sm leading-7 text-[#e6effd]">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-[#ffc24b]/18 bg-[linear-gradient(180deg,rgba(255,194,75,0.15),rgba(255,194,75,0.04))] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffd574]">
                  Быстрый сценарий
                </p>
                <p className="mt-4 text-xl font-semibold text-white">
                  Напишите, что хотите купить и в каком бюджете удобно двигаться.
                </p>
                <p className="mt-4 text-sm leading-7 text-[#d8e3f4]">
                  Команда подскажет, какие варианты покупки доступны именно сейчас, без лишней переписки.
                </p>
                <ActionLinkButton action={action} className="mt-8 w-full px-5 py-3.5" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
