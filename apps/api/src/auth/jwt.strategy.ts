import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is missing. Refusing to start.');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret as string,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, tenantId: payload.tenantId, role: payload.role };
  }
}
