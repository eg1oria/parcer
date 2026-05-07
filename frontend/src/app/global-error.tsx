"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-stone-100">
        <ErrorFallback
          error={error}
          reset={reset}
          title="Приложение временно недоступно"
          description="Даже если ошибка произошла на уровне layout, пользователь получит контролируемый экран вместо полного падения."
        />
      </body>
    </html>
  );
}
