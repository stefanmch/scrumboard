import { Test, TestingModule } from '@nestjs/testing'
import { SprintsService } from './sprints.service'
import { PrismaService } from '../prisma/prisma.service'
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { SprintStatus, StoryStatus } from '@prisma/client'

describe('SprintsService', () => {
  let service: SprintsService
  let prisma: PrismaService

  const mockPrismaService = {
    sprint: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    story: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    sprintComment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  }

  const mockSprint = {
    id: 'sprint-1',
    name: 'Sprint 1',
    goal: 'Complete user authentication',
    startDate: new Date('2025-11-01'),
    endDate: new Date('2025-11-15'),
    status: SprintStatus.PLANNING,
    capacity: 40,
    velocity: null,
    projectId: 'project-1',
    createdAt: new Date('2025-10-24'),
    updatedAt: new Date('2025-10-24'),
    project: { id: 'project-1', name: 'Test Project' },
    stories: [],
    comments: [],
    retrospectives: [],
  }

  const mockStory = {
    id: 'story-1',
    title: 'Test Story',
    description: 'Test Description',
    storyPoints: 5,
    status: StoryStatus.TODO,
    projectId: 'project-1',
    sprintId: null,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<SprintsService>(SprintsService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    const createSprintDto = {
      name: 'Sprint 1',
      goal: 'Complete user authentication',
      startDate: '2025-11-01',
      endDate: '2025-11-15',
      capacity: 40,
      projectId: 'project-1',
    }

    it('should create a sprint with valid data', async () => {
      mockPrismaService.sprint.findMany.mockResolvedValue([])
      mockPrismaService.sprint.create.mockResolvedValue(mockSprint)

      const result = await service.create(createSprintDto)

      expect(result).toEqual(mockSprint)
      expect(mockPrismaService.sprint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createSprintDto.name,
          goal: createSprintDto.goal,
          capacity: createSprintDto.capacity,
          projectId: createSprintDto.projectId,
          status: SprintStatus.PLANNING,
        }),
        include: expect.any(Object),
      })
    })

    it('should throw BadRequestException when end date is before start date', async () => {
      const invalidDto = {
        ...createSprintDto,
        startDate: '2025-11-15',
        endDate: '2025-11-01',
      }

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException
      )
      await expect(service.create(invalidDto)).rejects.toThrow(
        'End date must be after start date'
      )
    })

    it('should throw ConflictException when sprint dates overlap with existing sprint', async () => {
      const overlappingSprint = {
        ...mockSprint,
        startDate: new Date('2025-10-25'),
        endDate: new Date('2025-11-10'),
      }
      mockPrismaService.sprint.findMany.mockResolvedValue([overlappingSprint])

      await expect(service.create(createSprintDto)).rejects.toThrow(
        ConflictException
      )
      await expect(service.create(createSprintDto)).rejects.toThrow(
        /overlap/i
      )
    })

    it('should create sprint with minimum required fields', async () => {
      const minimalDto = {
        name: 'Sprint 1',
        startDate: '2025-11-01',
        endDate: '2025-11-15',
        projectId: 'project-1',
      }
      mockPrismaService.sprint.findMany.mockResolvedValue([])
      mockPrismaService.sprint.create.mockResolvedValue({
        ...mockSprint,
        goal: null,
        capacity: null,
      })

      const result = await service.create(minimalDto)

      expect(result).toBeDefined()
      expect(mockPrismaService.sprint.create).toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return all sprints', async () => {
      const sprints = [mockSprint]
      mockPrismaService.sprint.findMany.mockResolvedValue(sprints)

      const result = await service.findAll()

      expect(result).toEqual(sprints)
      expect(mockPrismaService.sprint.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      })
    })

    it('should filter sprints by projectId', async () => {
      const sprints = [mockSprint]
      mockPrismaService.sprint.findMany.mockResolvedValue(sprints)

      await service.findAll('project-1')

      expect(mockPrismaService.sprint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'project-1' },
        })
      )
    })

    it('should filter sprints by status', async () => {
      const sprints = [mockSprint]
      mockPrismaService.sprint.findMany.mockResolvedValue(sprints)

      await service.findAll(undefined, SprintStatus.ACTIVE)

      expect(mockPrismaService.sprint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: SprintStatus.ACTIVE },
        })
      )
    })

    it('should filter by both projectId and status', async () => {
      const sprints = [mockSprint]
      mockPrismaService.sprint.findMany.mockResolvedValue(sprints)

      await service.findAll('project-1', SprintStatus.PLANNING)

      expect(mockPrismaService.sprint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'project-1', status: SprintStatus.PLANNING },
        })
      )
    })
  })

  describe('findOne', () => {
    it('should return a sprint by id', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)

      const result = await service.findOne('sprint-1')

      expect(result).toEqual(mockSprint)
      expect(mockPrismaService.sprint.findUnique).toHaveBeenCalledWith({
        where: { id: 'sprint-1' },
        include: expect.any(Object),
      })
    })

    it('should throw NotFoundException when sprint does not exist', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(null)

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException
      )
      await expect(service.findOne('non-existent')).rejects.toThrow(
        /not found/i
      )
    })
  })

  describe('update', () => {
    const updateDto = {
      name: 'Updated Sprint',
      goal: 'Updated goal',
    }

    it('should update a sprint', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.sprint.update.mockResolvedValue({
        ...mockSprint,
        ...updateDto,
      })

      const result = await service.update('sprint-1', updateDto)

      expect(result.name).toBe(updateDto.name)
      expect(result.goal).toBe(updateDto.goal)
      expect(mockPrismaService.sprint.update).toHaveBeenCalledWith({
        where: { id: 'sprint-1' },
        data: expect.objectContaining({
          ...updateDto,
          updatedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      })
    })

    it('should throw NotFoundException when sprint does not exist', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(null)

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(
        NotFoundException
      )
    })

    it('should validate date range when updating dates', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)

      const invalidUpdate = {
        startDate: '2025-11-15',
        endDate: '2025-11-01',
      }

      await expect(
        service.update('sprint-1', invalidUpdate)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('remove', () => {
    it('should delete a sprint and unassign stories', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.story.updateMany.mockResolvedValue({ count: 3 })
      mockPrismaService.sprint.delete.mockResolvedValue(mockSprint)

      const result = await service.remove('sprint-1')

      expect(result).toEqual(mockSprint)
      expect(mockPrismaService.story.updateMany).toHaveBeenCalledWith({
        where: { sprintId: 'sprint-1' },
        data: { sprintId: null },
      })
      expect(mockPrismaService.sprint.delete).toHaveBeenCalledWith({
        where: { id: 'sprint-1' },
        include: expect.any(Object),
      })
    })

    it('should throw NotFoundException when sprint does not exist', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(null)

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('startSprint', () => {
    it('should start a sprint in PLANNING status', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.sprint.findMany.mockResolvedValue([])
      mockPrismaService.sprint.update.mockResolvedValue({
        ...mockSprint,
        status: SprintStatus.ACTIVE,
      })

      const result = await service.startSprint('sprint-1')

      expect(result.status).toBe(SprintStatus.ACTIVE)
      expect(mockPrismaService.sprint.update).toHaveBeenCalledWith({
        where: { id: 'sprint-1' },
        data: {
          status: SprintStatus.ACTIVE,
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      })
    })

    it('should throw BadRequestException when sprint is not in PLANNING status', async () => {
      const activeSprint = { ...mockSprint, status: SprintStatus.ACTIVE }
      mockPrismaService.sprint.findUnique.mockResolvedValue(activeSprint)

      await expect(service.startSprint('sprint-1')).rejects.toThrow(
        BadRequestException
      )
      await expect(service.startSprint('sprint-1')).rejects.toThrow(
        /PLANNING status/i
      )
    })

    it('should throw ConflictException when another sprint is already active', async () => {
      const activeSprint = {
        ...mockSprint,
        id: 'sprint-2',
        status: SprintStatus.ACTIVE,
      }
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.sprint.findMany.mockResolvedValue([activeSprint])

      await expect(service.startSprint('sprint-1')).rejects.toThrow(
        ConflictException
      )
      await expect(service.startSprint('sprint-1')).rejects.toThrow(
        /already active/i
      )
    })
  })

  describe('completeSprint', () => {
    it('should complete an active sprint and calculate velocity', async () => {
      const sprintWithStories = {
        ...mockSprint,
        status: SprintStatus.ACTIVE,
        stories: [
          { ...mockStory, id: 'story-1', status: StoryStatus.DONE, storyPoints: 5 },
          { ...mockStory, id: 'story-2', status: StoryStatus.DONE, storyPoints: 3 },
          { ...mockStory, id: 'story-3', status: StoryStatus.TODO, storyPoints: 2 },
        ],
      }
      mockPrismaService.sprint.findUnique.mockResolvedValue(sprintWithStories)
      mockPrismaService.story.updateMany.mockResolvedValue({ count: 1 })
      mockPrismaService.sprint.update.mockResolvedValue({
        ...sprintWithStories,
        status: SprintStatus.COMPLETED,
        velocity: 8,
      })

      const result = await service.completeSprint('sprint-1')

      expect(result.status).toBe(SprintStatus.COMPLETED)
      expect(result.velocity).toBe(8)
      expect(mockPrismaService.story.updateMany).toHaveBeenCalledWith({
        where: {
          sprintId: 'sprint-1',
          status: { not: StoryStatus.DONE },
        },
        data: { sprintId: null },
      })
    })

    it('should throw BadRequestException when sprint is not ACTIVE', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)

      await expect(service.completeSprint('sprint-1')).rejects.toThrow(
        BadRequestException
      )
      await expect(service.completeSprint('sprint-1')).rejects.toThrow(
        /active sprints/i
      )
    })

    it('should handle sprint with no completed stories', async () => {
      const sprintWithNoCompleted = {
        ...mockSprint,
        status: SprintStatus.ACTIVE,
        stories: [
          { ...mockStory, status: StoryStatus.TODO, storyPoints: 5 },
        ],
      }
      mockPrismaService.sprint.findUnique.mockResolvedValue(sprintWithNoCompleted)
      mockPrismaService.story.updateMany.mockResolvedValue({ count: 1 })
      mockPrismaService.sprint.update.mockResolvedValue({
        ...sprintWithNoCompleted,
        status: SprintStatus.COMPLETED,
        velocity: 0,
      })

      const result = await service.completeSprint('sprint-1')

      expect(result.velocity).toBe(0)
    })
  })

  describe('addStories', () => {
    it('should add stories to a sprint', async () => {
      const storyIds = ['story-1', 'story-2']
      const stories = [
        { ...mockStory, id: 'story-1', projectId: 'project-1' },
        { ...mockStory, id: 'story-2', projectId: 'project-1' },
      ]
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.story.findMany.mockResolvedValue(stories)
      mockPrismaService.story.updateMany.mockResolvedValue({ count: 2 })

      await service.addStories('sprint-1', storyIds)

      expect(mockPrismaService.story.updateMany).toHaveBeenCalledWith({
        where: { id: { in: storyIds } },
        data: { sprintId: 'sprint-1' },
      })
    })

    it('should throw NotFoundException when stories do not exist', async () => {
      const storyIds = ['story-1', 'story-2', 'story-3']
      const stories = [{ ...mockStory, id: 'story-1' }]
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.story.findMany.mockResolvedValue(stories)

      await expect(
        service.addStories('sprint-1', storyIds)
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when stories belong to different project', async () => {
      const storyIds = ['story-1', 'story-2']
      const stories = [
        { ...mockStory, id: 'story-1', projectId: 'project-1' },
        { ...mockStory, id: 'story-2', projectId: 'project-2' },
      ]
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.story.findMany.mockResolvedValue(stories)

      await expect(
        service.addStories('sprint-1', storyIds)
      ).rejects.toThrow(BadRequestException)
      await expect(
        service.addStories('sprint-1', storyIds)
      ).rejects.toThrow(/same project/i)
    })
  })

  describe('removeStory', () => {
    it('should remove a story from a sprint', async () => {
      const storyInSprint = { ...mockStory, sprintId: 'sprint-1' }
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.story.findUnique.mockResolvedValue(storyInSprint)
      mockPrismaService.story.update.mockResolvedValue({
        ...storyInSprint,
        sprintId: null,
      })

      await service.removeStory('sprint-1', 'story-1')

      expect(mockPrismaService.story.update).toHaveBeenCalledWith({
        where: { id: 'story-1' },
        data: { sprintId: null },
      })
    })

    it('should throw NotFoundException when story does not exist', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.story.findUnique.mockResolvedValue(null)

      await expect(
        service.removeStory('sprint-1', 'non-existent')
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when story does not belong to sprint', async () => {
      const storyInDifferentSprint = { ...mockStory, sprintId: 'sprint-2' }
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.story.findUnique.mockResolvedValue(
        storyInDifferentSprint
      )

      await expect(
        service.removeStory('sprint-1', 'story-1')
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('getMetrics', () => {
    it('should calculate sprint metrics correctly', async () => {
      const sprintWithStories = {
        ...mockSprint,
        stories: [
          { ...mockStory, id: 'story-1', status: StoryStatus.DONE, storyPoints: 5 },
          { ...mockStory, id: 'story-2', status: StoryStatus.IN_PROGRESS, storyPoints: 3 },
          { ...mockStory, id: 'story-3', status: StoryStatus.TODO, storyPoints: 2 },
          { ...mockStory, id: 'story-4', status: StoryStatus.BLOCKED, storyPoints: 1 },
        ],
      }
      mockPrismaService.sprint.findUnique.mockResolvedValue(sprintWithStories)

      const result = await service.getMetrics('sprint-1')

      expect(result.totalStoryPoints).toBe(11)
      expect(result.completedStoryPoints).toBe(5)
      expect(result.remainingStoryPoints).toBe(6)
      expect(result.completionPercentage).toBeCloseTo(45.45, 1)
      expect(result.storiesCount).toEqual({
        total: 4,
        todo: 1,
        inProgress: 1,
        done: 1,
        blocked: 1,
      })
      expect(result.burndownData).toBeDefined()
      expect(result.burndownData.length).toBeGreaterThan(0)
    })

    it('should handle sprint with no stories', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue({
        ...mockSprint,
        stories: [],
      })

      const result = await service.getMetrics('sprint-1')

      expect(result.totalStoryPoints).toBe(0)
      expect(result.completedStoryPoints).toBe(0)
      expect(result.completionPercentage).toBe(0)
    })

    it('should generate burndown data for sprint duration', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue({
        ...mockSprint,
        stories: [{ ...mockStory, storyPoints: 10 }],
      })

      const result = await service.getMetrics('sprint-1')

      expect(result.burndownData).toBeDefined()
      expect(result.burndownData.length).toBeGreaterThan(0)
      expect(result.burndownData[0]).toHaveProperty('date')
      expect(result.burndownData[0]).toHaveProperty('idealRemaining')
      expect(result.burndownData[0]).toHaveProperty('remainingPoints')
    })
  })

  describe('addComment', () => {
    const createCommentDto = {
      content: 'Test comment',
      type: 'GENERAL',
    }

    it('should add a comment to a sprint', async () => {
      const mockComment = {
        id: 'comment-1',
        content: createCommentDto.content,
        type: createCommentDto.type,
        sprintId: 'sprint-1',
        authorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
        sprint: mockSprint,
      }
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.sprintComment.create.mockResolvedValue(mockComment)

      const result = await service.addComment(
        'sprint-1',
        createCommentDto,
        'user-1'
      )

      expect(result).toEqual(mockComment)
      expect(mockPrismaService.sprintComment.create).toHaveBeenCalledWith({
        data: {
          content: createCommentDto.content,
          type: createCommentDto.type,
          sprintId: 'sprint-1',
          authorId: 'user-1',
        },
        include: {
          author: true,
          sprint: true,
        },
      })
    })

    it('should throw NotFoundException when sprint does not exist', async () => {
      mockPrismaService.sprint.findUnique.mockResolvedValue(null)

      await expect(
        service.addComment('non-existent', createCommentDto, 'user-1')
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getComments', () => {
    it('should return all comments for a sprint', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Comment 1',
          type: 'GENERAL',
          sprintId: 'sprint-1',
          authorId: 'user-1',
          createdAt: new Date(),
          author: { id: 'user-1', name: 'John Doe' },
        },
        {
          id: 'comment-2',
          content: 'Comment 2',
          type: 'GENERAL',
          sprintId: 'sprint-1',
          authorId: 'user-2',
          createdAt: new Date(),
          author: { id: 'user-2', name: 'Jane Doe' },
        },
      ]
      mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint)
      mockPrismaService.sprintComment.findMany.mockResolvedValue(mockComments)

      const result = await service.getComments('sprint-1')

      expect(result).toEqual(mockComments)
      expect(mockPrismaService.sprintComment.findMany).toHaveBeenCalledWith({
        where: { sprintId: 'sprint-1' },
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      })
    })
  })
})
