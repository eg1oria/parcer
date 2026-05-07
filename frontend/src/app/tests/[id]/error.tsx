"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function TestRunError({
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
      title="Не удалось открыть тест"
      description="Если один тестовый раннер падает, ошибка остаётся в пределах этого экрана и не валит всё приложение."
      homeHref="/tests"
      homeLabel="К списку тестов"
    />
  );
}
