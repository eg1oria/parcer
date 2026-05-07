import { ConfigService } from '@nestjs/config';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  let service: AuthRateLimitService;

  beforeEach(() => {
    service = new AuthRateLimitService({
      get: (key: string) => {
        if (key === 'AUTH_RATE_LIMIT_MAX_ATTEMPTS') {
          return '2';
        }

        if (key === 'AUTH_RATE_LIMIT_WINDOW_MS') {
          return '1000';
        }

        return undefined;
      },
    } as ConfigService);
  });

  it('allows requests until the configured limit and blocks the next one', () => {
    expect(service.consume('login:127.0.0.1', 0)).toMatchObject({
      allowed: true,
    });
    expect(service.consume('login:127.0.0.1', 100)).toMatchObject({
      allowed: true,
    });
    expect(service.consume('login:127.0.0.1', 200)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  it('expires attempt counters after the configured window', () => {
    expect(service.consume('login:127.0.0.1', 0).allowed).toBe(true);
    expect(service.consume('login:127.0.0.1', 100).allowed).toBe(true);
    expect(service.consume('login:127.0.0.1', 1200).allowed).toBe(true);
  });

  it('clears all buckets on reset', () => {
    expect(service.consume('login:127.0.0.1', 0).allowed).toBe(true);
    expect(service.consume('login:127.0.0.1', 100).allowed).toBe(true);

    service.reset();

    expect(service.consume('login:127.0.0.1', 200).allowed).toBe(true);
  });
});
