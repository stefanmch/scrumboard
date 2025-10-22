import { Test, TestingModule } from '@nestjs/testing'
import { ProjectsService } from './projects.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { ProjectStatus } from '@prisma/client'

describe('ProjectsService', () => {
  let service: ProjectsService
  let prisma: PrismaService

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
    },
  }

  const mockUser = { id: 'user-1', email: 'test@example.com' }
  const mockTeam = { id: 'team-1', name: 'Test Team' }
  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.ACTIVE,
    teamId: mockTeam.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    team: { name: mockTeam.name },
    _count: { stories: 5, sprints: 2, tasks: 10 },
    stories: [
      { status: 'DONE' },
      { status: 'DONE' },
      { status: 'IN_PROGRESS' },
      { status: 'TODO' },
      { status: 'TODO' },
    ],
    sprints: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }],
    tasks: [
      { status: 'DONE' },
      { status: 'DONE' },
      { status: 'DONE' },
      { status: 'IN_PROGRESS' },
      { status: 'TODO' },
      { status: 'TODO' },
      { status: 'TODO' },
      { status: 'TODO' },
      { status: 'TODO' },
      { status: 'TODO' },
    ],
  }

  const mockTeamMember = {
    userId: mockUser.id,
    teamId: mockTeam.id,
    role: 'MEMBER',
  }

  const mockTeamAdmin = {
    userId: mockUser.id,
    teamId: mockTeam.id,
    role: 'ADMIN',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<ProjectsService>(ProjectsService)
    prisma = module.get<PrismaService>(PrismaService)

    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a project when user is a team member', async () => {
      const createDto = { name: 'New Project', description: 'Description' }
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamMember)
      mockPrismaService.project.create.mockResolvedValue(mockProject)

      const result = await service.create(mockTeam.id, createDto, mockUser.id)

      expect(result).toMatchObject({
        id: mockProject.id,
        name: mockProject.name,
        teamName: mockTeam.name,
      })
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          description: createDto.description,
          status: ProjectStatus.ACTIVE,
          teamId: mockTeam.id,
        },
        include: {
          team: { select: { name: true } },
          _count: { select: { stories: true, sprints: true, tasks: true } },
        },
      })
    })

    it('should throw ForbiddenException if user is not a team member', async () => {
      const createDto = { name: 'New Project' }
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(service.create(mockTeam.id, createDto, mockUser.id)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findAllForTeam', () => {
    it('should return all projects for a team when user is a member', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamMember)
      mockPrismaService.project.findMany.mockResolvedValue([mockProject])

      const result = await service.findAllForTeam(mockTeam.id, mockUser.id)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: mockProject.id,
        name: mockProject.name,
      })
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { teamId: mockTeam.id },
        include: {
          team: { select: { name: true } },
          _count: { select: { stories: true, sprints: true, tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should throw ForbiddenException if user is not a team member', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(service.findAllForTeam(mockTeam.id, mockUser.id)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findOne', () => {
    it('should return a project when user is a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamMember)

      const result = await service.findOne(mockProject.id, mockUser.id)

      expect(result).toMatchObject({
        id: mockProject.id,
        name: mockProject.name,
        teamName: mockTeam.name,
      })
    })

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null)

      await expect(service.findOne('non-existent', mockUser.id)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is not a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(service.findOne(mockProject.id, mockUser.id)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('update', () => {
    it('should update a project when user is a team admin', async () => {
      const updateDto = { name: 'Updated Name', status: ProjectStatus.COMPLETED }
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamAdmin)
      mockPrismaService.project.update.mockResolvedValue({ ...mockProject, ...updateDto })

      const result = await service.update(mockProject.id, updateDto, mockUser.id)

      expect(result.name).toBe('Updated Name')
      expect(result.status).toBe(ProjectStatus.COMPLETED)
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: mockProject.id },
        data: updateDto,
        include: {
          team: { select: { name: true } },
          _count: { select: { stories: true, sprints: true, tasks: true } },
        },
      })
    })

    it('should throw NotFoundException if project does not exist', async () => {
      const updateDto = { name: 'Updated Name' }
      mockPrismaService.project.findUnique.mockResolvedValue(null)

      await expect(service.update('non-existent', updateDto, mockUser.id)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is not a team admin', async () => {
      const updateDto = { name: 'Updated Name' }
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamMember)

      await expect(service.update(mockProject.id, updateDto, mockUser.id)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('remove', () => {
    it('should delete a project when user is a team admin', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamAdmin)
      mockPrismaService.project.delete.mockResolvedValue(mockProject)

      await service.remove(mockProject.id, mockUser.id)

      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: mockProject.id },
      })
    })

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null)

      await expect(service.remove('non-existent', mockUser.id)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is not a team admin', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamMember)

      await expect(service.remove(mockProject.id, mockUser.id)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('getStats', () => {
    it('should return project statistics when user is a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamMember)

      const result = await service.getStats(mockProject.id, mockUser.id)

      expect(result).toMatchObject({
        projectId: mockProject.id,
        projectName: mockProject.name,
        totalStories: 5,
        completedStories: 2,
        totalSprints: 2,
        activeSprints: 1,
        completedSprints: 1,
        totalTasks: 10,
        completedTasks: 3,
        completionPercentage: 40, // 2/5 stories = 40%
      })
    })

    it('should return 0% completion when project has no stories', async () => {
      const projectWithNoStories = { ...mockProject, stories: [] }
      mockPrismaService.project.findUnique.mockResolvedValue(projectWithNoStories)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamMember)

      const result = await service.getStats(mockProject.id, mockUser.id)

      expect(result.completionPercentage).toBe(0)
    })

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null)

      await expect(service.getStats('non-existent', mockUser.id)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is not a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(service.getStats(mockProject.id, mockUser.id)).rejects.toThrow(ForbiddenException)
    })
  })
})
