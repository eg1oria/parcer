"use client";

import type { ReactNode } from "react";

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={className}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y }}
        transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ amount: 0.2, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
