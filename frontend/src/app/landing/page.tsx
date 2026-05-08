"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Clock3,
  Globe2,
  LayoutPanelTop,
  MapPinned,
  MessageCircle,
  Phone,
  Search,
  Smartphone,
  Sparkles,
  Star,
} from "lucide-react";

import styles from "./page.module.css";

const PHONE_NUMBER = "+77054424389";
const PHONE_DISPLAY = "+7 705 442 43 89";
const PHONE_LINK = `tel:${PHONE_NUMBER}`;
const WHATSAPP_LINK = "https://wa.me/77054424389";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;700&display=swap');

    html { scroll-behavior: smooth; }
    body { background: #090807; }
  `}</style>
);

type IconItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const heroStats = [
  { value: "5-7 дней", label: "до первого готового запуска" },
  { value: "24/7", label: "приём заявок и броней без пауз" },
  { value: "3 касания", label: "до WhatsApp, меню и звонка" },
];

const ribbonItems = [
  "Атмосфера",
  "Меню",
  "Бронь",
  "WhatsApp",
  "Карты",
  "SEO",
  "Мобильная версия",
  "Первый экран",
];

const problemItems: IconItem[] = [
  {
    icon: Search,
    title: "Решение принимают в поиске",
    desc: "Гость открывает несколько заведений подряд. Побеждает не тот, кто ближе, а тот, кто выглядит убедительнее с первых секунд.",
  },
  {
    icon: Smartphone,
    title: "Телефон стал вашей витриной",
    desc: "Если страница неудобная, тёмная или пустая, человек закрывает её раньше, чем дойдёт до адреса и меню.",
  },
  {
    icon: MapPinned,
    title: "Нужен маршрут до действия",
    desc: "Сайт должен вести к брони, звонку или WhatsApp без лишних шагов. Иначе интерес просто рассеивается.",
  },
];

const problemStats = [
  { value: "87%", label: "сначала смотрят заведение онлайн, а уже потом решают ехать" },
  { value: "7 сек", label: "хватает на первое впечатление о месте и доверии к нему" },
  { value: "3x", label: "больше шансов на заявку, когда подача ведёт к действию" },
];

const offerItems: Array<IconItem & { n: string }> = [
  {
    n: "01",
    icon: Sparkles,
    title: "Атмосфера в первом экране",
    desc: "Сразу показываем характер вашего места: настроение, свет, посадку, акцент на концепции.",
  },
  {
    n: "02",
    icon: ChefHat,
    title: "Меню и спецпредложения",
    desc: "Подаём блюда, сеты и акции так, чтобы человек захотел написать ещё до визита.",
  },
  {
    n: "03",
    icon: CalendarDays,
    title: "Бронь в одно касание",
    desc: "Кнопки звонка и WhatsApp на виду, чтобы запросы не терялись и не ждали администратора.",
  },
  {
    n: "04",
    icon: Globe2,
    title: "SEO, карты и гео-присутствие",
    desc: "Подсвечиваем ваше место в поиске и связываем сайт с картами, чтобы вас проще находили рядом.",
  },
  {
    n: "05",
    icon: Clock3,
    title: "Запуск без затяжек",
    desc: "Собираем сильный лендинг быстро: без месяцев переписок, с понятным сценарием и приоритетами.",
  },
  {
    n: "06",
    icon: Smartphone,
    title: "Мобильная версия как основная",
    desc: "Всё строится под экран телефона, потому что именно там чаще всего и принимается решение.",
  },
];

const processSteps: IconItem[] = [
  {
    icon: MessageCircle,
    title: "Созваниваемся на 15 минут",
    desc: "Уточняем формат заведения, аудиторию, средний чек, подачу и какой результат нужен сайту.",
  },
  {
    icon: LayoutPanelTop,
    title: "Собираем подачу и тексты",
    desc: "Выстраиваем структуру, визуальный ритм, УТП, сценарий брони и правильные акценты на экране.",
  },
  {
    icon: CheckCircle2,
    title: "Запускаем и подключаем заявки",
    desc: "Доводим страницу до рабочего состояния: кнопки, карты, мессенджеры, аналитика и финальные правки.",
  },
];

const projectIncludes = [
  "Фото и атмосфера, которые продают настроение",
  "Структура, ведущая к брони, звонку или сообщению",
  "Быстрые кнопки WhatsApp и телефона без лишнего пути",
  "Карты, SEO-основа и ясные точки доверия",
];

const contactPromises = [
  "Покажу референсы и визуальное направление",
  "Сориентирую по срокам и стоимости",
  "Подскажу, как лучше подать именно ваше место",
];

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -64px 0px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, visible] as const;
}

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
};

function Reveal({ children, delay = 0, className, style }: RevealProps) {
  const [ref, visible] = useReveal();

  return (
    <div
      ref={ref}
      className={classNames(styles.reveal, visible && styles.revealVisible, className)}
      style={{ transitionDelay: `${delay}s`, ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className={styles.sectionLabel}>
      <Sparkles size={14} strokeWidth={1.8} />
      <span>{children}</span>
    </div>
  );
}

type ActionButtonProps = {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  compact?: boolean;
};

function ActionButton({ href, children, secondary = false, compact = false }: ActionButtonProps) {
  const isExternal = href.startsWith("http");

  return (
    <a
      href={href}
      className={classNames(
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        compact && styles.buttonCompact
      )}
      rel={isExternal ? "noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      <span>{children}</span>
      <ArrowRight size={18} strokeWidth={1.8} />
    </a>
  );
}

export default function App() {
  const [heroIn, setHeroIn] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHeroIn(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const heroAnim = (delay: number): CSSProperties => ({
    opacity: heroIn ? 1 : 0,
    transform: heroIn ? "translate3d(0, 0, 0)" : "translate3d(0, 28px, 0)",
    transition:
      `opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, ` +
      `transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
  });

  return (
    <>
      <GlobalStyles />

      <div className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <a href="#top" className={styles.brand}>
              <span className={styles.brandEyebrow}>Web Studio</span>
              <span className={styles.brandTitle}>Лендинги для заведений</span>
            </a>

            <nav className={styles.nav}>
              <a href="#problem" className={styles.navLink}>
                Почему
              </a>
              <a href="#offer" className={styles.navLink}>
                Что внутри
              </a>
              <a href="#process" className={styles.navLink}>
                Процесс
              </a>
              <a href="#contact" className={styles.navLink}>
                Контакт
              </a>
            </nav>

            <div className={styles.headerActions}>
              <a href={PHONE_LINK} className={styles.headerPhone}>
                <Phone size={16} strokeWidth={1.8} />
                <span>{PHONE_DISPLAY}</span>
              </a>
              <ActionButton href={WHATSAPP_LINK} compact>
                WhatsApp
              </ActionButton>
            </div>
          </header>

          <main>
            <section id="top" className={styles.hero}>
              <div className={styles.heroGrid}>
                <div className={styles.heroCopy}>
                  <div className={styles.heroBadge} style={heroAnim(0.08)}>
                    <Sparkles size={14} strokeWidth={1.8} />
                    <span>Спецпредложение для кафе, ресторанов и lounge-пространств</span>
                  </div>

                  <h1 className={styles.heroTitle} style={heroAnim(0.16)}>
                    Ваше место должно
                    <br />
                    <em>выглядеть желанным в каждом телефоне</em>
                  </h1>

                  <p className={styles.heroLead} style={heroAnim(0.24)}>
                    Создаю лендинги, которые передают атмосферу, показывают меню,
                    ведут к брони и превращают случайный интерес в реальные сообщения.
                  </p>

                  <div className={styles.heroActions} style={heroAnim(0.32)}>
                    <ActionButton href={WHATSAPP_LINK}>Обсудить в WhatsApp</ActionButton>
                    <ActionButton href="#offer" secondary>
                      Посмотреть состав лендинга
                    </ActionButton>
                  </div>

                  <div className={styles.heroStats} style={heroAnim(0.4)}>
                    {heroStats.map((stat) => (
                      <div key={stat.value} className={styles.heroStatCard}>
                        <span className={styles.heroStatValue}>{stat.value}</span>
                        <span className={styles.heroStatLabel}>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.heroVisual} style={heroAnim(0.18)}>
                  <div className={styles.visualHalo} aria-hidden="true" />
                  <div className={styles.visualRing} aria-hidden="true" />

                  <div className={styles.phoneMockup}>
                    <div className={styles.phoneTopBar}>
                      <span>18:24</span>
                      <div className={styles.phoneSignal}>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>

                    <div className={styles.phoneScreen}>
                      <div className={styles.phoneSearch}>
                        <Search size={14} strokeWidth={1.9} />
                        <span>ресторан рядом с атмосферой</span>
                      </div>

                      <div className={styles.phoneHeroCard}>
                        <span className={styles.phoneTag}>Лендинг • Бронь • Меню</span>
                        <strong>Ваше заведение выглядит как лучший выбор рядом.</strong>
                        <p>Один экран показывает вкус, настроение и кнопку действия.</p>
                      </div>

                      <div className={styles.phoneInfoGrid}>
                        <div className={styles.phoneInfoCard}>
                          <div className={styles.phoneInfoTop}>
                            <CalendarDays size={16} strokeWidth={1.8} />
                            <span>Бронь</span>
                          </div>
                          <p>Забронировать стол за 30 секунд</p>
                        </div>

                        <div className={styles.phoneInfoCard}>
                          <div className={styles.phoneInfoTop}>
                            <ChefHat size={16} strokeWidth={1.8} />
                            <span>Меню</span>
                          </div>
                          <p>Сеты, подача и позиции дня на виду</p>
                        </div>

                        <div className={classNames(styles.phoneInfoCard, styles.phoneInfoCardWide)}>
                          <div className={styles.phoneInfoTop}>
                            <MapPinned size={16} strokeWidth={1.8} />
                            <span>Карты и отзывы</span>
                          </div>
                          <p>Показываем адрес, ориентиры и точки доверия рядом с действием</p>
                        </div>
                      </div>

                      <a
                        href={WHATSAPP_LINK}
                        className={styles.phoneCta}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span>Открыть WhatsApp</span>
                        <ArrowRight size={16} strokeWidth={1.8} />
                      </a>
                    </div>
                  </div>

                  <div className={classNames(styles.floatCard, styles.floatCardTop)}>
                    <div className={styles.floatCardTitle}>
                      <Star size={16} strokeWidth={1.8} />
                      <span>Первое впечатление</span>
                    </div>
                    <p className={styles.floatCardText}>Визуал должен продавать ещё до текста.</p>
                  </div>

                  <div className={classNames(styles.floatCard, styles.floatCardRight)}>
                    <div className={styles.floatCardTitle}>
                      <Clock3 size={16} strokeWidth={1.8} />
                      <span>Быстрый отклик</span>
                    </div>
                    <p className={styles.floatCardText}>Кнопки связи всегда рядом с интересом.</p>
                  </div>

                  <div className={classNames(styles.floatCard, styles.floatCardBottom)}>
                    <div className={styles.floatCardTitle}>
                      <LayoutPanelTop size={16} strokeWidth={1.8} />
                      <span>Структура без хаоса</span>
                    </div>
                    <p className={styles.floatCardText}>Фото, меню, доверие и бронь в правильном ритме.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.ribbon} aria-label="Преимущества лендинга">
              <div className={styles.ribbonTrack}>
                {[...ribbonItems, ...ribbonItems].map((item, index) => (
                  <span key={`${item}-${index}`} className={styles.ribbonItem}>
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section id="problem" className={styles.section}>
              <div className={styles.sectionIntro}>
                <Reveal>
                  <SectionLabel>Почему обычная страница не работает</SectionLabel>
                </Reveal>

                <Reveal delay={0.08}>
                  <h2 className={styles.sectionTitle}>
                    Гость выбирает не между адресами.
                    <br />
                    Он выбирает между ощущениями.
                  </h2>
                </Reveal>

                <Reveal delay={0.16}>
                  <p className={styles.sectionLead}>
                    Сегодня заведение оценивают по экрану телефона: насколько там красиво,
                    понятно и легко сделать следующий шаг. Если сайт не цепляет, человек
                    просто уходит к тем, кто выглядит живее и увереннее.
                  </p>
                </Reveal>
              </div>

              <div className={styles.problemGrid}>
                {problemItems.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <Reveal key={item.title} delay={0.08 * index}>
                      <article className={styles.problemCard}>
                        <div className={styles.iconBadge}>
                          <Icon size={20} strokeWidth={1.8} />
                        </div>
                        <h3 className={styles.cardTitle}>{item.title}</h3>
                        <p className={styles.cardText}>{item.desc}</p>
                      </article>
                    </Reveal>
                  );
                })}
              </div>

              <div className={styles.numbersRow}>
                {problemStats.map((stat, index) => (
                  <Reveal key={stat.value} delay={0.12 + index * 0.08}>
                    <article className={styles.numberCard}>
                      <span className={styles.numberValue}>{stat.value}</span>
                      <p className={styles.numberLabel}>{stat.label}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </section>

            <section id="offer" className={styles.section}>
              <div className={styles.sectionIntro}>
                <Reveal>
                  <SectionLabel>Что получает ваше заведение</SectionLabel>
                </Reveal>

                <Reveal delay={0.08}>
                  <h2 className={styles.sectionTitle}>
                    Не просто красивую страницу,
                    <br />
                    а рабочий сценарий продаж 24/7.
                  </h2>
                </Reveal>
              </div>

              <div className={styles.offerGrid}>
                {offerItems.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <Reveal key={item.n} delay={(index % 3) * 0.08}>
                      <article className={styles.offerCard}>
                        <div className={styles.offerCardTop}>
                          <span className={styles.offerIndex}>{item.n}</span>
                          <div className={styles.iconBadge}>
                            <Icon size={20} strokeWidth={1.8} />
                          </div>
                        </div>
                        <h3 className={styles.offerTitle}>{item.title}</h3>
                        <p className={styles.offerText}>{item.desc}</p>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </section>

            <section id="process" className={styles.section}>
              <div className={styles.sectionIntro}>
                <Reveal>
                  <SectionLabel>Как идём к запуску</SectionLabel>
                </Reveal>

                <Reveal delay={0.08}>
                  <h2 className={styles.sectionTitle}>
                    Короткий процесс, в котором
                    <br />
                    есть темп, логика и результат.
                  </h2>
                </Reveal>
              </div>

              <div className={styles.processGrid}>
                {processSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <Reveal key={step.title} delay={index * 0.1}>
                      <article className={styles.processCard}>
                        <span className={styles.processStep}>0{index + 1}</span>
                        <div className={styles.iconBadge}>
                          <Icon size={20} strokeWidth={1.8} />
                        </div>
                        <h3 className={styles.processTitle}>{step.title}</h3>
                        <p className={styles.processText}>{step.desc}</p>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </section>

            <section className={styles.quoteSection}>
              <Reveal className={styles.quotePanel}>
                <span className={styles.quoteKicker}>Что должно чувствоваться на странице</span>

                <p className={styles.quoteText}>
                  Хороший лендинг для заведения
                  <br />
                  не просто рассказывает.
                  <br />
                  Он <span className={styles.quoteAccent}>сразу вызывает желание прийти</span>.
                </p>

                <div className={styles.quoteChips}>
                  <span className={styles.quoteChip}>Атмосфера</span>
                  <span className={styles.quoteChip}>Доверие</span>
                  <span className={styles.quoteChip}>Бронь</span>
                  <span className={styles.quoteChip}>Гео-поиск</span>
                </div>

                <div className={styles.checklist}>
                  {projectIncludes.map((item) => (
                    <div key={item} className={styles.checklistItem}>
                      <CheckCircle2 size={18} strokeWidth={1.8} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </section>

            <section id="contact" className={styles.section}>
              <div className={styles.ctaGrid}>
                <Reveal className={styles.ctaCopy}>
                  <SectionLabel>Финальный шаг</SectionLabel>

                  <h2 className={styles.ctaTitle}>
                    Если хотите лендинг,
                    <br />
                    который выглядит вкусно и работает на бронь,
                    <br />
                    <em>давайте обсудим ваш формат.</em>
                  </h2>

                  <p className={styles.ctaText}>
                    Напишите в WhatsApp или позвоните. Я отвечу лично, покажу примеры и
                    предложу направление именно под ваше заведение.
                  </p>

                  <div className={styles.heroActions}>
                    <ActionButton href={WHATSAPP_LINK}>Написать в WhatsApp</ActionButton>
                    <ActionButton href={PHONE_LINK} secondary>
                      Позвонить
                    </ActionButton>
                  </div>
                </Reveal>

                <Reveal delay={0.12}>
                  <aside className={styles.contactCard}>
                    <div className={styles.contactBadge}>
                      <MessageCircle size={18} strokeWidth={1.8} />
                      <span>Отвечаю лично</span>
                    </div>

                    <a
                      href={WHATSAPP_LINK}
                      className={styles.contactLinkPrimary}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span>WhatsApp</span>
                      <ArrowRight size={18} strokeWidth={1.8} />
                    </a>

                    <a href={PHONE_LINK} className={styles.contactLinkSecondary}>
                      <Phone size={18} strokeWidth={1.8} />
                      <span>{PHONE_DISPLAY}</span>
                    </a>

                    <div className={styles.contactList}>
                      {contactPromises.map((item) => (
                        <div key={item} className={styles.contactListItem}>
                          <CheckCircle2 size={16} strokeWidth={1.8} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <p className={styles.finalNote}>WhatsApp и звонки доступны ежедневно.</p>
                  </aside>
                </Reveal>
              </div>
            </section>
          </main>

          <footer className={styles.footer}>
            <p className={styles.footerText}>Веб-студия · Лендинги для заведений</p>
          </footer>
        </div>

        <div className={styles.mobileBar}>
          <a
            href={WHATSAPP_LINK}
            className={styles.mobileBarAction}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle size={18} strokeWidth={1.8} />
            <span>WhatsApp</span>
          </a>

          <a href={PHONE_LINK} className={classNames(styles.mobileBarAction, styles.mobileBarSecondary)}>
            <Phone size={18} strokeWidth={1.8} />
            <span>Позвонить</span>
          </a>
        </div>
      </div>
    </>
  );
}
