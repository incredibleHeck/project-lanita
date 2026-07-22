import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { REFRESH_COOKIE } from '../auth-cookies';

function fromRefreshCookieOrBearer(req: Request): string | null {
  const cookieToken = req?.cookies?.[REFRESH_COOKIE];
  if (cookieToken) return cookieToken;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: fromRefreshCookieOrBearer,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    } as any);
  }

  validate(req: Request, payload: any) {
    const fromCookie = req.cookies?.[REFRESH_COOKIE];
    const fromHeader = req.get('Authorization')?.replace('Bearer', '').trim();
    const refreshToken = fromCookie || fromHeader;
    return { ...payload, refreshToken };
  }
}
