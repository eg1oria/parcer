"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Не удалось открыть приложение"
      description="Ошибка в одном из компонентов не должна ломать весь интерфейс. Можно повторить попытку или вернуться на главную."
    />
  );
}
