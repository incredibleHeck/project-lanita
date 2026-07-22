import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

export const ACCESS_COOKIE = 'lanita_access_token';
export const REFRESH_COOKIE = 'lanita_refresh_token';

export function cookieOptions(config: ConfigService, maxAgeMs: number) {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
) {
  res.cookie(
    ACCESS_COOKIE,
    tokens.accessToken,
    cookieOptions(config, 15 * 60 * 1000),
  );
  res.cookie(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(config, 7 * 24 * 60 * 60 * 1000),
  );
}

export function clearAuthCookies(res: Response, config: ConfigService) {
  const base = cookieOptions(config, 0);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
