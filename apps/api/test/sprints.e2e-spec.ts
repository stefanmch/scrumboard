import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { SprintStatus, StoryStatus } from '@prisma/client'

describe('Sprints API (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let authToken: string
  let userId: string
  let projectId: string
  let sprintId: string
  let storyId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    )

    await app.init()

    prisma = app.get<PrismaService>(PrismaService)

    // Clean up test data
    await prisma.sprintComment.deleteMany()
    await prisma.sprint.deleteMany()
    await prisma.story.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.sprintComment.deleteMany()
    await prisma.sprint.deleteMany()
    await prisma.story.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()

    await prisma.$disconnect()
    await app.close()
  })

  describe('Authentication and Setup', () => {
    it('should register a test user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'sprint-test@example.com',
          password: 'Password123!',
          name: 'Sprint Test User',
        })
        .expect(201)

      expect(response.body).toHaveProperty('accessToken')
      authToken = response.body.accessToken
    })

    it('should login the test user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'sprint-test@example.com',
          password: 'Password123!',
        })
        .expect(200)

      expect(response.body).toHaveProperty('accessToken')
      authToken = response.body.accessToken
      userId = response.body.user.id
    })

    it('should create a test project', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sprint Test Project',
          description: 'Project for sprint e2e tests',
          teamId: null,
        })
        .expect(201)

      expect(response.body).toHaveProperty('id')
      projectId = response.body.id
    })

    it('should create test stories', async () => {
      const response = await request(app.getHttpServer())
        .post('/stories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Story for Sprint',
          description: 'A story to be added to sprint',
          storyPoints: 5,
          status: 'TODO',
          projectId: projectId,
        })
        .expect(201)

      expect(response.body).toHaveProperty('id')
      storyId = response.body.id
    })
  })

  describe('POST /sprints - Create Sprint', () => {
    it('should create a new sprint with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sprint 1',
          goal: 'Complete user authentication features',
          startDate: '2025-11-01',
          endDate: '2025-11-15',
          capacity: 40,
          projectId: projectId,
        })
        .expect(201)

      expect(response.body).toMatchObject({
        name: 'Sprint 1',
        goal: 'Complete user authentication features',
        capacity: 40,
        projectId: projectId,
        status: SprintStatus.PLANNING,
      })
      expect(response.body).toHaveProperty('id')
      sprintId = response.body.id
    })

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/sprints')
        .send({
          name: 'Unauthorized Sprint',
          startDate: '2025-11-01',
          endDate: '2025-11-15',
          projectId: projectId,
        })
        .expect(401)
    })

    it('should fail with invalid date range', async () => {
      await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Sprint',
          startDate: '2025-11-15',
          endDate: '2025-11-01',
          projectId: projectId,
        })
        .expect(400)
    })

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Incomplete Sprint',
        })
        .expect(400)
    })

    it('should fail with overlapping sprint dates', async () => {
      await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Overlapping Sprint',
          startDate: '2025-11-05',
          endDate: '2025-11-20',
          projectId: projectId,
        })
        .expect(409)
    })
  })

  describe('GET /sprints - List Sprints', () => {
    it('should return all sprints', async () => {
      const response = await request(app.getHttpServer())
        .get('/sprints')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
    })

    it('should filter sprints by projectId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sprints?projectId=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((sprint) => {
        expect(sprint.projectId).toBe(projectId)
      })
    })

    it('should filter sprints by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sprints?status=${SprintStatus.PLANNING}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((sprint) => {
        expect(sprint.status).toBe(SprintStatus.PLANNING)
      })
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/sprints')
        .expect(401)
    })
  })

  describe('GET /sprints/:id - Get Sprint by ID', () => {
    it('should return a sprint by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sprints/${sprintId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: sprintId,
        name: 'Sprint 1',
        status: SprintStatus.PLANNING,
      })
      expect(response.body).toHaveProperty('stories')
      expect(response.body).toHaveProperty('comments')
    })

    it('should return 404 for non-existent sprint', async () => {
      await request(app.getHttpServer())
        .get('/sprints/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('PATCH /sprints/:id - Update Sprint', () => {
    it('should update sprint details', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/sprints/${sprintId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sprint 1 - Updated',
          goal: 'Updated goal',
          capacity: 50,
        })
        .expect(200)

      expect(response.body).toMatchObject({
        id: sprintId,
        name: 'Sprint 1 - Updated',
        goal: 'Updated goal',
        capacity: 50,
      })
    })

    it('should fail with invalid date range', async () => {
      await request(app.getHttpServer())
        .patch(`/sprints/${sprintId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startDate: '2025-11-20',
          endDate: '2025-11-10',
        })
        .expect(400)
    })
  })

  describe('POST /sprints/:id/stories - Add Stories to Sprint', () => {
    it('should add stories to sprint', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sprints/${sprintId}/stories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storyIds: [storyId],
        })
        .expect(201)

      expect(response.body.stories).toHaveLength(1)
      expect(response.body.stories[0].id).toBe(storyId)
    })

    it('should fail with non-existent story IDs', async () => {
      await request(app.getHttpServer())
        .post(`/sprints/${sprintId}/stories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storyIds: ['non-existent-story'],
        })
        .expect(404)
    })
  })

  describe('POST /sprints/:id/start - Start Sprint', () => {
    it('should start a sprint', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sprints/${sprintId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)

      expect(response.body.status).toBe(SprintStatus.ACTIVE)
    })

    it('should fail to start already active sprint', async () => {
      await request(app.getHttpServer())
        .post(`/sprints/${sprintId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })
  })

  describe('GET /sprints/:id/metrics - Get Sprint Metrics', () => {
    it('should return sprint metrics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sprints/${sprintId}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('totalStoryPoints')
      expect(response.body).toHaveProperty('completedStoryPoints')
      expect(response.body).toHaveProperty('remainingStoryPoints')
      expect(response.body).toHaveProperty('completionPercentage')
      expect(response.body).toHaveProperty('storiesCount')
      expect(response.body).toHaveProperty('burndownData')
      expect(Array.isArray(response.body.burndownData)).toBe(true)
    })
  })

  describe('POST /sprints/:id/comments - Add Comment', () => {
    let commentId: string

    it('should add a comment to sprint', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sprints/${sprintId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Great progress on this sprint!',
          type: 'GENERAL',
        })
        .expect(201)

      expect(response.body).toMatchObject({
        content: 'Great progress on this sprint!',
        type: 'GENERAL',
        sprintId: sprintId,
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('author')
      commentId = response.body.id
    })

    it('should fail without content', async () => {
      await request(app.getHttpServer())
        .post(`/sprints/${sprintId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'GENERAL',
        })
        .expect(400)
    })
  })

  describe('GET /sprints/:id/comments - Get Comments', () => {
    it('should return all comments for a sprint', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sprints/${sprintId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0]).toHaveProperty('author')
    })
  })

  describe('POST /sprints/:id/complete - Complete Sprint', () => {
    it('should complete an active sprint', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sprints/${sprintId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)

      expect(response.body.status).toBe(SprintStatus.COMPLETED)
      expect(response.body).toHaveProperty('velocity')
    })

    it('should fail to complete already completed sprint', async () => {
      await request(app.getHttpServer())
        .post(`/sprints/${sprintId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })
  })

  describe('DELETE /sprints/:id/stories/:storyId - Remove Story', () => {
    it('should remove a story from sprint', async () => {
      // Create a new sprint for this test
      const sprintResponse = await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sprint for Story Removal',
          startDate: '2025-12-01',
          endDate: '2025-12-15',
          projectId: projectId,
        })
        .expect(201)

      const newSprintId = sprintResponse.body.id

      // Create a new story
      const storyResponse = await request(app.getHttpServer())
        .post('/stories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Story to Remove',
          projectId: projectId,
          status: 'TODO',
        })
        .expect(201)

      const newStoryId = storyResponse.body.id

      // Add story to sprint
      await request(app.getHttpServer())
        .post(`/sprints/${newSprintId}/stories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storyIds: [newStoryId],
        })
        .expect(201)

      // Remove story from sprint
      const response = await request(app.getHttpServer())
        .delete(`/sprints/${newSprintId}/stories/${newStoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.stories).toHaveLength(0)
    })
  })

  describe('DELETE /sprints/:id - Delete Sprint', () => {
    it('should delete a sprint', async () => {
      // Create a sprint to delete
      const createResponse = await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sprint to Delete',
          startDate: '2026-01-01',
          endDate: '2026-01-15',
          projectId: projectId,
        })
        .expect(201)

      const deleteSprintId = createResponse.body.id

      await request(app.getHttpServer())
        .delete(`/sprints/${deleteSprintId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Verify sprint is deleted
      await request(app.getHttpServer())
        .get(`/sprints/${deleteSprintId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('Sprint Lifecycle Workflow', () => {
    it('should complete full sprint lifecycle', async () => {
      // 1. Create sprint
      const createResponse = await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Full Lifecycle Sprint',
          goal: 'Test complete workflow',
          startDate: '2025-12-01',
          endDate: '2025-12-15',
          capacity: 30,
          projectId: projectId,
        })
        .expect(201)

      const lifecycleSprintId = createResponse.body.id
      expect(createResponse.body.status).toBe(SprintStatus.PLANNING)

      // 2. Create and add stories
      const story1 = await request(app.getHttpServer())
        .post('/stories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Lifecycle Story 1',
          storyPoints: 5,
          projectId: projectId,
          status: 'TODO',
        })
        .expect(201)

      await request(app.getHttpServer())
        .post(`/sprints/${lifecycleSprintId}/stories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storyIds: [story1.body.id],
        })
        .expect(201)

      // 3. Start sprint
      const startResponse = await request(app.getHttpServer())
        .post(`/sprints/${lifecycleSprintId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)

      expect(startResponse.body.status).toBe(SprintStatus.ACTIVE)

      // 4. Update story status to DONE
      await request(app.getHttpServer())
        .patch(`/stories/${story1.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'DONE',
        })
        .expect(200)

      // 5. Get metrics
      const metricsResponse = await request(app.getHttpServer())
        .get(`/sprints/${lifecycleSprintId}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(metricsResponse.body.completedStoryPoints).toBe(5)

      // 6. Add comment
      await request(app.getHttpServer())
        .post(`/sprints/${lifecycleSprintId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Sprint going well!',
          type: 'GENERAL',
        })
        .expect(201)

      // 7. Complete sprint
      const completeResponse = await request(app.getHttpServer())
        .post(`/sprints/${lifecycleSprintId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)

      expect(completeResponse.body.status).toBe(SprintStatus.COMPLETED)
      expect(completeResponse.body.velocity).toBe(5)
    })
  })
})
