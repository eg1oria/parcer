import type { ActionLink } from "../_data/types";
import { ActionLinkButton } from "./action-link";

const footerLinks = [
  { href: "#categories", label: "Категории" },
  { href: "#benefits", label: "Преимущества" },
  { href: "#repair", label: "Ремонт" },
  { href: "#reviews", label: "Отзывы" },
  { href: "#faq", label: "FAQ" },
];

export function SiteFooter({
  address,
  hours,
  phoneDisplay,
  phoneHref,
  reviewsUrl,
  storeName,
  whatsappAction,
}: {
  address: string;
  hours: string;
  phoneDisplay: string;
  phoneHref: string;
  reviewsUrl: string;
  storeName: string;
  whatsappAction: ActionLink;
}) {
  return (
    <footer className="border-t border-white/8 bg-[#050c17]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_1fr] lg:px-8">
        <div>
          <p className="font-brand text-xl tracking-[0.28em] text-white">{storeName}</p>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#91a6c1]">
            Магазин техники и сервис, который выглядит готовым к запуску уже сейчас: премиальная подача, понятный сценарий обращения и реальная локальная репутация.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionLinkButton action={whatsappAction} className="px-4 py-3 text-sm" />
            <a
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-[#d8e3f4] transition hover:border-white/18 hover:bg-white/[0.04]"
              href={reviewsUrl}
              rel="noreferrer"
              target="_blank"
            >
              2GIS и отзывы
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7ee0ff]">
            Навигация
          </p>
          <div className="mt-5 space-y-3">
            {footerLinks.map((item) => (
              <a
                className="block text-sm text-[#b7cae2] transition hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7ee0ff]">
            Контакты
          </p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[#b7cae2]">
            <p>
              <span className="block text-[#91a6c1]">Адрес</span>
              {address}
            </p>
            <p>
              <span className="block text-[#91a6c1]">Телефон</span>
              <a className="transition hover:text-white" href={phoneHref}>
                {phoneDisplay}
              </a>
            </p>
            <p>
              <span className="block text-[#91a6c1]">Часы работы</span>
              {hours}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs leading-6 text-[#7b8fa9] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© 2026 {storeName}. Актуальные цены и условия рассрочки уточняйте при обращении.</p>
          <p>Лендинг оптимизирован под быстрый контакт через WhatsApp и звонок.</p>
        </div>
      </div>
    </footer>
  );
}
