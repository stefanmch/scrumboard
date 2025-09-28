import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SimpleJwtAuthGuard, AuthenticatedRequest } from './simple-jwt-auth.guard';
import { SimpleJwtService } from '../services/simple-jwt.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../services/simple-jwt.service';

describe('SimpleJwtAuthGuard', () => {
  let guard: SimpleJwtAuthGuard;
  let jwtService: jest.Mocked<SimpleJwtService>;
  let reflector: jest.Mocked<Reflector>;

  const mockJwtService = {
    verifyAccessToken: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimpleJwtAuthGuard,
        {
          provide: SimpleJwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<SimpleJwtAuthGuard>(SimpleJwtAuthGuard);
    jwtService = module.get<SimpleJwtService>(SimpleJwtService) as jest.Mocked<SimpleJwtService>;
    reflector = module.get<Reflector>(Reflector) as jest.Mocked<Reflector>;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;
    let mockRequest: AuthenticatedRequest;

    beforeEach(() => {
      mockRequest = {
        headers: {},
        user: undefined,
      } as AuthenticatedRequest;

      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;
    });

    describe('Public Routes', () => {
      it('should allow access to public routes', async () => {
        reflector.getAllAndOverride.mockReturnValue(true);

        const result = await guard.canActivate(mockExecutionContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
        expect(result).toBe(true);
        expect(jwtService.verifyAccessToken).not.toHaveBeenCalled();
      });

      it('should check public routes at handler level', async () => {
        reflector.getAllAndOverride.mockReturnValue(true);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should check public routes at class level', async () => {
        reflector.getAllAndOverride.mockReturnValue(true);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });
    });

    describe('Protected Routes', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockReturnValue(false);
      });

      it('should authenticate user with valid token', async () => {
        const validToken = 'valid.jwt.token';
        const mockPayload: JwtPayload = {
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        };

        mockRequest.headers.authorization = `Bearer ${validToken}`;
        jwtService.verifyAccessToken.mockResolvedValue(mockPayload);

        const result = await guard.canActivate(mockExecutionContext);

        expect(jwtService.verifyAccessToken).toHaveBeenCalledWith(validToken);
        expect(mockRequest.user).toEqual({
          userId: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });
        expect(result).toBe(true);
      });

      it('should handle user with multiple roles', async () => {
        const validToken = 'valid.jwt.token';
        const mockPayload: JwtPayload = {
          sub: '1',
          email: 'admin@example.com',
          roles: ['ADMIN', 'SCRUM_MASTER'],
        };

        mockRequest.headers.authorization = `Bearer ${validToken}`;
        jwtService.verifyAccessToken.mockResolvedValue(mockPayload);

        const result = await guard.canActivate(mockExecutionContext);

        expect(mockRequest.user?.roles).toEqual(['ADMIN', 'SCRUM_MASTER']);
        expect(result).toBe(true);
      });

      it('should handle user with no roles', async () => {
        const validToken = 'valid.jwt.token';
        const mockPayload: JwtPayload = {
          sub: '1',
          email: 'test@example.com',
          roles: undefined,
        };

        mockRequest.headers.authorization = `Bearer ${validToken}`;
        jwtService.verifyAccessToken.mockResolvedValue(mockPayload);

        const result = await guard.canActivate(mockExecutionContext);

        expect(mockRequest.user?.roles).toEqual([]);
        expect(result).toBe(true);
      });

      it('should handle user with empty roles array', async () => {
        const validToken = 'valid.jwt.token';
        const mockPayload: JwtPayload = {
          sub: '1',
          email: 'test@example.com',
          roles: [],
        };

        mockRequest.headers.authorization = `Bearer ${validToken}`;
        jwtService.verifyAccessToken.mockResolvedValue(mockPayload);

        const result = await guard.canActivate(mockExecutionContext);

        expect(mockRequest.user?.roles).toEqual([]);
        expect(result).toBe(true);
      });
    });

    describe('Token Extraction', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockReturnValue(false);
      });

      it('should throw UnauthorizedException when no authorization header', async () => {
        mockRequest.headers = {};

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Access token is required')
        );
      });

      it('should throw UnauthorizedException when authorization header is empty', async () => {
        mockRequest.headers.authorization = '';

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Access token is required')
        );
      });

      it('should throw UnauthorizedException when not Bearer token', async () => {
        mockRequest.headers.authorization = 'Basic some-token';

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Access token is required')
        );
      });

      it('should throw UnauthorizedException when Bearer token is missing', async () => {
        mockRequest.headers.authorization = 'Bearer';

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Access token is required')
        );
      });

      it('should throw UnauthorizedException when Bearer token is empty', async () => {
        mockRequest.headers.authorization = 'Bearer ';

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Access token is required')
        );
      });

      it('should extract token correctly from well-formed authorization header', async () => {
        const token = 'valid.jwt.token';
        mockRequest.headers.authorization = `Bearer ${token}`;
        jwtService.verifyAccessToken.mockResolvedValue({
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });

        await guard.canActivate(mockExecutionContext);

        expect(jwtService.verifyAccessToken).toHaveBeenCalledWith(token);
      });

      it('should handle authorization header with extra spaces', async () => {
        const token = 'valid.jwt.token';
        mockRequest.headers.authorization = `Bearer  ${token}`;

        jwtService.verifyAccessToken.mockResolvedValue({
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });

        await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
        expect(jwtService.verifyAccessToken).toHaveBeenCalledWith(token);
      });

      it('should handle case-sensitive Bearer keyword', async () => {
        mockRequest.headers.authorization = 'bearer valid.jwt.token';

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Access token is required')
        );
      });
    });

    describe('Token Verification Errors', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockRequest.headers.authorization = 'Bearer valid.jwt.token';
      });

      it('should handle expired token error', async () => {
        const expiredError = new Error('Token expired');
        jwtService.verifyAccessToken.mockRejectedValue(expiredError);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Access token has expired')
        );
      });

      it('should handle invalid signature error', async () => {
        const signatureError = new Error('Invalid signature');
        jwtService.verifyAccessToken.mockRejectedValue(signatureError);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid access token signature')
        );
      });

      it('should handle malformed token error', async () => {
        const formatError = new Error('Invalid format');
        jwtService.verifyAccessToken.mockRejectedValue(formatError);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Malformed access token')
        );
      });

      it('should handle generic token errors', async () => {
        const genericError = new Error('Some other error');
        jwtService.verifyAccessToken.mockRejectedValue(genericError);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid access token')
        );
      });

      it('should handle UnauthorizedException from jwt service', async () => {
        const authError = new UnauthorizedException('Custom auth error');
        jwtService.verifyAccessToken.mockRejectedValue(authError);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(authError);
      });

      it('should handle null/undefined errors', async () => {
        jwtService.verifyAccessToken.mockRejectedValue(null);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid access token')
        );
      });

      it('should handle errors without message property', async () => {
        const errorWithoutMessage = { name: 'SomeError' };
        jwtService.verifyAccessToken.mockRejectedValue(errorWithoutMessage);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Invalid access token')
        );
      });
    });

    describe('Integration with Reflector', () => {
      it('should call reflector with correct parameters', async () => {
        const mockHandler = jest.fn();
        const mockClass = jest.fn();
        mockExecutionContext.getHandler.mockReturnValue(mockHandler);
        mockExecutionContext.getClass.mockReturnValue(mockClass);

        reflector.getAllAndOverride.mockReturnValue(true);

        await guard.canActivate(mockExecutionContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          mockHandler,
          mockClass,
        ]);
      });

      it('should handle reflector returning null', async () => {
        reflector.getAllAndOverride.mockReturnValue(null);
        mockRequest.headers.authorization = 'Bearer valid.token';
        jwtService.verifyAccessToken.mockResolvedValue({
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should handle reflector returning undefined', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        mockRequest.headers.authorization = 'Bearer valid.token';
        jwtService.verifyAccessToken.mockResolvedValue({
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should handle reflector throwing errors', async () => {
        reflector.getAllAndOverride.mockImplementation(() => {
          throw new Error('Reflector error');
        });

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Reflector error');
      });
    });

    describe('Request User Assignment', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockRequest.headers.authorization = 'Bearer valid.token';
      });

      it('should properly assign user to request object', async () => {
        const mockPayload: JwtPayload = {
          sub: 'user-123',
          email: 'user@example.com',
          roles: ['ADMIN', 'MEMBER'],
        };

        jwtService.verifyAccessToken.mockResolvedValue(mockPayload);

        await guard.canActivate(mockExecutionContext);

        expect(mockRequest.user).toEqual({
          userId: 'user-123',
          email: 'user@example.com',
          roles: ['ADMIN', 'MEMBER'],
        });
      });

      it('should handle special characters in user data', async () => {
        const mockPayload: JwtPayload = {
          sub: 'user-with-special-chars-@#$',
          email: 'test+tag@example.co.uk',
          roles: ['ROLE-WITH-DASHES', 'ROLE_WITH_UNDERSCORES'],
        };

        jwtService.verifyAccessToken.mockResolvedValue(mockPayload);

        await guard.canActivate(mockExecutionContext);

        expect(mockRequest.user).toEqual({
          userId: 'user-with-special-chars-@#$',
          email: 'test+tag@example.co.uk',
          roles: ['ROLE-WITH-DASHES', 'ROLE_WITH_UNDERSCORES'],
        });
      });

      it('should not modify request if verification fails', async () => {
        const originalUser = mockRequest.user;
        jwtService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();

        expect(mockRequest.user).toBe(originalUser);
      });
    });

    describe('Edge Cases', () => {
      it('should handle missing request object', async () => {
        mockExecutionContext.switchToHttp.mockReturnValue({
          getRequest: jest.fn().mockReturnValue(null),
        } as any);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
      });

      it('should handle request without headers', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockRequest.headers = undefined as any;

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          new UnauthorizedException('Access token is required')
        );
      });

      it('should handle very long tokens', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const longToken = 'a'.repeat(10000);
        mockRequest.headers.authorization = `Bearer ${longToken}`;

        jwtService.verifyAccessToken.mockResolvedValue({
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });

        const result = await guard.canActivate(mockExecutionContext);

        expect(jwtService.verifyAccessToken).toHaveBeenCalledWith(longToken);
        expect(result).toBe(true);
      });

      it('should handle tokens with special characters', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const specialToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImp0aSI6ImY2MzliNDM1LTU4YzEtNGZhZi1hNzg0LTNmOGQzMWM0MzNlZSIsImlhdCI6MTU4Mjg4NTIzNSwiZXhwIjoxNTgyODg4ODM1fQ.validation-signature';
        mockRequest.headers.authorization = `Bearer ${specialToken}`;

        jwtService.verifyAccessToken.mockResolvedValue({
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });
    });

    describe('Performance Tests', () => {
      it('should handle concurrent requests efficiently', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockRequest.headers.authorization = 'Bearer valid.token';

        jwtService.verifyAccessToken.mockResolvedValue({
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });

        const promises = Array(100).fill(null).map(() =>
          guard.canActivate(mockExecutionContext)
        );

        const results = await Promise.all(promises);

        expect(results).toHaveLength(100);
        results.forEach(result => expect(result).toBe(true));
      });

      it('should complete verification quickly', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockRequest.headers.authorization = 'Bearer valid.token';

        jwtService.verifyAccessToken.mockResolvedValue({
          sub: '1',
          email: 'test@example.com',
          roles: ['MEMBER'],
        });

        const startTime = performance.now();
        await guard.canActivate(mockExecutionContext);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const request = {
        headers: {
          authorization: 'Bearer valid.jwt.token',
        },
      } as any;

      const token = (guard as any).extractTokenFromHeader(request);
      expect(token).toBe('valid.jwt.token');
    });

    it('should return undefined for missing authorization header', () => {
      const request = {
        headers: {},
      } as any;

      const token = (guard as any).extractTokenFromHeader(request);
      expect(token).toBeUndefined();
    });

    it('should return undefined for non-Bearer authorization', () => {
      const request = {
        headers: {
          authorization: 'Basic username:password',
        },
      } as any;

      const token = (guard as any).extractTokenFromHeader(request);
      expect(token).toBeUndefined();
    });

    it('should return undefined for malformed Bearer header', () => {
      const request = {
        headers: {
          authorization: 'Bearer',
        },
      } as any;

      const token = (guard as any).extractTokenFromHeader(request);
      expect(token).toBeUndefined();
    });

    it('should handle header with multiple spaces', () => {
      const request = {
        headers: {
          authorization: 'Bearer    token',
        },
      } as any;

      const token = (guard as any).extractTokenFromHeader(request);
      expect(token).toBe('token');
    });
  });
});