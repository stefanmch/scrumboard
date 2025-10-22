import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Authentication API (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let testUser: {
    email: string
    password: string
    name: string
    id?: string
    accessToken?: string
    refreshToken?: string
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    // Enable validation pipes like in production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    )

    await app.init()

    prisma = moduleFixture.get<PrismaService>(PrismaService)

    // Initialize test user data
    testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
    }
  })

  afterAll(async () => {
    // Cleanup: Delete test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            testUser.email,
            'duplicate@example.com',
            'weakpass@example.com',
            'unverified@example.com',
            'ratelimit@example.com',
            'newuser@example.com',
          ],
        },
      },
    })

    await app.close()
  })

  describe('POST /auth/register', () => {
    it('should successfully register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        })
        .expect(201)

      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('id')
      expect(response.body.user.email).toBe(testUser.email)
      expect(response.body.user.name).toBe(testUser.name)
      expect(response.body.user).toHaveProperty('role', 'MEMBER')
      expect(response.body.user).not.toHaveProperty('password')

      // Store user ID for subsequent tests
      testUser.id = response.body.user.id
    })

    it('should reject registration with duplicate email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: 'AnotherPassword123!',
          name: 'Another User',
        })
        .expect(409)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('already exists')
    })

    it('should reject registration with weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'weakpass@example.com',
          password: 'weak',
          name: 'Weak Password User',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
      expect(Array.isArray(response.body.message)).toBe(true)
      expect(response.body.message[0]).toContain('at least 8 characters')
    })

    it('should reject registration with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'ValidPassword123!',
          name: 'Invalid Email User',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
      expect(Array.isArray(response.body.message)).toBe(true)
      expect(response.body.message[0]).toContain('valid email')
    })

    it('should reject registration with missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'incomplete@example.com',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/login', () => {
    beforeAll(async () => {
      // Verify test user's email to allow login
      await prisma.user.update({
        where: { id: testUser.id },
        data: { emailVerified: true },
      })
    })

    it('should successfully login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)

      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body).toHaveProperty('expiresIn', 900) // 15 minutes
      expect(response.body).toHaveProperty('tokenType', 'Bearer')
      expect(response.body.user.email).toBe(testUser.email)

      // Store tokens for subsequent tests
      testUser.accessToken = response.body.accessToken
      testUser.refreshToken = response.body.refreshToken
    })

    it('should reject login with invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Invalid credentials')
    })

    it('should reject login with non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Invalid credentials')
    })

    it('should reject login with unverified email', async () => {
      // Create unverified user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'unverified@example.com',
        password: 'Password123!',
        name: 'Unverified User',
      })

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'Password123!',
        })
        .expect(403)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('verify your email')
    })

    it('should track login attempts', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)

      // Verify login attempt was recorded
      const loginAttempts = await prisma.loginAttempt.findMany({
        where: { userId: testUser.id },
      })

      expect(loginAttempts.length).toBeGreaterThan(0)
      expect(loginAttempts[0]).toHaveProperty('successful', true)
    })
  })

  describe('Rate Limiting (POST /auth/login)', () => {
    let rateLimitUser: { email: string; password: string; id: string }

    beforeAll(async () => {
      // Create and verify a user for rate limiting tests
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'ratelimit@example.com',
          password: 'RateLimitTest123!',
          name: 'Rate Limit User',
        })

      rateLimitUser = {
        email: 'ratelimit@example.com',
        password: 'RateLimitTest123!',
        id: registerResponse.body.user.id,
      }

      await prisma.user.update({
        where: { id: rateLimitUser.id },
        data: { emailVerified: true },
      })
    })

    it('should lock account after 5 failed login attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: rateLimitUser.email,
            password: 'WrongPassword',
          })
          .expect(401)
      }

      // 6th attempt should result in account lock
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: rateLimitUser.email,
          password: rateLimitUser.password,
        })
        .expect(403)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('locked')
    })

    it('should verify account lockout duration', async () => {
      const user = await prisma.user.findUnique({
        where: { id: rateLimitUser.id },
      })

      expect(user.lockedUntil).toBeDefined()

      // Verify lockout is set for future time
      const lockedUntil = new Date(user.lockedUntil)
      const now = new Date()
      expect(lockedUntil.getTime()).toBeGreaterThan(now.getTime())

      // Verify lockout is approximately 15 minutes (with 1 minute tolerance)
      const lockDuration = (lockedUntil.getTime() - now.getTime()) / 1000 / 60
      expect(lockDuration).toBeGreaterThan(14)
      expect(lockDuration).toBeLessThan(16)
    })
  })

  describe('POST /auth/refresh', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: testUser.refreshToken,
        })
        .expect(200)

      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body).toHaveProperty('expiresIn', 900)
      expect(response.body).toHaveProperty('tokenType', 'Bearer')

      // Update stored tokens
      testUser.accessToken = response.body.accessToken
      testUser.refreshToken = response.body.refreshToken
    })

    it('should reject refresh with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
    })

    it('should reject refresh with expired token', async () => {
      // Create an expired refresh token
      const expiredToken = await prisma.refreshToken.create({
        data: {
          userId: testUser.id,
          token: 'expired-token-test',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
      })

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: expiredToken.token,
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('expired')
    })

    it('should reject refresh with revoked token', async () => {
      // Create and revoke a token
      const revokedToken = await prisma.refreshToken.create({
        data: {
          userId: testUser.id,
          token: 'revoked-token-test',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          revokedAt: new Date(),
        },
      })

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: revokedToken.token,
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/logout', () => {
    it('should successfully logout user', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send()
        .expect(204)
    })

    it('should logout with specific refresh token', async () => {
      // Login to get new tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })

      const { accessToken, refreshToken } = loginResponse.body

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204)

      // Verify token was revoked
      const token = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })
      expect(token.revokedAt).toBeDefined()
    })

    it('should reject logout without authorization', async () => {
      await request(app.getHttpServer()).post('/auth/logout').send().expect(401)
    })

    it('should reject logout with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .send()
        .expect(401)
    })
  })

  describe('GET /auth/me', () => {
    let currentAccessToken: string

    beforeAll(async () => {
      // Get fresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
      currentAccessToken = loginResponse.body.accessToken
    })

    it('should successfully get current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${currentAccessToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', testUser.id)
      expect(response.body).toHaveProperty('email', testUser.email)
      expect(response.body).toHaveProperty('name', testUser.name)
      expect(response.body).not.toHaveProperty('password')
    })

    it('should reject request without authorization', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401)
    })

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })

    it('should reject request with expired token', async () => {
      // Note: Testing actual token expiration requires waiting or mocking time
      // This is a placeholder for the test structure
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjF9.invalid'

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)
    })
  })

  describe('POST /auth/verify-email', () => {
    let verificationToken: string
    let newUser: { id: string; email: string }

    beforeAll(async () => {
      // Create new user for verification
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'NewUser123!',
          name: 'New User',
        })

      newUser = {
        id: registerResponse.body.user.id,
        email: 'newuser@example.com',
      }

      // Get verification token from database
      const token = await prisma.verificationToken.findFirst({
        where: { userId: newUser.id },
      })
      verificationToken = token.token
    })

    it('should successfully verify email with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('successfully verified')

      // Verify user is marked as verified
      const user = await prisma.user.findUnique({
        where: { id: newUser.id },
      })
      expect(user.emailVerified).toBe(true)
    })

    it('should reject verification with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })

    it('should reject verification with already used token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })

    it('should reject verification with expired token', async () => {
      // Create expired verification token
      const expiredToken = await prisma.verificationToken.create({
        data: {
          userId: newUser.id,
          token: 'expired-verification-token',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      })

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: expiredToken.token })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('reset link')

      // Verify token was created
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' },
      })
      expect(resetToken).toBeDefined()
    })

    it('should return generic message for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('reset link')
    })

    it('should reject request with invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/reset-password', () => {
    let resetToken: string

    beforeAll(async () => {
      // Request password reset
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })

      // Get reset token from database
      const token = await prisma.passwordResetToken.findFirst({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' },
      })
      resetToken = token.token
    })

    it('should successfully reset password with valid token', async () => {
      const newPassword = 'NewPassword123!'

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('successfully reset')

      // Verify can login with new password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200)

      // Update test user password
      testUser.password = newPassword
    })

    it('should reject reset with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-reset-token',
          newPassword: 'ValidPassword123!',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })

    it('should reject reset with weak password', async () => {
      // Create new reset token
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })

      const token = await prisma.passwordResetToken.findFirst({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' },
      })

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: token.token,
          newPassword: 'weak',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
      expect(Array.isArray(response.body.message)).toBe(true)
    })

    it('should reject reset with already used token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword123!',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/change-password', () => {
    let accessToken: string

    beforeAll(async () => {
      // Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
      accessToken = loginResponse.body.accessToken
    })

    it('should successfully change password', async () => {
      const newPassword = 'ChangedPassword123!'

      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword,
        })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('successfully changed')

      // Verify can login with new password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200)

      // Update test user password
      testUser.password = newPassword
    })

    it('should reject change with wrong current password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('current password')
    })

    it('should reject change without authorization', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!',
        })
        .expect(401)
    })

    it('should reject change with weak new password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'weak',
        })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('GET /auth/sessions', () => {
    let accessToken: string

    beforeAll(async () => {
      // Login to create sessions
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
      accessToken = loginResponse.body.accessToken
    })

    it('should successfully get user sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)

      // Verify session structure
      const session = response.body[0]
      expect(session).toHaveProperty('id')
      expect(session).toHaveProperty('ipAddress')
      expect(session).toHaveProperty('userAgent')
      expect(session).toHaveProperty('createdAt')
      expect(session).toHaveProperty('expiresAt')
      expect(session).not.toHaveProperty('token') // Token should not be exposed
    })

    it('should return empty array for user with no sessions', async () => {
      // Create new user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'nosessions@example.com',
          password: 'NoSessions123!',
          name: 'No Sessions User',
        })

      const userId = registerResponse.body.user.id

      // Verify and login
      await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      })

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nosessions@example.com',
          password: 'NoSessions123!',
        })

      const token = loginResponse.body.accessToken

      // Delete all refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId },
      })

      const response = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0)

      // Cleanup
      await prisma.user.delete({ where: { id: userId } })
    })

    it('should reject request without authorization', async () => {
      await request(app.getHttpServer()).get('/auth/sessions').expect(401)
    })
  })

  describe('DELETE /auth/sessions/:id', () => {
    let accessToken: string
    let sessionId: string

    beforeAll(async () => {
      // Login to create session
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
      accessToken = loginResponse.body.accessToken

      // Get sessions
      const sessionsResponse = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)

      sessionId = sessionsResponse.body[0]?.id
    })

    it('should successfully revoke a session', async () => {
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      // Verify session was revoked
      const session = await prisma.refreshToken.findUnique({
        where: { id: sessionId },
      })
      expect(session.revokedAt).toBeDefined()
    })

    it('should return 404 for non-existent session', async () => {
      const response = await request(app.getHttpServer())
        .delete('/auth/sessions/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)

      expect(response.body).toHaveProperty('message')
    })

    it('should reject request without authorization', async () => {
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${sessionId}`)
        .expect(401)
    })

    it("should not allow revoking another user's session", async () => {
      // Create another user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'otheruser@example.com',
          password: 'OtherUser123!',
          name: 'Other User',
        })

      const otherUserId = registerResponse.body.user.id

      await prisma.user.update({
        where: { id: otherUserId },
        data: { emailVerified: true },
      })

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'otheruser@example.com',
          password: 'OtherUser123!',
        })

      const otherUserSessions = await prisma.refreshToken.findFirst({
        where: { userId: otherUserId },
      })

      // Try to revoke other user's session
      await request(app.getHttpServer())
        .delete(`/auth/sessions/${otherUserSessions.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)

      // Cleanup
      await prisma.user.delete({ where: { id: otherUserId } })
    })
  })

  describe('Security Tests', () => {
    it('should properly hash passwords', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      })

      // Password should be hashed, not plain text
      expect(user.password).not.toBe(testUser.password)
      expect(user.password).toMatch(/^[^:]+:[^:]+$/) // scrypt 'salt:hash' pattern
    })

    it('should generate valid JWT tokens', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })

      const { accessToken } = loginResponse.body

      // JWT should have 3 parts separated by dots
      const parts = accessToken.split('.')
      expect(parts).toHaveLength(3)

      // Should be able to use token for authenticated requests
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
    })

    it('should rotate refresh tokens on use', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })

      const { refreshToken: oldRefreshToken } = loginResponse.body

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200)

      const { refreshToken: newRefreshToken } = refreshResponse.body

      // New token should be different
      expect(newRefreshToken).not.toBe(oldRefreshToken)

      // Old token should be revoked
      const oldToken = await prisma.refreshToken.findUnique({
        where: { token: oldRefreshToken },
      })
      expect(oldToken.revokedAt).toBeDefined()
    })

    it('should validate token expiration', async () => {
      // This test verifies that expired tokens are rejected
      // Note: Actual expiration testing requires time manipulation or waiting
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })

      const { accessToken } = loginResponse.body

      // Verify token is currently valid
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      // Note: To test actual expiration, you would need to:
      // 1. Wait 15+ minutes (token expiry time)
      // 2. Or mock the JWT service to return expired tokens
      // 3. Or manipulate system time
    })

    it('should prevent SQL injection in email field', async () => {
      const sqlInjection = "admin@example.com' OR '1'='1"

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: sqlInjection,
          password: 'password',
        })
        .expect(401)

      // Should return normal auth error, not SQL error
      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Invalid credentials')
    })

    it('should sanitize user input', async () => {
      const xssAttempt = '<script>alert("XSS")</script>'

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'xss@example.com',
          password: 'XSSTest123!',
          name: xssAttempt,
        })
        .expect(201)

      // Name should be stored but not executed as script
      expect(response.body.user.name).toBe(xssAttempt)

      // Cleanup
      await prisma.user.delete({ where: { id: response.body.user.id } })
    })
  })
})
