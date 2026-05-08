import type { Metadata } from "next";

import { Reveal } from "../absolut-pc/_components/reveal";

import styles from "./page.module.css";

const stats = [
  {
    number: "87%",
    label: (
      <>
        гостей изучают заведение
        <br />
        онлайн перед визитом
      </>
    ),
  },
  {
    number: "3×",
    label: (
      <>
        больше броней приносит
        <br />
        хороший лендинг
      </>
    ),
  },
  {
    number: "7 сек",
    label: (
      <>
        на первое впечатление —
        <br />
        потом уже поздно
      </>
    ),
  },
];

const offers = [
  {
    number: "01",
    title: "Атмосфера с первого экрана",
    description:
      "Дизайн, который передаёт характер вашего места. Гость ещё не пришёл — но уже влюбился.",
  },
  {
    number: "02",
    title: "Меню и спецпредложения",
    description:
      "Красивая подача блюд, акций и сетов. Человек смотрит — и уже хочет есть.",
  },
  {
    number: "03",
    title: "Онлайн-бронирование",
    description:
      "Кнопка «Забронировать стол» работает круглосуточно. Больше ни одна заявка не потеряется.",
  },
  {
    number: "04",
    title: "SEO и карты",
    description: "Ваш сайт будут находить в поиске. Google, Яндекс, 2ГИС — вы везде.",
  },
  {
    number: "05",
    title: "Быстрый запуск",
    description: "Готовый лендинг за 5–7 дней. Без долгих согласований — сразу в дело.",
  },
  {
    number: "06",
    title: "Адаптация под телефон",
    description:
      "Идеально выглядит на любом устройстве. Ваш сайт — как часть интерьера: всё на месте.",
  },
];

const heroHighlights = [
  "Передаёт атмосферу заведения с первого экрана",
  "Помогает принимать брони и заявки даже ночью",
  "Убеждает гостя выбрать вас ещё до первого визита",
];

export const metadata: Metadata = {
  title: "Лендинг для заведений",
  description:
    "Отдельная landing page для ресторанов, баров и кофеен с акцентом на атмосферу, бронирования и онлайн-продажи.",
};

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.topbar}>
              <span className={styles.brand}>Веб-студия</span>
              <a className={styles.topbarLink} href="#contact">
                Связаться
              </a>
            </div>

            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <Reveal className={styles.heroBadge}>
                  Лендинги для ресторанов, кофеен и баров
                </Reveal>

                <Reveal delay={0.1}>
                  <h1 className={styles.heroTitle}>
                    Сайт для заведения,
                    <br />
                    который выглядит
                    <em> вкусно</em>
                  </h1>
                </Reveal>

                <Reveal delay={0.2}>
                  <p className={styles.heroLead}>
                    Когда человек выбирает, куда пойти вечером, он сначала идёт в интернет. Если
                    там у вас красиво, понятно и убедительно — он идёт к вам.
                  </p>
                </Reveal>

                <Reveal className={styles.heroActions} delay={0.3}>
                  <a className={styles.btnPrimary} href="#contact">
                    Обсудить проект
                  </a>
                  <a className={styles.btnSecondary} href="#offer">
                    Что будет внутри
                  </a>
                </Reveal>
              </div>

              <Reveal className={styles.heroPanel} delay={0.25} y={36}>
                <div className={styles.heroPanelInner}>
                  <p className={styles.heroPanelKicker}>Что даёт такой лендинг</p>
                  <ul className={styles.heroHighlights}>
                    {heroHighlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <div className={styles.heroMiniStats}>
                    <div>
                      <span className={styles.heroMiniNumber}>5–7 дней</span>
                      <span className={styles.heroMiniLabel}>средний запуск</span>
                    </div>
                    <div>
                      <span className={styles.heroMiniNumber}>24/7</span>
                      <span className={styles.heroMiniLabel}>принимает заявки</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className={styles.problem}>
          <div className={styles.container}>
            <Reveal className={styles.sectionLabel}>Почему это работает</Reveal>

            <Reveal delay={0.1}>
              <h2 className={styles.problemHeadline}>
                Гость выбирает глазами
                <br />
                <em>ещё до визита</em>
              </h2>
            </Reveal>

            <Reveal delay={0.2}>
              <p className={styles.problemText}>
                Он пошёл туда, где красиво, понятно и убедительно.
              </p>
            </Reveal>

            <div className={styles.statsRow}>
              {stats.map((item, index) => (
                <Reveal
                  key={item.number}
                  className={styles.stat}
                  delay={0.3 + index * 0.08}
                  y={22}
                >
                  <span className={styles.statNumber}>{item.number}</span>
                  <span className={styles.statLabel}>{item.label}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.offer} id="offer">
          <div className={styles.container}>
            <Reveal className={styles.sectionLabel}>Что вы получаете</Reveal>

            <Reveal delay={0.1}>
              <h2 className={styles.problemHeadline}>
                Лендинг, который
                <br />
                <em>работает на вас 24/7</em>
              </h2>
            </Reveal>

            <div className={styles.offerGrid}>
              {offers.map((item, index) => (
                <Reveal
                  key={item.number}
                  className={styles.offerItem}
                  delay={0.14 + index * 0.07}
                  y={24}
                >
                  <div className={styles.offerNumber}>{item.number}</div>
                  <h3 className={styles.offerTitle}>{item.title}</h3>
                  <p className={styles.offerDesc}>{item.description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.result}>
          <div className={styles.resultBg} />
          <div className={styles.container}>
            <Reveal className={styles.ornament}>✦</Reveal>

            <Reveal delay={0.1}>
              <p className={styles.resultQuote}>
                Хороший лендинг — это не расход.
                <br />
                Это <span>инвестиция, которая возвращается</span>
                <br />с каждым новым гостем.
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <p className={styles.resultSub}>
                Ваши конкуренты уже есть в интернете. Время занять своё место.
              </p>
            </Reveal>

            <Reveal className={styles.goldLine} delay={0.3} y={12}>
              <span />
            </Reveal>
          </div>
        </section>

        <section className={styles.finalCta} id="contact">
          <div className={styles.container}>
            <Reveal>
              <h2 className={styles.finalCtaTitle}>
                Готовы
                <br />
                <em>обсудить?</em>
              </h2>
            </Reveal>

            <Reveal delay={0.1}>
              <p className={styles.finalCtaSub}>
                Напишите — покажу примеры, расскажу про стоимость и сроки
              </p>
            </Reveal>

            <Reveal className={styles.heroActions} delay={0.2}>
              <a className={styles.btnPrimary} href="mailto:hello@example.com">
                Написать сейчас
              </a>
              <a className={styles.btnSecondary} href="tel:+79000000000">
                Позвонить
              </a>
            </Reveal>

            <Reveal delay={0.3}>
              <p className={styles.finalNote}>
                Бесплатная консультация · Без обязательств · Портфолио по запросу
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>Веб-студия · Лендинги для заведений</p>
      </footer>
    </div>
  );
}
