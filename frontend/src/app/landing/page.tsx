"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const PHONE_NUMBER = "+77054424389";
const PHONE_DISPLAY = "+7 705 442 43 89";
const WHATSAPP_LINK = "https://wa.me/77054424389";

const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --gold: #c9a96e;
      --gold-light: #e8d5a3;
      --dark: #0d0b09;
      --dark-2: #181410;
      --dark-3: #221e18;
      --cream: #f2ece0;
      --text: #cec8bc;
      --text-dim: #7a7060;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--dark);
      font-family: 'DM Sans', sans-serif;
      font-weight: 300;
      overflow-x: hidden;
      color: var(--text);
    }

    body::after {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
      opacity: 0.5;
    }

    @keyframes spinSlow { to { transform: translate(-50%, -50%) rotate(360deg); } }
    @keyframes spinRev  { to { transform: translate(-50%, -50%) rotate(-360deg); } }
    @keyframes shimmer  { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

    .hero-ring-1 {
      position: absolute;
      border-radius: 50%;
      width: 720px;
      height: 720px;
      top: 50%;
      left: 50%;
      border: 1px solid rgba(201, 169, 110, 0.07);
      transform: translate(-50%, -50%);
      animation: spinSlow 50s linear infinite;
    }

    .hero-ring-2 {
      position: absolute;
      border-radius: 50%;
      width: 480px;
      height: 480px;
      top: 50%;
      left: 50%;
      border: 1px solid rgba(201, 169, 110, 0.05);
      transform: translate(-50%, -50%);
      animation: spinRev 30s linear infinite;
    }
  `}</style>
);

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible] as const;
}

type RevealProps = {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
};

function Reveal({ children, delay = 0, style = {} }: RevealProps) {
  const [ref, visible] = useReveal();

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(28px)",
        transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontSize: 10,
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        color: "var(--gold)",
        marginBottom: 48,
      }}
    >
      {children}
      <span
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(90deg, rgba(201,169,110,0.3), transparent)",
        }}
      />
    </div>
  );
}

const offerItems = [
  {
    n: "01",
    title: "Атмосфера с первого экрана",
    desc: "Дизайн, который передаёт характер вашего места. Гость ещё не пришёл, но уже влюбился.",
  },
  {
    n: "02",
    title: "Меню и спецпредложения",
    desc: "Красивая подача блюд, акций и сетов. Человек смотрит и уже хочет есть.",
  },
  {
    n: "03",
    title: "Онлайн-бронирование",
    desc: "Кнопка «Забронировать стол» работает круглосуточно. Ни одна заявка не потеряется.",
  },
  {
    n: "04",
    title: "SEO и карты",
    desc: "Ваш сайт будут находить в поиске. Google, Яндекс, 2ГИС — вы везде.",
  },
  {
    n: "05",
    title: "Быстрый запуск",
    desc: "Готовый лендинг за 5–7 дней. Без долгих согласований, сразу в дело.",
  },
  {
    n: "06",
    title: "Адаптация под телефон",
    desc: "Идеально выглядит на любом устройстве. Ваш сайт как часть интерьера: всё на месте.",
  },
];

type OfferItem = (typeof offerItems)[number];

function OfferCard({ item, delay }: { item: OfferItem; delay: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "var(--dark-3)" : "var(--dark)",
          padding: "44px 36px",
          position: "relative",
          overflow: "hidden",
          transition: "background 0.3s ease",
          cursor: "default",
        }}
      >
        <span
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 1,
            background: "var(--gold)",
            width: hovered ? "100%" : "0%",
            transition: "width 0.4s ease",
            display: "block",
          }}
        />
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 64,
            fontWeight: 300,
            lineHeight: 1,
            color: hovered ? "rgba(201,169,110,0.25)" : "rgba(201,169,110,0.1)",
            marginBottom: 20,
            transition: "color 0.3s ease",
            userSelect: "none",
          }}
        >
          {item.n}
        </div>
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 400,
            color: "var(--cream)",
            marginBottom: 14,
          }}
        >
          {item.title}
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.85, color: "var(--text-dim)" }}>{item.desc}</p>
      </div>
    </Reveal>
  );
}

export default function App() {
  const [heroIn, setHeroIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHeroIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const heroAnim = (delay: number): CSSProperties => ({
    opacity: heroIn ? 1 : 0,
    transform: heroIn ? "none" : "translateY(30px)",
    transition: `opacity 1s ease ${delay}s, transform 1s ease ${delay}s`,
  });

  return (
    <>
      <FontLink />

      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: "80px 20px",
          overflow: "hidden",
          background: "linear-gradient(180deg, var(--dark) 0%, var(--dark-2) 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(201,169,110,0.11) 0%, transparent 70%)",
          }}
        />

        <div className="hero-ring-1" />
        <div className="hero-ring-2" />

        <p
          style={{
            ...heroAnim(0.3),
            position: "relative",
            zIndex: 2,
            fontSize: 11,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "var(--gold)",
            marginBottom: 40,
          }}
        >
          <span style={{ margin: "0 10px", opacity: 0.5 }}>-</span>
          Специальное предложение для заведений
          <span style={{ margin: "0 10px", opacity: 0.5 }}>-</span>
        </p>

        <h1
          style={{
            ...heroAnim(0.55),
            position: "relative",
            zIndex: 2,
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(52px, 10vw, 118px)",
            fontWeight: 300,
            lineHeight: 0.92,
            textAlign: "center",
            color: "var(--cream)",
          }}
        >
          Ваше место —
          <br />
          <em style={{ fontStyle: "italic", color: "var(--gold)" }}>в каждом телефоне</em>
        </h1>

        <p
          style={{
            ...heroAnim(0.8),
            position: "relative",
            zIndex: 2,
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(18px, 3vw, 26px)",
            fontWeight: 300,
            fontStyle: "italic",
            color: "var(--text-dim)",
            marginTop: 28,
            textAlign: "center",
          }}
        >
          Лендинг, который превращает случайных гостей в постоянных
        </p>

        <div
          style={{
            ...heroAnim(1.1),
            position: "relative",
            zIndex: 2,
            width: 1,
            height: 70,
            margin: "48px auto",
            background: "linear-gradient(180deg, transparent, var(--gold), transparent)",
            animation: "shimmer 3s ease 1.5s infinite",
          }}
        />

        <div
          style={{
            ...heroAnim(1.3),
            position: "relative",
            zIndex: 2,
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <BtnPrimary href="#offer">Хочу такой сайт</BtnPrimary>
          <BtnSecondary href="#problem">Узнать подробнее</BtnSecondary>
        </div>
      </section>

      <section
        id="problem"
        style={{
          padding: "100px 20px",
          background: "var(--dark-2)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
          }}
        />

        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <SectionLabel>Реальность рынка</SectionLabel>
          </Reveal>

          <Reveal delay={0.1}>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 300,
                lineHeight: 1.15,
                color: "var(--cream)",
                marginBottom: 36,
              }}
            >
              Гость гуглит —
              <br />
              <em style={{ fontStyle: "italic", color: "var(--gold)" }}>и уходит к конкурентам</em>
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p style={{ fontSize: 15, lineHeight: 1.95, color: "var(--text-dim)", maxWidth: 680 }}>
              Сегодня человек принимает решение, куда пойти, за 7 секунд. Он открывает телефон,
              вводит «кафе рядом» и видит того, кто позаботился о своём присутствии в сети. Если
              вашего сайта нет или он выглядит устаревшим, этого человека вы уже потеряли. Он
              пошёл туда, где красиво, понятно и убедительно.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div style={{ display: "flex", gap: 48, marginTop: 64, flexWrap: "wrap" }}>
              {[
                { num: "87%", label: "гостей изучают заведение\nонлайн перед визитом" },
                { num: "3x", label: "больше броней приносит\nхороший лендинг" },
                { num: "7 сек", label: "на первое впечатление —\nпотом уже поздно" },
              ].map((stat) => (
                <div
                  key={stat.num}
                  style={{
                    flex: "1 1 160px",
                    minWidth: 160,
                    borderLeft: "1px solid rgba(201,169,110,0.2)",
                    paddingLeft: 24,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 54,
                      fontWeight: 300,
                      color: "var(--gold)",
                      lineHeight: 1,
                      display: "block",
                    }}
                  >
                    {stat.num}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.08em",
                      color: "var(--text-dim)",
                      marginTop: 8,
                      lineHeight: 1.6,
                      display: "block",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="offer" style={{ padding: "120px 20px", background: "var(--dark)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <SectionLabel>Что вы получаете</SectionLabel>
          </Reveal>

          <Reveal delay={0.1}>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 300,
                lineHeight: 1.15,
                color: "var(--cream)",
                marginBottom: 56,
              }}
            >
              Лендинг, который
              <br />
              <em style={{ fontStyle: "italic", color: "var(--gold)" }}>работает на вас 24/7</em>
            </h2>
          </Reveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 2,
              background: "rgba(201,169,110,0.06)",
            }}
          >
            {offerItems.map((item, index) => (
              <OfferCard key={item.n} item={item} delay={(index % 3) * 0.1} />
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "120px 20px",
          background: "var(--dark-2)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(201,169,110,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Reveal>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 44,
                color: "rgba(201,169,110,0.2)",
                display: "block",
                lineHeight: 1,
                marginBottom: 16,
              }}
            >
              *
            </span>
          </Reveal>

          <Reveal delay={0.15}>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(26px, 5vw, 52px)",
                fontWeight: 300,
                fontStyle: "italic",
                color: "var(--cream)",
                lineHeight: 1.35,
              }}
            >
              Хороший лендинг — это не расход.
              <br />
              Это <span style={{ color: "var(--gold)", fontStyle: "normal" }}>инвестиция, которая возвращается</span>
              <br />
              с каждым новым гостем.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <p
              style={{
                fontSize: 12,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
                marginTop: 40,
              }}
            >
              Ваши конкуренты уже есть в интернете. Время занять своё место.
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <div
              style={{
                width: 60,
                height: 1,
                background: "var(--gold)",
                margin: "40px auto 0",
                opacity: 0.5,
              }}
            />
          </Reveal>
        </div>
      </section>

      <section style={{ padding: "120px 20px", background: "var(--dark)", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <Reveal>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(42px, 8vw, 96px)",
                fontWeight: 300,
                lineHeight: 1,
                color: "var(--cream)",
                marginBottom: 20,
              }}
            >
              Готовы
              <br />
              <em style={{ fontStyle: "italic", color: "var(--gold)" }}>обсудить?</em>
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-dim)",
                marginBottom: 52,
                letterSpacing: "0.05em",
              }}
            >
              Напишите — покажу примеры, расскажу про стоимость и сроки
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
              <BtnPrimary href={WHATSAPP_LINK}>WhatsApp</BtnPrimary>
              <BtnSecondary href={`tel:${PHONE_NUMBER}`}>Позвонить</BtnSecondary>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <p
              style={{
                marginTop: 36,
                fontSize: 12,
                color: "var(--text-dim)",
                letterSpacing: "0.1em",
              }}
            >
              WhatsApp и звонки: {PHONE_DISPLAY}
            </p>
          </Reveal>
        </div>
      </section>

      <footer
        style={{
          padding: "28px 20px",
          borderTop: "1px solid rgba(201,169,110,0.1)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
          }}
        >
          Веб-студия · Лендинги для заведений
        </p>
      </footer>
    </>
  );
}

type ButtonProps = {
  href: string;
  children: ReactNode;
};

function BtnPrimary({ href, children }: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-block",
        padding: "16px 44px",
        background: "var(--gold)",
        color: "var(--dark)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        textDecoration: "none",
        transition: "box-shadow 0.3s ease, opacity 0.3s ease",
        boxShadow: hovered ? "0 0 40px rgba(201,169,110,0.35)" : "none",
        opacity: hovered ? 0.9 : 1,
        cursor: "pointer",
      }}
    >
      {children}
    </a>
  );
}

function BtnSecondary({ href, children }: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-block",
        padding: "16px 44px",
        background: hovered ? "rgba(201,169,110,0.05)" : "transparent",
        color: "var(--gold-light)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        fontWeight: 400,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        textDecoration: "none",
        border: `1px solid ${hovered ? "var(--gold)" : "rgba(201,169,110,0.3)"}`,
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
    >
      {children}
    </a>
  );
}
