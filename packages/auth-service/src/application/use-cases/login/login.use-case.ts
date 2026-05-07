import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRepository } from '@domain/repositories/user.repository.interface';
import type { EventPublisher } from '@app/shared';
import { UserRoleEnum } from '@app/shared';
import { RefreshToken } from '@domain/value-objects/refresh-token.vo';
import { LoginDto } from './login.dto';
import type { LoginOutput } from './login.dto';
import { USER_REPOSITORY, EVENT_PUBLISHER, JWT_SERVICE } from '../../../tokens';
import bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRoleEnum[];
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
    @Inject(JWT_SERVICE) private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginDto, deviceId: string): Promise<LoginOutput> {
    // Find user by email
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const hashedPassword = {
      getHash: () => user.getPasswordHash(),
      compare: async (plain: string) => {
        return bcrypt.compare(plain, user.getPasswordHash());
      },
    };

    const isValid = await hashedPassword.compare(input.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Login user
    await user.login(deviceId);

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.getId(),
      email: user.getEmail(),
      roles: user.getRoles(),
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshTokenEntity = RefreshToken.create(deviceId, 7);
    user.addRefreshToken(refreshTokenEntity);

    // Save
    await this.repo.save(user);

    // Publish events
    const events = user.getDomainEvents();
    await this.publisher.publishAll(events);
    user.clearDomainEvents();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

    return {
      accessToken,
      refreshToken: refreshTokenEntity.token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.getId(),
        email: user.getEmail(),
        roles: user.getRoles(),
      },
    };
  }
}
