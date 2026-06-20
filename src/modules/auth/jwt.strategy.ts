import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {
    super({
      // Try Authorization header first, then fall back to cookie [F-002]
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          // 1. Bearer token in Authorization header
          const auth = req.headers.authorization;
          if (auth?.startsWith('Bearer ')) return auth.slice(7);
          // 2. httpOnly cookie (set by backend on login)
          return req.cookies?.auth_token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-1234',
    });
  }

  async validate(payload: any) {
    // Check blacklist [F-009] — jti is added by authService at login/register
    if (payload.jti && this.authService.isTokenInvalidated(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    // Attach jti so logout endpoint can blacklist this token [F-009]
    return { ...user, jti: payload.jti };
  }
}
