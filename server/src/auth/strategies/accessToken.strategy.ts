import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESS_COOKIE } from '../auth-cookies';

function fromCookieOrBearer(req: Request): string | null {
  const cookieToken = req?.cookies?.[ACCESS_COOKIE];
  if (cookieToken) return cookieToken;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: fromCookieOrBearer,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: { sub: string; email?: string; role?: string }) {
    if (payload.role) {
      return payload;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true },
    });
    return {
      ...payload,
      role: user?.role ?? payload.role,
    };
  }
}
