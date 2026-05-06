import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RegisterUseCase } from '../../application/use-cases/register/register.use-case';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout/logout.use-case';
import { RegisterDto } from '../../application/use-cases/register/register.dto';
import { LoginDto } from '../../application/use-cases/login/login.dto';
import { RefreshTokenDto } from '../../application/use-cases/refresh-token/refresh-token.dto';
import { LogoutDto } from '../../application/use-cases/logout/logout.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User successfully registered' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or email already exists' })
  @UseGuards(ThrottlerGuard)
  async register(@Body() input: RegisterDto) {
    return this.registerUseCase.execute(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' })
  @UseGuards(ThrottlerGuard)
  async login(@Body() input: LoginDto, @Body('deviceId') deviceId?: string) {
    return this.loginUseCase.execute(input, deviceId ?? 'unknown');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token refreshed successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() input: RefreshTokenDto, @Body('deviceId') deviceId?: string) {
    return this.refreshTokenUseCase.execute(input, deviceId ?? 'unknown');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logout successful' })
  async logout(@Body() input: LogoutDto) {
    return this.logoutUseCase.execute(input);
  }
}
