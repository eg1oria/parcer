import type { ActionLink } from '../_data/types';
import { ActionLinkButton } from './action-link';

const navigation = [
  { href: '#categories', label: 'Категории' },
  { href: '#benefits', label: 'Преимущества' },
  { href: '#repair', label: 'Ремонт' },
  { href: '#reviews', label: 'Отзывы' },
  { href: '#faq', label: 'FAQ' },
];

export function SiteHeader({
  phoneAction,
  storeName,
  whatsappAction,
}: {
  phoneAction: ActionLink;
  storeName: string;
  whatsappAction: ActionLink;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07111f]/72 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a className="min-w-0" href="#top">
          <span className="font-brand block text-lg tracking-[0.28em] text-white sm:text-xl">
            {storeName}
          </span>
          <span className="block text-xs uppercase tracking-[0.24em] text-[#7ee0ff]/72">
            premium tech store
          </span>
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {navigation.map((item) => (
            <a
              className="text-sm font-medium text-[#9ab0ca] transition hover:text-white"
              href={item.href}
              key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ActionLinkButton action={phoneAction} className="px-4 py-2.5" variant="secondary" />
          <ActionLinkButton action={whatsappAction} className="px-4 py-2.5" />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ActionLinkButton action={whatsappAction} className="px-3 py-2.5 text-xs" />
        </div>
      </div>
    </header>
  );
}
