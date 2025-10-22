import { Test, TestingModule } from '@nestjs/testing'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './services/projects.service'
import { ProjectStatus } from '@prisma/client'
import { SimpleJwtAuthGuard } from '../auth/guards/simple-jwt-auth.guard'

describe('ProjectsController', () => {
  let controller: ProjectsController
  let service: ProjectsService

  const mockUser = { id: 'user-1', email: 'test@example.com' }
  const mockTeamId = 'team-1'
  const mockProjectId = 'project-1'

  const mockProjectResponse = {
    id: mockProjectId,
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.ACTIVE,
    teamId: mockTeamId,
    teamName: 'Test Team',
    createdAt: new Date(),
    updatedAt: new Date(),
    storyCount: 5,
    sprintCount: 2,
    taskCount: 10,
  }

  const mockProjectStats = {
    projectId: mockProjectId,
    projectName: 'Test Project',
    totalStories: 5,
    completedStories: 2,
    totalSprints: 2,
    activeSprints: 1,
    completedSprints: 1,
    totalTasks: 10,
    completedTasks: 3,
    completionPercentage: 40,
  }

  const mockProjectsService = {
    create: jest.fn(),
    findAllForTeam: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    })
      .overrideGuard(SimpleJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<ProjectsController>(ProjectsController)
    service = module.get<ProjectsService>(ProjectsService)

    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new project', async () => {
      const createDto = { name: 'New Project', description: 'Description' }
      mockProjectsService.create.mockResolvedValue(mockProjectResponse)

      const result = await controller.create(mockTeamId, createDto, mockUser)

      expect(result).toEqual(mockProjectResponse)
      expect(service.create).toHaveBeenCalledWith(mockTeamId, createDto, mockUser.id)
    })
  })

  describe('findAll', () => {
    it('should return an array of projects for a team', async () => {
      mockProjectsService.findAllForTeam.mockResolvedValue([mockProjectResponse])

      const result = await controller.findAll(mockTeamId, mockUser)

      expect(result).toEqual([mockProjectResponse])
      expect(service.findAllForTeam).toHaveBeenCalledWith(mockTeamId, mockUser.id)
    })
  })

  describe('findOne', () => {
    it('should return a single project', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProjectResponse)

      const result = await controller.findOne(mockProjectId, mockUser)

      expect(result).toEqual(mockProjectResponse)
      expect(service.findOne).toHaveBeenCalledWith(mockProjectId, mockUser.id)
    })
  })

  describe('getStats', () => {
    it('should return project statistics', async () => {
      mockProjectsService.getStats.mockResolvedValue(mockProjectStats)

      const result = await controller.getStats(mockProjectId, mockUser)

      expect(result).toEqual(mockProjectStats)
      expect(service.getStats).toHaveBeenCalledWith(mockProjectId, mockUser.id)
    })
  })

  describe('update', () => {
    it('should update a project', async () => {
      const updateDto = { name: 'Updated Name', status: ProjectStatus.COMPLETED }
      const updatedProject = { ...mockProjectResponse, ...updateDto }
      mockProjectsService.update.mockResolvedValue(updatedProject)

      const result = await controller.update(mockProjectId, updateDto, mockUser)

      expect(result).toEqual(updatedProject)
      expect(service.update).toHaveBeenCalledWith(mockProjectId, updateDto, mockUser.id)
    })
  })

  describe('remove', () => {
    it('should delete a project', async () => {
      mockProjectsService.remove.mockResolvedValue(undefined)

      await controller.remove(mockProjectId, mockUser)

      expect(service.remove).toHaveBeenCalledWith(mockProjectId, mockUser.id)
    })
  })
})
