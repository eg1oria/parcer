"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";

import { ActionLinkButton } from "./action-link";

export function MobileCta({
  phoneHref,
  whatsappHref,
}: {
  phoneHref: string;
  whatsappHref: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  const syncVisibility = useEffectEvent(() => {
    const nextVisible = window.scrollY > 180;

    startTransition(() => {
      setIsVisible((current) => (current === nextVisible ? current : nextVisible));
    });
  });

  useEffect(() => {
    syncVisibility();
    window.addEventListener("scroll", syncVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", syncVisibility);
    };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        animate={
          reduceMotion
            ? undefined
            : {
                opacity: isVisible ? 1 : 0,
                y: isVisible ? 0 : 96,
              }
        }
        className="fixed inset-x-3 bottom-3 z-50 md:hidden"
        initial={reduceMotion ? undefined : { opacity: 0, y: 96 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rounded-[1.5rem] border border-white/12 bg-[#081424]/90 p-3 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-2">
            <ActionLinkButton
              action={{ href: whatsappHref, icon: "message-circle", label: "WhatsApp" }}
              className="w-full px-4 py-3 text-sm"
            />
            <ActionLinkButton
              action={{ href: phoneHref, icon: "phone", label: "Позвонить" }}
              className="w-full px-4 py-3 text-sm"
              variant="secondary"
            />
          </div>
        </div>
      </m.div>
    </LazyMotion>
  );
}
