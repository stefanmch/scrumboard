import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

@Injectable()
export class SimpleJwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: number = 15 * 60; // 15 minutes in seconds
  private readonly refreshTokenExpiry: number = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'change-this-secret-in-production';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret-in-production';
  }

  async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload.sub),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
      tokenType: 'Bearer',
    };
  }

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.accessTokenExpiry,
    };

    return this.createToken(tokenPayload, this.accessTokenSecret);
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const tokenId = this.generateTokenId();
    const now = Math.floor(Date.now() / 1000);
    const payload: RefreshTokenPayload = {
      sub: userId,
      tokenId,
      iat: now,
      exp: now + this.refreshTokenExpiry,
    };

    return this.createToken(payload, this.refreshTokenSecret);
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return this.verifyToken(token, this.accessTokenSecret) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return this.verifyToken(token, this.refreshTokenSecret) as RefreshTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }

  private generateTokenId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private createToken(payload: any, secret: string): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`, secret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string, secret: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`, secret);

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    const payload = JSON.parse(this.base64UrlDecode(encodedPayload));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  }

  private sign(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlDecode(str: string): string {
    str += '='.repeat((4 - str.length % 4) % 4);
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  }

  decodeToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    return JSON.parse(this.base64UrlDecode(parts[1]));
  }
}