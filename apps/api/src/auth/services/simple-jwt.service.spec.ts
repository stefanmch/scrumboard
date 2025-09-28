import { SimpleJwtService, JwtPayload } from './simple-jwt.service';
import { UnauthorizedException } from '@nestjs/common';

describe('SimpleJwtService', () => {
  let service: SimpleJwtService;

  beforeEach(() => {
    // Set test environment variables
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

    service = new SimpleJwtService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  describe('Token Generation and Verification', () => {
    const mockPayload: JwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      roles: ['user'],
    };

    it('should generate and verify access token', async () => {
      const token = await service.generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature

      const decoded = await service.verifyAccessToken(token);
      expect(decoded.sub).toBe(mockPayload.sub);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.roles).toEqual(mockPayload.roles);
    });

    it('should generate and verify refresh token', async () => {
      const token = await service.generateRefreshToken(mockPayload.sub);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = await service.verifyRefreshToken(token);
      expect(decoded.sub).toBe(mockPayload.sub);
      expect(decoded.tokenId).toBeDefined();
    });

    it('should generate token pair', async () => {
      const tokenPair = await service.generateTokenPair(mockPayload);

      expect(tokenPair).toBeDefined();
      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBe(15 * 60); // 15 minutes
      expect(tokenPair.tokenType).toBe('Bearer');
    });

    it('should reject invalid token signature', async () => {
      const token = await service.generateAccessToken(mockPayload);
      const [header, payload] = token.split('.');
      const tamperedToken = `${header}.${payload}.invalid-signature`;

      await expect(service.verifyAccessToken(tamperedToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject malformed token', async () => {
      await expect(service.verifyAccessToken('invalid.token')).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyAccessToken('not-a-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Token Utilities', () => {
    it('should extract token from authorization header', () => {
      const token = 'test-token-123';
      const authHeader = `Bearer ${token}`;

      const extracted = service.extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid authorization header', () => {
      expect(service.extractTokenFromHeader(undefined)).toBe(null);
      expect(service.extractTokenFromHeader('Invalid header')).toBe(null);
      expect(service.extractTokenFromHeader('Basic token123')).toBe(null);
      expect(service.extractTokenFromHeader('Bearer')).toBe(null);
    });

    it('should decode token without verification', async () => {
      const token = await service.generateAccessToken({
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
      });

      const decoded = service.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('Security Features', () => {
    it('should use different secrets for access and refresh tokens', async () => {
      const mockPayload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
      };

      const accessToken = await service.generateAccessToken(mockPayload);
      const refreshToken = await service.generateRefreshToken(mockPayload.sub);

      // Access token should not verify with refresh token method
      await expect(service.verifyRefreshToken(accessToken)).rejects.toThrow(UnauthorizedException);

      // Refresh token should not verify with access token method
      await expect(service.verifyAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});