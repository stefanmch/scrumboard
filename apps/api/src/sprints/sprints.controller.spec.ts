import { Test, TestingModule } from '@nestjs/testing'
import { SprintsController } from './sprints.controller'
import { SprintsService } from './sprints.service'
import { SprintStatus } from '@prisma/client'

describe('SprintsController', () => {
  let controller: SprintsController
  let service: SprintsService

  const mockSprintsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    startSprint: jest.fn(),
    completeSprint: jest.fn(),
    addStories: jest.fn(),
    removeStory: jest.fn(),
    getMetrics: jest.fn(),
    addComment: jest.fn(),
    getComments: jest.fn(),
  }

  const mockSprint = {
    id: 'sprint-1',
    name: 'Sprint 1',
    goal: 'Complete features',
    startDate: new Date('2025-11-01'),
    endDate: new Date('2025-11-15'),
    status: SprintStatus.PLANNING,
    capacity: 40,
    velocity: null,
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockRequest = {
    user: {
      sub: 'user-1',
      id: 'user-1',
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SprintsController],
      providers: [
        {
          provide: SprintsService,
          useValue: mockSprintsService,
        },
      ],
    }).compile()

    controller = module.get<SprintsController>(SprintsController)
    service = module.get<SprintsService>(SprintsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new sprint', async () => {
      const createDto = {
        name: 'Sprint 1',
        goal: 'Complete features',
        startDate: '2025-11-01',
        endDate: '2025-11-15',
        capacity: 40,
        projectId: 'project-1',
      }
      mockSprintsService.create.mockResolvedValue(mockSprint)

      const result = await controller.create(createDto)

      expect(result).toEqual(mockSprint)
      expect(service.create).toHaveBeenCalledWith(createDto)
    })
  })

  describe('findAll', () => {
    it('should return all sprints', async () => {
      const sprints = [mockSprint]
      mockSprintsService.findAll.mockResolvedValue(sprints)

      const result = await controller.findAll()

      expect(result).toEqual(sprints)
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined)
    })

    it('should return sprints filtered by projectId', async () => {
      const sprints = [mockSprint]
      mockSprintsService.findAll.mockResolvedValue(sprints)

      const result = await controller.findAll('project-1')

      expect(result).toEqual(sprints)
      expect(service.findAll).toHaveBeenCalledWith('project-1', undefined)
    })

    it('should return sprints filtered by status', async () => {
      const sprints = [mockSprint]
      mockSprintsService.findAll.mockResolvedValue(sprints)

      const result = await controller.findAll(undefined, SprintStatus.ACTIVE)

      expect(result).toEqual(sprints)
      expect(service.findAll).toHaveBeenCalledWith(undefined, SprintStatus.ACTIVE)
    })

    it('should return sprints filtered by both projectId and status', async () => {
      const sprints = [mockSprint]
      mockSprintsService.findAll.mockResolvedValue(sprints)

      const result = await controller.findAll('project-1', SprintStatus.PLANNING)

      expect(result).toEqual(sprints)
      expect(service.findAll).toHaveBeenCalledWith('project-1', SprintStatus.PLANNING)
    })
  })

  describe('findOne', () => {
    it('should return a sprint by id', async () => {
      mockSprintsService.findOne.mockResolvedValue(mockSprint)

      const result = await controller.findOne('sprint-1')

      expect(result).toEqual(mockSprint)
      expect(service.findOne).toHaveBeenCalledWith('sprint-1')
    })
  })

  describe('update', () => {
    it('should update a sprint', async () => {
      const updateDto = {
        name: 'Updated Sprint',
        goal: 'Updated goal',
      }
      const updatedSprint = { ...mockSprint, ...updateDto }
      mockSprintsService.update.mockResolvedValue(updatedSprint)

      const result = await controller.update('sprint-1', updateDto)

      expect(result).toEqual(updatedSprint)
      expect(service.update).toHaveBeenCalledWith('sprint-1', updateDto)
    })
  })

  describe('remove', () => {
    it('should delete a sprint', async () => {
      mockSprintsService.remove.mockResolvedValue(mockSprint)

      const result = await controller.remove('sprint-1')

      expect(result).toEqual(mockSprint)
      expect(service.remove).toHaveBeenCalledWith('sprint-1')
    })
  })

  describe('startSprint', () => {
    it('should start a sprint', async () => {
      const activeSprint = { ...mockSprint, status: SprintStatus.ACTIVE }
      mockSprintsService.startSprint.mockResolvedValue(activeSprint)

      const result = await controller.startSprint('sprint-1')

      expect(result).toEqual(activeSprint)
      expect(service.startSprint).toHaveBeenCalledWith('sprint-1')
    })
  })

  describe('completeSprint', () => {
    it('should complete a sprint', async () => {
      const completedSprint = {
        ...mockSprint,
        status: SprintStatus.COMPLETED,
        velocity: 25,
      }
      mockSprintsService.completeSprint.mockResolvedValue(completedSprint)

      const result = await controller.completeSprint('sprint-1')

      expect(result).toEqual(completedSprint)
      expect(service.completeSprint).toHaveBeenCalledWith('sprint-1')
    })
  })

  describe('addStories', () => {
    it('should add stories to a sprint', async () => {
      const addStoriesDto = {
        storyIds: ['story-1', 'story-2'],
      }
      const sprintWithStories = {
        ...mockSprint,
        stories: [{ id: 'story-1' }, { id: 'story-2' }],
      }
      mockSprintsService.addStories.mockResolvedValue(sprintWithStories)

      const result = await controller.addStories('sprint-1', addStoriesDto)

      expect(result).toEqual(sprintWithStories)
      expect(service.addStories).toHaveBeenCalledWith(
        'sprint-1',
        addStoriesDto.storyIds
      )
    })
  })

  describe('removeStory', () => {
    it('should remove a story from a sprint', async () => {
      mockSprintsService.removeStory.mockResolvedValue(mockSprint)

      const result = await controller.removeStory('sprint-1', 'story-1')

      expect(result).toEqual(mockSprint)
      expect(service.removeStory).toHaveBeenCalledWith('sprint-1', 'story-1')
    })
  })

  describe('getMetrics', () => {
    it('should return sprint metrics', async () => {
      const metrics = {
        totalStoryPoints: 40,
        completedStoryPoints: 25,
        remainingStoryPoints: 15,
        completionPercentage: 62.5,
        storiesCount: {
          total: 10,
          todo: 2,
          inProgress: 3,
          done: 5,
          blocked: 0,
        },
        velocity: 25,
        burndownData: [],
      }
      mockSprintsService.getMetrics.mockResolvedValue(metrics)

      const result = await controller.getMetrics('sprint-1')

      expect(result).toEqual(metrics)
      expect(service.getMetrics).toHaveBeenCalledWith('sprint-1')
    })
  })

  describe('addComment', () => {
    it('should add a comment to a sprint', async () => {
      const createCommentDto = {
        content: 'Great progress!',
        type: 'GENERAL',
      }
      const mockComment = {
        id: 'comment-1',
        ...createCommentDto,
        sprintId: 'sprint-1',
        authorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockSprintsService.addComment.mockResolvedValue(mockComment)

      const result = await controller.addComment(
        'sprint-1',
        createCommentDto,
        mockRequest
      )

      expect(result).toEqual(mockComment)
      expect(service.addComment).toHaveBeenCalledWith(
        'sprint-1',
        createCommentDto,
        'user-1'
      )
    })

    it('should handle request with user.id instead of user.sub', async () => {
      const createCommentDto = {
        content: 'Great progress!',
        type: 'GENERAL',
      }
      const mockComment = {
        id: 'comment-1',
        ...createCommentDto,
        sprintId: 'sprint-1',
        authorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const requestWithId = {
        user: {
          id: 'user-1',
        },
      }
      mockSprintsService.addComment.mockResolvedValue(mockComment)

      const result = await controller.addComment(
        'sprint-1',
        createCommentDto,
        requestWithId
      )

      expect(result).toEqual(mockComment)
      expect(service.addComment).toHaveBeenCalledWith(
        'sprint-1',
        createCommentDto,
        'user-1'
      )
    })
  })

  describe('getComments', () => {
    it('should return all comments for a sprint', async () => {
      const comments = [
        {
          id: 'comment-1',
          content: 'Comment 1',
          type: 'GENERAL',
          sprintId: 'sprint-1',
          authorId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'comment-2',
          content: 'Comment 2',
          type: 'GENERAL',
          sprintId: 'sprint-1',
          authorId: 'user-2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      mockSprintsService.getComments.mockResolvedValue(comments)

      const result = await controller.getComments('sprint-1')

      expect(result).toEqual(comments)
      expect(service.getComments).toHaveBeenCalledWith('sprint-1')
    })
  })

  describe('Error Handling', () => {
    it('should propagate service errors', async () => {
      const error = new Error('Service error')
      mockSprintsService.findOne.mockRejectedValue(error)

      await expect(controller.findOne('sprint-1')).rejects.toThrow(error)
    })
  })

  describe('Input Validation', () => {
    it('should accept valid create sprint data', async () => {
      const validDto = {
        name: 'Sprint 1',
        startDate: '2025-11-01',
        endDate: '2025-11-15',
        projectId: 'project-1',
      }
      mockSprintsService.create.mockResolvedValue(mockSprint)

      const result = await controller.create(validDto)

      expect(result).toBeDefined()
      expect(service.create).toHaveBeenCalledWith(validDto)
    })

    it('should accept valid update sprint data', async () => {
      const validUpdateDto = {
        name: 'Updated Sprint',
      }
      mockSprintsService.update.mockResolvedValue({
        ...mockSprint,
        ...validUpdateDto,
      })

      const result = await controller.update('sprint-1', validUpdateDto)

      expect(result).toBeDefined()
      expect(service.update).toHaveBeenCalledWith('sprint-1', validUpdateDto)
    })
  })

  describe('Authentication', () => {
    it('should extract userId from request for addComment', async () => {
      const createCommentDto = {
        content: 'Test comment',
        type: 'GENERAL',
      }
      mockSprintsService.addComment.mockResolvedValue({
        id: 'comment-1',
        ...createCommentDto,
        sprintId: 'sprint-1',
        authorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await controller.addComment('sprint-1', createCommentDto, mockRequest)

      expect(service.addComment).toHaveBeenCalledWith(
        'sprint-1',
        createCommentDto,
        'user-1'
      )
    })
  })

  describe('Query Parameters', () => {
    it('should handle optional query parameters', async () => {
      mockSprintsService.findAll.mockResolvedValue([mockSprint])

      await controller.findAll()

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined)
    })

    it('should pass query parameters to service', async () => {
      mockSprintsService.findAll.mockResolvedValue([mockSprint])

      await controller.findAll('project-1', SprintStatus.ACTIVE)

      expect(service.findAll).toHaveBeenCalledWith('project-1', SprintStatus.ACTIVE)
    })
  })

  describe('Route Parameters', () => {
    it('should pass route parameters correctly', async () => {
      mockSprintsService.findOne.mockResolvedValue(mockSprint)

      await controller.findOne('sprint-123')

      expect(service.findOne).toHaveBeenCalledWith('sprint-123')
    })

    it('should handle multiple route parameters', async () => {
      mockSprintsService.removeStory.mockResolvedValue(mockSprint)

      await controller.removeStory('sprint-123', 'story-456')

      expect(service.removeStory).toHaveBeenCalledWith('sprint-123', 'story-456')
    })
  })

  describe('Request Body', () => {
    it('should pass request body to service', async () => {
      const createDto = {
        name: 'Sprint 1',
        startDate: '2025-11-01',
        endDate: '2025-11-15',
        projectId: 'project-1',
      }
      mockSprintsService.create.mockResolvedValue(mockSprint)

      await controller.create(createDto)

      expect(service.create).toHaveBeenCalledWith(createDto)
    })

    it('should handle nested request body properties', async () => {
      const addStoriesDto = {
        storyIds: ['story-1', 'story-2', 'story-3'],
      }
      mockSprintsService.addStories.mockResolvedValue(mockSprint)

      await controller.addStories('sprint-1', addStoriesDto)

      expect(service.addStories).toHaveBeenCalledWith(
        'sprint-1',
        addStoriesDto.storyIds
      )
    })
  })
})
