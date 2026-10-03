import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    let user: any = null;

    // 1. Try finding by ID
    try {
      if (payload.sub) {
        user = await this.usersService.findById(payload.sub);
      }
    } catch {
      user = null;
    }

    // 2. If not found by ID (e.g. database migrated or restored), fall back to email lookup
    if (!user && payload.email) {
      try {
        user = await this.usersService.findByEmail(payload.email);
      } catch {
        user = null;
      }
    }

    // 3. If still not found, return 401 Unauthorized (never let a 404 escape from authentication)
    if (!user) {
      throw new UnauthorizedException('User session invalid or expired. Please login again.');
    }

    return {
      userId: user._id ? user._id.toString() : payload.sub,
      email: user.email || payload.email,
      role: user.role || payload.role,
    };
  }
}

