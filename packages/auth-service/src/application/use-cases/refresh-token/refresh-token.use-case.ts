import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRepository } from '../../../../domain/repositories/user.repository.interface';
import { User } from '../../../../domain/aggregates/user.aggregate';
import { RefreshToken } from '../../../../domain/value-objects/refresh-token.vo';
import { RefreshTokenDto, RefreshTokenOutput } from './refresh-token.dto';
import { USER_REPOSITORY, JWT_SERVICE } from '../../../tokens';
import type { JwtPayload } from '../login/login.use-case';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(JWT_SERVICE) private readonly jwtService: JwtService,
  ) {}

  async execute(input: RefreshTokenDto, deviceId: string): Promise<RefreshTokenOutput> {
    // Find user with this refresh token
    const users = await this.repo.findAll();
    let user: User | null = null;
    let matchingToken: RefreshToken | null = null;

    for (const u of users) {
      const tokens = u.getRefreshTokens();
      const found = tokens.find((t) => t.token === input.refreshToken && t.isValid());
      if (found) {
        user = u;
        matchingToken = found;
        break;
      }
    }

    if (!user || !matchingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify device matches
    if (!matchingToken.matchesDeviceId(deviceId)) {
      throw new UnauthorizedException('Device mismatch');
    }

    // Remove old token and add new one
    user.removeRefreshToken(matchingToken.token);
    const newRefreshToken = RefreshToken.create(deviceId, 7);
    user.addRefreshToken(newRefreshToken);

    // Generate new access token
    const payload: JwtPayload = {
      sub: user.getId(),
      email: user.getEmail(),
      roles: user.getRoles(),
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Save
    await this.repo.save(user);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    return {
      accessToken,
      refreshToken: newRefreshToken.token,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
