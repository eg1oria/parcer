"use client";

import Image from "next/image";

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";

const floatingCards = [
  {
    title: "Подбор под задачу",
    text: "Игры, работа, апгрейд, офис",
    className: "left-0 top-12 md:-left-8",
    delay: 0.1,
  },
  {
    title: "Проверка перед выдачей",
    text: "Техника готова к использованию",
    className: "right-2 top-0 md:-right-8",
    delay: 0.2,
  },
  {
    title: "Рассрочка и доставка",
    text: "Удобный формат без лишней бюрократии",
    className: "bottom-6 right-0 md:bottom-0 md:right-8",
    delay: 0.3,
  },
];

export function HeroVisual({
  alt,
  height,
  src,
  width,
}: {
  alt: string;
  height: number;
  src: string;
  width: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <div className="relative mx-auto w-full max-w-[42rem]">
        <m.div
          animate={
            reduceMotion
              ? undefined
              : {
                  y: [0, -8, 0],
                  rotate: [0, -1, 0],
                }
          }
          className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.4)] backdrop-blur"
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="absolute inset-x-[12%] top-0 h-24 rounded-full bg-[#4fd1ff]/30 blur-3xl" />
          <div className="absolute -bottom-12 left-[18%] h-24 w-40 rounded-full bg-[#ffc24b]/22 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,209,255,0.14),transparent_36%),radial-gradient(circle_at_bottom,rgba(255,194,75,0.12),transparent_34%)]" />
          <Image
            alt={alt}
            className="relative z-10 h-auto w-full rounded-[1.6rem]"
            height={height}
            priority
            sizes="(max-width: 768px) 92vw, 640px"
            src={src}
            width={width}
          />
        </m.div>

        {floatingCards.map((card) => (
          <m.div
            animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
            className={`absolute z-20 max-w-[14rem] rounded-[1.35rem] border border-white/14 bg-[#081424]/82 px-4 py-3 shadow-[0_22px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl ${card.className}`}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
            key={card.title}
            transition={{
              delay: card.delay,
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
              repeat: reduceMotion ? 0 : Infinity,
              repeatType: "mirror",
              repeatDelay: 1.4 + card.delay,
            }}
            viewport={{ amount: 0.3, once: true }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            <p className="text-sm font-semibold text-white">{card.title}</p>
            <p className="mt-1 text-xs leading-5 text-[#90a6c4]">{card.text}</p>
          </m.div>
        ))}
      </div>
    </LazyMotion>
  );
}
