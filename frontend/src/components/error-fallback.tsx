"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

const primaryButtonClass =
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-teal-800";
const secondaryButtonClass =
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-center text-sm font-semibold text-stone-800 transition hover:bg-stone-100";

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  homeHref?: string;
  homeLabel?: string;
};

export function ErrorFallback({
  error,
  reset,
  title,
  description,
  homeHref = "/",
  homeLabel = "На главную",
}: ErrorFallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 py-10 text-stone-950">
      <section className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" className={primaryButtonClass} onClick={reset}>
            <RefreshCw size={17} aria-hidden="true" />
            Попробовать снова
          </button>
          <Link href={homeHref} className={secondaryButtonClass}>
            <Home size={17} aria-hidden="true" />
            {homeLabel}
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-5 text-xs text-stone-500">
            Код ошибки: {error.digest}
          </p>
        ) : null}
      </section>
    </main>
  );
}
