import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './services/auth.service';
import { SimpleJwtAuthGuard } from './guards/simple-jwt-auth.guard';
import { Public, Roles } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  AuthResponseDto,
  RefreshResponseDto,
  UserResponseDto,
} from './dto';
import type { JwtPayload } from './services/jwt.service';

@Controller('auth')
// @UseGuards(ThrottleGuard) // Removed throttling for now
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  // @Throttle(60, 5) // 5 requests per minute
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // @Throttle(60, 10) // 10 requests per minute
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login({
      ...loginDto,
      ipAddress,
      userAgent,
    });

    return new AuthResponseDto({
      user: new UserResponseDto(result.user),
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer',
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // @Throttle(60, 20) // 20 requests per minute
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<RefreshResponseDto> {
    const tokens = await this.authService.refreshToken({
      ...refreshTokenDto,
      ipAddress,
      userAgent,
    });

    return new RefreshResponseDto({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer',
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SimpleJwtAuthGuard)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Body() body?: { refreshToken?: string },
  ): Promise<void> {
    await this.authService.logout(user.sub, body?.refreshToken);
  }

  @Get('me')
  @UseGuards(SimpleJwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
    const currentUser = await this.authService.validateUser(user.sub);
    return new UserResponseDto(currentUser);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  // @Throttle(60, 10) // 10 requests per minute
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    await this.authService.verifyEmail(verifyEmailDto.token);
    return { message: 'Email successfully verified' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  // @Throttle(60, 3) // 3 requests per minute
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return { message: 'If an account with that email exists, a password reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  // @Throttle(60, 5) // 5 requests per minute
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password successfully reset' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SimpleJwtAuthGuard)
  // @Throttle(60, 5) // 5 requests per minute
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.sub, changePasswordDto);
    return { message: 'Password successfully changed' };
  }

  @Get('sessions')
  @UseGuards(SimpleJwtAuthGuard)
  async getSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.getUserSessions(user.sub);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SimpleJwtAuthGuard)
  // @Throttle(60, 10) // 10 requests per minute
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('id') sessionId: string,
  ): Promise<void> {
    await this.authService.revokeSession(user.sub, sessionId);
  }
}