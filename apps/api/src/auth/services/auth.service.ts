import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HashService } from './hash.service';
import { CustomJwtService, JwtPayload, TokenPair } from './jwt.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashService: HashService,
    private readonly jwtService: CustomJwtService,
  ) {
    this.maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
    this.lockoutDuration = parseInt(process.env.LOCKOUT_DURATION || '1800000'); // 30 minutes in ms
  }

  async register(registerDto: RegisterDto) {
    // Validate password strength
    const passwordValidation = this.hashService.validatePasswordStrength(registerDto.password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Check if user already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashService.hashPassword(registerDto.password);

    // Create user
    const user = await this.prismaService.user.create({
      data: {
        email: registerDto.email,
        name: registerDto.name,
        password: hashedPassword,
        role: registerDto.role || 'MEMBER',
        emailVerified: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate email verification token
    const verificationToken = this.hashService.generateSecureToken();
    await this.prismaService.verificationToken.create({
      data: {
        userId: user.id,
        token: await this.hashService.hashResetToken(verificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, verificationToken);

    return {
      user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: any; tokens: TokenPair }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prismaService.user.findUnique({
      where: { email },
      include: {
        loginAttempts: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - this.lockoutDuration),
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is temporarily locked. Please try again later.');
    }

    // Check failed attempts
    const recentFailedAttempts = user.loginAttempts.filter(
      (attempt) => !attempt.successful
    ).length;

    if (recentFailedAttempts >= this.maxLoginAttempts) {
      // Lock account
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          lockedUntil: new Date(Date.now() + this.lockoutDuration),
        },
      });

      throw new ForbiddenException('Too many failed attempts. Account has been locked.');
    }

    // Verify password
    const isPasswordValid = await this.hashService.comparePasswords(password, user.password);

    if (!isPasswordValid) {
      // Log failed attempt
      await this.prismaService.loginAttempt.create({
        data: {
          userId: user.id,
          ipAddress: loginDto.ipAddress,
          userAgent: loginDto.userAgent,
          successful: false,
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ForbiddenException('Please verify your email before logging in');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenException('Your account has been deactivated');
    }

    // Log successful attempt
    await this.prismaService.loginAttempt.create({
      data: {
        userId: user.id,
        ipAddress: loginDto.ipAddress,
        userAgent: loginDto.userAgent,
        successful: true,
      },
    });

    // Update last login
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        lockedUntil: null, // Clear any lockout
      },
    });

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: [user.role],
    };

    const tokens = await this.jwtService.generateTokenPair(payload);

    // Store refresh token
    await this.prismaService.refreshToken.create({
      data: {
        userId: user.id,
        token: await this.hashService.hashResetToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: loginDto.ipAddress,
        userAgent: loginDto.userAgent,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenPair> {
    const { refreshToken } = refreshTokenDto;

    // Verify refresh token
    const payload = await this.jwtService.verifyRefreshToken(refreshToken);

    // Find stored refresh token
    const storedTokens = await this.prismaService.refreshToken.findMany({
      where: {
        userId: payload.sub,
        expiresAt: { gte: new Date() },
        revokedAt: null,
      },
    });

    // Verify token exists and is valid
    let validToken: any = null;
    for (const token of storedTokens) {
      if (await this.hashService.verifyResetToken(refreshToken, token.token)) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Revoke old refresh token
    await this.prismaService.refreshToken.update({
      where: { id: validToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new token pair
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: [user.role],
    };

    const tokens = await this.jwtService.generateTokenPair(jwtPayload);

    // Store new refresh token
    await this.prismaService.refreshToken.create({
      data: {
        userId: user.id,
        token: await this.hashService.hashResetToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: refreshTokenDto.ipAddress,
        userAgent: refreshTokenDto.userAgent,
      },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific refresh token
      const storedTokens = await this.prismaService.refreshToken.findMany({
        where: {
          userId,
          revokedAt: null,
        },
      });

      for (const token of storedTokens) {
        if (await this.hashService.verifyResetToken(refreshToken, token.token)) {
          await this.prismaService.refreshToken.update({
            where: { id: token.id },
            data: { revokedAt: new Date() },
          });
          break;
        }
      }
    } else {
      // Revoke all refresh tokens for user
      await this.prismaService.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const verificationTokens = await this.prismaService.verificationToken.findMany({
      where: {
        expiresAt: { gte: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    let validToken: any = null;
    for (const vToken of verificationTokens) {
      if (await this.hashService.verifyResetToken(token, vToken.token)) {
        validToken = vToken;
        break;
      }
    }

    if (!validToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark token as used
    await this.prismaService.verificationToken.update({
      where: { id: validToken.id },
      data: { usedAt: new Date() },
    });

    // Verify user email
    await this.prismaService.user.update({
      where: { id: validToken.userId },
      data: { emailVerified: true },
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    // Don't reveal if user exists
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = this.hashService.generateSecureToken();

    // Store reset token
    await this.prismaService.passwordResetToken.create({
      data: {
        userId: user.id,
        token: await this.hashService.hashResetToken(resetToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send password reset email
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    // Find valid reset token
    const resetTokens = await this.prismaService.passwordResetToken.findMany({
      where: {
        expiresAt: { gte: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    let validToken: any = null;
    for (const rToken of resetTokens) {
      if (await this.hashService.verifyResetToken(resetPasswordDto.token, rToken.token)) {
        validToken = rToken;
        break;
      }
    }

    if (!validToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate new password
    const passwordValidation = this.hashService.validatePasswordStrength(resetPasswordDto.newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Hash new password
    const hashedPassword = await this.hashService.hashPassword(resetPasswordDto.newPassword);

    // Update password
    await this.prismaService.user.update({
      where: { id: validToken.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prismaService.passwordResetToken.update({
      where: { id: validToken.id },
      data: { usedAt: new Date() },
    });

    // Revoke all refresh tokens
    await this.prismaService.refreshToken.updateMany({
      where: { userId: validToken.userId },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.hashService.comparePasswords(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = this.hashService.validatePasswordStrength(changePasswordDto.newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Hash new password
    const hashedPassword = await this.hashService.hashPassword(changePasswordDto.newPassword);

    // Update password
    await this.prismaService.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens
    await this.prismaService.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async getUserSessions(userId: string): Promise<any[]> {
    const sessions = await this.prismaService.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map(session => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: false, // This would need additional logic to determine current session
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prismaService.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prismaService.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }
}