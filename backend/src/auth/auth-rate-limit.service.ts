import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getPositiveIntConfig } from '../common/config/env-number';

const DEFAULT_AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;
const DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 1000;

type AuthRateLimitState = {
  count: number;
  resetAt: number;
};

export type AuthRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly attempts = new Map<string, AuthRateLimitState>();
  private nextCleanupAt = 0;

  constructor(private readonly configService: ConfigService) {}

  consume(key: string, now = Date.now()): AuthRateLimitDecision {
    this.cleanupExpiredEntries(now);

    const windowMs = this.authRateLimitWindowMs();
    const maxAttempts = this.authRateLimitMaxAttempts();
    const existingAttempt = this.attempts.get(key);

    if (!existingAttempt || existingAttempt.resetAt <= now) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      return {
        allowed: true,
        retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
      };
    }

    if (existingAttempt.count >= maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existingAttempt.resetAt - now) / 1000),
        ),
      };
    }

    existingAttempt.count += 1;
    this.attempts.set(key, existingAttempt);

    return {
      allowed: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existingAttempt.resetAt - now) / 1000),
      ),
    };
  }

  reset(): void {
    this.attempts.clear();
    this.nextCleanupAt = 0;
  }

  private cleanupExpiredEntries(now: number): void {
    if (now < this.nextCleanupAt) {
      return;
    }

    for (const [key, attempt] of this.attempts.entries()) {
      if (attempt.resetAt <= now) {
        this.attempts.delete(key);
      }
    }

    this.nextCleanupAt = now + RATE_LIMIT_CLEANUP_INTERVAL_MS;
  }

  private authRateLimitMaxAttempts(): number {
    return getPositiveIntConfig(
      this.configService,
      'AUTH_RATE_LIMIT_MAX_ATTEMPTS',
      DEFAULT_AUTH_RATE_LIMIT_MAX_ATTEMPTS,
    );
  }

  private authRateLimitWindowMs(): number {
    return getPositiveIntConfig(
      this.configService,
      'AUTH_RATE_LIMIT_WINDOW_MS',
      DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS,
    );
  }
}
