import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { PublicRoute } from '../../auth/public-route.decorator';
import type { UserContext } from '../../auth/jwt.validator';
import { AuthProxyStrategy } from '../../auth/auth-proxy.strategy';
import { ConfigService } from '@nestjs/config';

/**
 * Auth Controller - Proxies to Auth Service
 *
 * All routes are public (authentication happens here)
 */
@Controller('auth')
@PublicRoute()
export class AuthController {
  private readonly authBaseUrl: string;

  constructor(
    private readonly authProxy: AuthProxyStrategy,
    config: ConfigService,
  ) {
    const authPort = config.get<string>('AUTH_SERVICE_URL');
    this.authBaseUrl = authPort || 'http://localhost:3008';
  }

  /**
   * POST /auth/register
   * Register a new user
   */
  @Post('register')
  async register(@Body() body: any, @Req() req: any) {
    const url = `${this.authBaseUrl}/auth/register`;
    return this.authProxy.post(null, url, body);
  }

  /**
   * POST /auth/login
   * Login and receive access token
   */
  @Post('login')
  async login(@Body() body: any) {
    const url = `${this.authBaseUrl}/auth/login`;
    return this.authProxy.post(null, url, body);
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  async refreshToken(@Body() body: any) {
    const url = `${this.authBaseUrl}/auth/refresh`;
    return this.authProxy.post(null, url, body);
  }

  /**
   * POST /auth/logout
   * Invalidate refresh token
   */
  @Post('logout')
  async logout(@Body() body: any, @Req() req: any) {
    const url = `${this.authBaseUrl}/auth/logout`;
    const user = req.user as UserContext | null;
    return this.authProxy.post(user, url, body);
  }

  /**
   * GET /auth/me
   * Get current user profile
   */
  @Get('me')
  async getCurrentUser(@Req() req: any) {
    const url = `${this.authBaseUrl}/auth/me`;
    const user = req.user as UserContext | null;
    return this.authProxy.get(user, url);
  }
}
