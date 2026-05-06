import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

export interface UserContext {
  userId: string;
  email: string;
  roles: string[];
}

/**
 * Validates JWT tokens without calling Auth Service
 * Uses shared JWT secret - Gateway can verify tokens independently
 */
@Injectable()
export class JwtValidator {
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.get<string>('JWT_SECRET') || 'dev-secret-change-in-production';
  }

  /**
   * Validate JWT and return user context
   * Throws UnauthorizedException if token is invalid
   */
  validate(token: string): UserContext {
    try {
      const payload = jwt.verify(token, this.secret) as JwtPayload;

      return {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (for logging only)
   */
  decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}
