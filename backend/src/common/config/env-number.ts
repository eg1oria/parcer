import type { ConfigService } from '@nestjs/config';

export function getPositiveIntConfig(
  configService: ConfigService,
  key: string,
  fallback: number,
): number {
  const rawValue = configService.get<string | number>(key);

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallback;
  }

  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);

  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
