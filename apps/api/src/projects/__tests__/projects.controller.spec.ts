import { Test, TestingModule } from '@nestjs/testing'
import { ProjectsController } from '../projects.controller'
import { ProjectsService } from '../services/projects.service'
import { CreateProjectDto } from '../dto/create-project.dto'
import { UpdateProjectDto } from '../dto/update-project.dto'
import { ProjectStatus } from '@prisma/client'
import { ForbiddenException, NotFoundException } from '@nestjs/common'

describe('ProjectsController', () => {
  let controller: ProjectsController
  let service: ProjectsService

  const mockProjectsService = {
    create: jest.fn(),
    findAllForTeam: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
  }

  const mockUser = {
    sub: 'user-123',
    email: 'test@example.com',
  }

  const mockTeamId = 'team-123'
  const mockProjectId = 'project-789'

  const mockProjectResponse = {
    id: mockProjectId,
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.ACTIVE,
    teamId: mockTeamId,
    teamName: 'Test Team',
    storyCount: 5,
    sprintCount: 2,
    taskCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockStatsResponse = {
    projectId: mockProjectId,
    projectName: 'Test Project',
    totalStories: 10,
    completedStories: 5,
    totalSprints: 3,
    activeSprints: 1,
    completedSprints: 2,
    totalTasks: 20,
    completedTasks: 12,
    completionPercentage: 50,
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
    }).compile()

    controller = module.get<ProjectsController>(ProjectsController)
    service = module.get<ProjectsService>(ProjectsService)

    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new project', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
      }

      mockProjectsService.create.mockResolvedValue(mockProjectResponse)

      const result = await controller.create(mockTeamId, createDto, mockUser)

      expect(result).toEqual(mockProjectResponse)
      expect(mockProjectsService.create).toHaveBeenCalledWith(
        mockTeamId,
        createDto,
        mockUser.sub,
      )
    })

    it('should throw ForbiddenException when user is not a team member', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
      }

      mockProjectsService.create.mockRejectedValue(
        new ForbiddenException('You are not a member of this team'),
      )

      await expect(
        controller.create(mockTeamId, createDto, mockUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findAll', () => {
    it('should return all projects for a team', async () => {
      const projects = [
        mockProjectResponse,
        { ...mockProjectResponse, id: 'project-2' },
      ]

      mockProjectsService.findAllForTeam.mockResolvedValue(projects)

      const result = await controller.findAll(mockTeamId, mockUser)

      expect(result).toEqual(projects)
      expect(result).toHaveLength(2)
      expect(mockProjectsService.findAllForTeam).toHaveBeenCalledWith(
        mockTeamId,
        mockUser.sub,
      )
    })

    it('should return empty array when team has no projects', async () => {
      mockProjectsService.findAllForTeam.mockResolvedValue([])

      const result = await controller.findAll(mockTeamId, mockUser)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should throw ForbiddenException when user is not a team member', async () => {
      mockProjectsService.findAllForTeam.mockRejectedValue(
        new ForbiddenException('You are not a member of this team'),
      )

      await expect(controller.findAll(mockTeamId, mockUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('findOne', () => {
    it('should return a specific project', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProjectResponse)

      const result = await controller.findOne(mockProjectId, mockUser)

      expect(result).toEqual(mockProjectResponse)
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
      )
    })

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectsService.findOne.mockRejectedValue(
        new NotFoundException(`Project with ID ${mockProjectId} not found`),
      )

      await expect(controller.findOne(mockProjectId, mockUser)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw ForbiddenException when user is not a team member', async () => {
      mockProjectsService.findOne.mockRejectedValue(
        new ForbiddenException('You are not a member of this team'),
      )

      await expect(controller.findOne(mockProjectId, mockUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('getStats', () => {
    it('should return project statistics', async () => {
      mockProjectsService.getStats.mockResolvedValue(mockStatsResponse)

      const result = await controller.getStats(mockProjectId, mockUser)

      expect(result).toEqual(mockStatsResponse)
      expect(result.totalStories).toBe(10)
      expect(result.completionPercentage).toBe(50)
      expect(mockProjectsService.getStats).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
      )
    })

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectsService.getStats.mockRejectedValue(
        new NotFoundException(`Project with ID ${mockProjectId} not found`),
      )

      await expect(
        controller.getStats(mockProjectId, mockUser),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('should update a project when user is admin', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      }

      const updatedProject = {
        ...mockProjectResponse,
        ...updateDto,
      }

      mockProjectsService.update.mockResolvedValue(updatedProject)

      const result = await controller.update(
        mockProjectId,
        updateDto,
        mockUser,
      )

      expect(result).toEqual(updatedProject)
      expect(result.name).toBe('Updated Project')
      expect(mockProjectsService.update).toHaveBeenCalledWith(
        mockProjectId,
        updateDto,
        mockUser.sub,
      )
    })

    it('should throw ForbiddenException when user is not admin', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
      }

      mockProjectsService.update.mockRejectedValue(
        new ForbiddenException('Only team admins can perform this action'),
      )

      await expect(
        controller.update(mockProjectId, updateDto, mockUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFoundException when project does not exist', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
      }

      mockProjectsService.update.mockRejectedValue(
        new NotFoundException(`Project with ID ${mockProjectId} not found`),
      )

      await expect(
        controller.update(mockProjectId, updateDto, mockUser),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should delete a project when user is admin', async () => {
      mockProjectsService.remove.mockResolvedValue(undefined)

      await controller.remove(mockProjectId, mockUser)

      expect(mockProjectsService.remove).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
      )
    })

    it('should throw ForbiddenException when user is not admin', async () => {
      mockProjectsService.remove.mockRejectedValue(
        new ForbiddenException('Only team admins can perform this action'),
      )

      await expect(controller.remove(mockProjectId, mockUser)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectsService.remove.mockRejectedValue(
        new NotFoundException(`Project with ID ${mockProjectId} not found`),
      )

      await expect(controller.remove(mockProjectId, mockUser)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('Project-scoped Operations', () => {
    it('should handle multiple projects in the same team', async () => {
      const projects = [
        mockProjectResponse,
        { ...mockProjectResponse, id: 'project-2', name: 'Project 2' },
        { ...mockProjectResponse, id: 'project-3', name: 'Project 3' },
      ]

      mockProjectsService.findAllForTeam.mockResolvedValue(projects)

      const result = await controller.findAll(mockTeamId, mockUser)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('Test Project')
      expect(result[1].name).toBe('Project 2')
      expect(result[2].name).toBe('Project 3')
    })

    it('should ensure project-scoped access control', async () => {
      // User should only access projects from teams they belong to
      mockProjectsService.findOne.mockRejectedValue(
        new ForbiddenException('You are not a member of this team'),
      )

      await expect(controller.findOne(mockProjectId, mockUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })
})
