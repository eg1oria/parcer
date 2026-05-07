import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthRateLimitService } from './auth-rate-limit.service';

type AuthRequestBody = {
  email?: unknown;
};

type AuthRequest = Request & {
  body?: AuthRequestBody;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthRequest>();
    const response = http.getResponse<Response>();
    const now = Date.now();
    const routeKey = request.route?.path ?? request.path ?? 'auth';
    const ipKey = `${routeKey}:ip:${this.getClientIp(request)}`;
    const email = this.normalizeEmail(request.body?.email);
    const ipDecision = this.authRateLimitService.consume(ipKey, now);

    if (!ipDecision.allowed) {
      this.throwRateLimitExceeded(response, ipDecision.retryAfterSeconds);
    }

    if (email) {
      const identityDecision = this.authRateLimitService.consume(
        `${routeKey}:ip-email:${this.getClientIp(request)}:${email}`,
        now,
      );

      if (!identityDecision.allowed) {
        this.throwRateLimitExceeded(
          response,
          identityDecision.retryAfterSeconds,
        );
      }
    }

    return true;
  }

  private throwRateLimitExceeded(
    response: Response,
    retryAfterSeconds: number,
  ): never {
    response.setHeader('Retry-After', String(retryAfterSeconds));
    throw new HttpException(
      `Too many authentication attempts. Try again in ${retryAfterSeconds} seconds.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private getClientIp(request: Request): string {
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  private normalizeEmail(value: unknown): string | null {
    return typeof value === 'string' ? value.trim().toLowerCase() : null;
  }
}
