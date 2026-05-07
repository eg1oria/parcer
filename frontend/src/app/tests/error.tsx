"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function TestsRouteError({
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
      title="Не удалось открыть список тестов"
      description="Падение экрана со списком тестов изолировано в пределах этого маршрута. Можно повторить загрузку или вернуться на главную."
    />
  );
}
