import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { UserRole } from '@prisma/client'
import * as path from 'path'

describe('Users API (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let testUser: {
    id: string
    email: string
    password: string
    accessToken: string
  }
  let adminUser: {
    id: string
    email: string
    password: string
    accessToken: string
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

    // Create test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'TestUser123!',
        name: 'Test User',
      })

    testUser = {
      id: registerResponse.body.user.id,
      email: 'testuser@example.com',
      password: 'TestUser123!',
      accessToken: '',
    }

    // Verify user email
    await prisma.user.update({
      where: { id: testUser.id },
      data: { emailVerified: true },
    })

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })

    testUser.accessToken = loginResponse.body.accessToken

    // Create admin user
    const adminRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'AdminUser123!',
        name: 'Admin User',
        role: UserRole.ADMIN,
      })

    adminUser = {
      id: adminRegisterResponse.body.user.id,
      email: 'admin@example.com',
      password: 'AdminUser123!',
      accessToken: '',
    }

    // Set admin role and verify
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: true, role: UserRole.ADMIN },
    })

    // Login admin
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password,
      })

    adminUser.accessToken = adminLoginResponse.body.accessToken
  })

  afterAll(async () => {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'testuser@example.com',
            'admin@example.com',
            'otheruser@example.com',
          ],
        },
      },
    })

    await app.close()
  })

  describe('GET /users/:id', () => {
    it('should successfully get own user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', testUser.id)
      expect(response.body).toHaveProperty('email', testUser.email)
      expect(response.body).toHaveProperty('name', 'Test User')
      expect(response.body).not.toHaveProperty('password')
    })

    it('should reject unauthorized access', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .expect(401)
    })

    it('should reject access to another user profile', async () => {
      // Create another user
      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'otheruser@example.com',
          password: 'OtherUser123!',
          name: 'Other User',
        })

      const otherUserId = otherUserResponse.body.user.id

      await request(app.getHttpServer())
        .get(`/users/${otherUserId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(403)
    })

    it('should allow admin to access any user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', testUser.id)
    })

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(404)
    })
  })

  describe('PATCH /users/:id', () => {
    it('should successfully update own profile', async () => {
      const updateData = {
        name: 'Updated Name',
        timeZone: 'Europe/London',
        workingHours: { start: '08:00', end: '16:00' },
      }

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('name', 'Updated Name')
      expect(response.body).toHaveProperty('timeZone', 'Europe/London')
      expect(response.body.workingHours).toEqual({
        start: '08:00',
        end: '16:00',
      })
    })

    it('should reject updating another user profile', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403)
    })

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ email: 'invalid-email' })
        .expect(400)
    })

    it('should reject invalid fields', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ invalidField: 'value' })
        .expect(400)
    })

    it('should not allow updating immutable fields', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ role: UserRole.ADMIN, emailVerified: true })
        .expect(400)
    })

    it('should handle partial updates', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Partially Updated' })
        .expect(200)

      expect(response.body).toHaveProperty('name', 'Partially Updated')
      expect(response.body).toHaveProperty('email', testUser.email)
    })
  })

  describe('POST /users/:id/avatar', () => {
    it('should successfully upload avatar', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/${testUser.id}/avatar`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .attach('avatar', Buffer.from('fake-image-data'), {
          filename: 'test-avatar.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200)

      expect(response.body).toHaveProperty('avatar')
      expect(response.body.avatar).toBeTruthy()
    })

    it('should reject invalid file types', async () => {
      await request(app.getHttpServer())
        .post(`/users/${testUser.id}/avatar`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .attach('avatar', Buffer.from('fake-exe-data'), {
          filename: 'malware.exe',
          contentType: 'application/exe',
        })
        .expect(400)
    })

    it('should reject oversized files', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024) // 10MB

      await request(app.getHttpServer())
        .post(`/users/${testUser.id}/avatar`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .attach('avatar', largeBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400)
    })

    it('should reject upload for another user', async () => {
      await request(app.getHttpServer())
        .post(`/users/${adminUser.id}/avatar`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .attach('avatar', Buffer.from('fake-image-data'), {
          filename: 'test-avatar.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403)
    })

    it('should reject upload without file', async () => {
      await request(app.getHttpServer())
        .post(`/users/${testUser.id}/avatar`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(400)
    })
  })

  describe('PATCH /users/:id/password', () => {
    it('should successfully change password', async () => {
      const newPassword = 'NewPassword123!'

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUser.id}/password`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword,
        })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('successfully')

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

    it('should reject incorrect current password', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}/password`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        })
        .expect(401)
    })

    it('should reject weak new password', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}/password`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'weak',
        })
        .expect(400)
    })

    it('should reject changing another user password', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${adminUser.id}/password`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          currentPassword: 'anything',
          newPassword: 'NewPassword123!',
        })
        .expect(403)
    })

    it('should require both current and new password', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}/password`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ newPassword: 'NewPassword123!' })
        .expect(400)
    })
  })

  describe('GET /users/:id/activity', () => {
    it('should successfully get activity log', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}/activity`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)

      // Verify activity structure
      const activity = response.body[0]
      expect(activity).toHaveProperty('id')
      expect(activity).toHaveProperty('ipAddress')
      expect(activity).toHaveProperty('userAgent')
      expect(activity).toHaveProperty('successful')
      expect(activity).toHaveProperty('createdAt')
    })

    it('should reject accessing another user activity', async () => {
      await request(app.getHttpServer())
        .get(`/users/${adminUser.id}/activity`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(403)
    })

    it('should allow admin to access any user activity', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}/activity`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should support limit query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}/activity?limit=5`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200)

      expect(response.body.length).toBeLessThanOrEqual(5)
    })

    it('should order activity by date descending', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}/activity`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200)

      if (response.body.length > 1) {
        const first = new Date(response.body[0].createdAt)
        const second = new Date(response.body[1].createdAt)
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime())
      }
    })
  })

  describe('Security Tests', () => {
    it('should prevent SQL injection in user ID', async () => {
      const sqlInjection = "'; DROP TABLE users; --"

      await request(app.getHttpServer())
        .get(`/users/${sqlInjection}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(404) // Should return 404, not SQL error
    })

    it('should sanitize XSS attempts in profile update', async () => {
      const xssPayload = '<script>alert("XSS")</script>'

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: xssPayload })
        .expect(200)

      // Name should be stored but escaped when rendered
      expect(response.body.name).toBe(xssPayload)
    })

    it('should not expose sensitive data in responses', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200)

      expect(response.body).not.toHaveProperty('password')
      expect(response.body).not.toHaveProperty('lockedUntil')
    })

    it('should enforce rate limiting on profile updates', async () => {
      // Make multiple rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .patch(`/users/${testUser.id}`)
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ name: 'Rate Limit Test' })
        )

      const results = await Promise.all(requests.map((r) => r.catch((e) => e)))

      // Should have some requests succeed and some fail with 429
      const rateLimited = results.some(
        (r) => r.status === 429 || r.statusCode === 429
      )
      expect(rateLimited).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400)
    })

    it('should handle empty update payload', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({})
        .expect(200)

      // Should succeed but not change anything
      expect(response.body).toHaveProperty('id', testUser.id)
    })

    it('should handle concurrent updates', async () => {
      const updates = Array(5)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .patch(`/users/${testUser.id}`)
            .set('Authorization', `Bearer ${testUser.accessToken}`)
            .send({ name: `Concurrent Update ${i}` })
        )

      const results = await Promise.all(updates)

      // All should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200)
      })
    })
  })
})
