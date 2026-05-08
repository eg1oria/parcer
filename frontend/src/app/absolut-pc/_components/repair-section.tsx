import Image from "next/image";

import type { ActionLink } from "../_data/types";
import { ActionLinkButton } from "./action-link";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";

export function RepairSection({
  action,
  checklist,
  description,
  imageAlt,
  imageHeight,
  imageSrc,
  imageWidth,
  title,
}: {
  action: ActionLink;
  checklist: string[];
  description: string;
  imageAlt: string;
  imageHeight: number;
  imageSrc: string;
  imageWidth: number;
  title: string;
}) {
  return (
    <section className="py-20 sm:py-28" id="repair">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <Reveal>
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(79,209,255,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
              <Image
                alt={imageAlt}
                className="h-auto w-full rounded-[1.6rem]"
                height={imageHeight}
                sizes="(max-width: 1024px) 92vw, 520px"
                src={imageSrc}
                width={imageWidth}
              />
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#ffc24b]">
                Ремонт и сервис
              </p>
              <h2 className="font-brand mt-4 text-3xl leading-tight text-white sm:text-4xl lg:text-[3.2rem]">
                {title}
              </h2>
              <p className="mt-6 text-base leading-8 text-[#b6cae1]">{description}</p>
            </Reveal>

            <div className="mt-8 grid gap-3">
              {checklist.map((item, index) => (
                <Reveal delay={index * 0.04} key={item}>
                  <div className="flex items-start gap-3 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <LandingIcon className="mt-0.5 h-5 w-5 text-[#7ee0ff]" name="wrench" />
                    <p className="text-sm leading-7 text-[#e6effd]">{item}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.12}>
              <ActionLinkButton action={action} className="mt-8 px-6 py-3.5" />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
