import type { LandingStat } from "../_data/types";
import { LandingIcon } from "./icon-map";
import { Reveal } from "./reveal";

export function TrustBar({ items }: { items: LandingStat[] }) {
  return (
    <section className="relative py-5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item, index) => (
              <div
                className="rounded-[1.5rem] border border-white/8 bg-[#0b1627]/84 px-5 py-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                key={item.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#7f94b1]">0{index + 1}</p>
                    <p className="mt-4 text-2xl font-semibold text-white">{item.value}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <LandingIcon className="h-5 w-5 text-[#7ee0ff]" name={item.icon} />
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-[#dbe6f8]">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-[#8fa5c2]">{item.detail}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
