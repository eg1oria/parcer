import type { ActionLink } from "../_data/types";
import { ActionLinkButton } from "./action-link";
import { Reveal } from "./reveal";

export function FinalCtaSection({
  note,
  phoneAction,
  title,
  whatsappAction,
}: {
  note: string;
  phoneAction: ActionLink;
  title: string;
  whatsappAction: ActionLink;
}) {
  return (
    <section className="pb-24 pt-14 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(140deg,#101b2e_0%,#152b45_42%,#0a1322_100%)] px-6 py-10 shadow-[0_40px_100px_rgba(0,0,0,0.28)] sm:px-10 sm:py-12">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7ee0ff]">
                Финальный CTA
              </p>
              <h2 className="font-brand mt-5 text-3xl leading-tight text-white sm:text-4xl lg:text-[3.2rem]">
                {title}
              </h2>
              <p className="mt-5 text-base leading-8 text-[#b9cee5]">{note}</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLinkButton action={whatsappAction} className="px-6 py-4 text-base" />
              <ActionLinkButton
                action={phoneAction}
                className="px-6 py-4 text-base"
                variant="secondary"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
