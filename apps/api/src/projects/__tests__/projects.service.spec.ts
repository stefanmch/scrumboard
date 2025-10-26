import { Test, TestingModule } from '@nestjs/testing'
import { ProjectsService } from '../services/projects.service'
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

  const mockTeamId = 'team-123'
  const mockUserId = 'user-123'
  const mockAdminUserId = 'admin-456'
  const mockProjectId = 'project-789'
  const mockNonMemberUserId = 'non-member-999'

  const mockProject = {
    id: mockProjectId,
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.ACTIVE,
    teamId: mockTeamId,
    createdAt: new Date(),
    updatedAt: new Date(),
    team: {
      name: 'Test Team',
    },
    _count: {
      stories: 5,
      sprints: 2,
      tasks: 10,
    },
  }

  const mockMembership = {
    userId: mockUserId,
    teamId: mockTeamId,
    role: 'MEMBER',
    createdAt: new Date(),
  }

  const mockAdminMembership = {
    userId: mockAdminUserId,
    teamId: mockTeamId,
    role: 'ADMIN',
    createdAt: new Date(),
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

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a project when user is a team member', async () => {
      const createDto = {
        name: 'New Project',
        description: 'New Description',
      }

      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMembership)
      mockPrismaService.project.create.mockResolvedValue(mockProject)

      const result = await service.create(mockTeamId, createDto, mockUserId)

      expect(result).toBeDefined()
      expect(result.name).toBe('Test Project')
      expect(mockPrismaService.teamMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_teamId: {
            userId: mockUserId,
            teamId: mockTeamId,
          },
        },
      })
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          description: createDto.description,
          status: ProjectStatus.ACTIVE,
          teamId: mockTeamId,
        },
        include: {
          team: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              stories: true,
              sprints: true,
              tasks: true,
            },
          },
        },
      })
    })

    it('should throw ForbiddenException when user is not a team member', async () => {
      const createDto = {
        name: 'New Project',
        description: 'New Description',
      }

      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(
        service.create(mockTeamId, createDto, mockNonMemberUserId),
      ).rejects.toThrow(ForbiddenException)

      expect(mockPrismaService.project.create).not.toHaveBeenCalled()
    })
  })

  describe('findAllForTeam', () => {
    it('should return all projects for a team when user is a member', async () => {
      const projects = [mockProject, { ...mockProject, id: 'project-2' }]

      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMembership)
      mockPrismaService.project.findMany.mockResolvedValue(projects)

      const result = await service.findAllForTeam(mockTeamId, mockUserId)

      expect(result).toHaveLength(2)
      expect(mockPrismaService.teamMember.findUnique).toHaveBeenCalled()
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { teamId: mockTeamId },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should throw ForbiddenException when user is not a team member', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(
        service.findAllForTeam(mockTeamId, mockNonMemberUserId),
      ).rejects.toThrow(ForbiddenException)

      expect(mockPrismaService.project.findMany).not.toHaveBeenCalled()
    })
  })

  describe('findOne', () => {
    it('should return a project when user is a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMembership)

      const result = await service.findOne(mockProjectId, mockUserId)

      expect(result).toBeDefined()
      expect(result.id).toBe(mockProjectId)
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: mockProjectId },
        include: expect.any(Object),
      })
    })

    it('should throw NotFoundException when project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null)

      await expect(service.findOne(mockProjectId, mockUserId)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw ForbiddenException when user is not a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(
        service.findOne(mockProjectId, mockNonMemberUserId),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('update', () => {
    it('should update a project when user is a team admin', async () => {
      const updateDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      }

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(
        mockAdminMembership,
      )
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        ...updateDto,
      })

      const result = await service.update(
        mockProjectId,
        updateDto,
        mockAdminUserId,
      )

      expect(result.name).toBe('Updated Project')
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: mockProjectId },
        data: updateDto,
        include: expect.any(Object),
      })
    })

    it('should throw ForbiddenException when user is not a team admin', async () => {
      const updateDto = {
        name: 'Updated Project',
      }

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMembership) // Regular member, not admin

      await expect(
        service.update(mockProjectId, updateDto, mockUserId),
      ).rejects.toThrow(ForbiddenException)

      expect(mockPrismaService.project.update).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null)

      await expect(
        service.update(mockProjectId, { name: 'Test' }, mockAdminUserId),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should delete a project when user is a team admin', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(
        mockAdminMembership,
      )
      mockPrismaService.project.delete.mockResolvedValue(mockProject)

      await service.remove(mockProjectId, mockAdminUserId)

      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: mockProjectId },
      })
    })

    it('should throw ForbiddenException when user is not a team admin', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMembership)

      await expect(service.remove(mockProjectId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      )

      expect(mockPrismaService.project.delete).not.toHaveBeenCalled()
    })
  })

  describe('getStats', () => {
    it('should return project statistics when user is a team member', async () => {
      const projectWithStats = {
        ...mockProject,
        stories: [
          { status: 'TODO' },
          { status: 'IN_PROGRESS' },
          { status: 'DONE' },
          { status: 'DONE' },
        ],
        sprints: [{ status: 'ACTIVE' }, { status: 'COMPLETED' }],
        tasks: [{ status: 'TODO' }, { status: 'DONE' }],
      }

      mockPrismaService.project.findUnique.mockResolvedValue(projectWithStats)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMembership)

      const result = await service.getStats(mockProjectId, mockUserId)

      expect(result).toBeDefined()
      expect(result.totalStories).toBe(4)
      expect(result.completedStories).toBe(2)
      expect(result.completionPercentage).toBe(50)
      expect(result.activeSprints).toBe(1)
      expect(result.completedSprints).toBe(1)
    })

    it('should throw ForbiddenException when user is not a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(
        service.getStats(mockProjectId, mockNonMemberUserId),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('Access Control - Multiple Teams', () => {
    it('should allow user to access project through team membership', async () => {
      const team1Id = 'team-1'
      const team2Id = 'team-2'
      const project1 = { ...mockProject, teamId: team1Id }
      const project2 = { ...mockProject, id: 'project-2', teamId: team2Id }

      // User is member of team-1
      mockPrismaService.teamMember.findUnique.mockImplementation((args) => {
        if (args.where.userId_teamId.teamId === team1Id) {
          return Promise.resolve(mockMembership)
        }
        return Promise.resolve(null)
      })

      mockPrismaService.project.findUnique.mockResolvedValue(project1)

      const result = await service.findOne(project1.id, mockUserId)
      expect(result).toBeDefined()

      // Should throw for team-2 project
      mockPrismaService.project.findUnique.mockResolvedValue(project2)
      await expect(service.findOne(project2.id, mockUserId)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('Team Admin Permissions', () => {
    it('should allow only team admins to update projects', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)

      // Regular member should not be able to update
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMembership)
      await expect(
        service.update(mockProjectId, { name: 'Test' }, mockUserId),
      ).rejects.toThrow(ForbiddenException)

      // Admin should be able to update
      mockPrismaService.teamMember.findUnique.mockResolvedValue(
        mockAdminMembership,
      )
      mockPrismaService.project.update.mockResolvedValue(mockProject)
      const result = await service.update(
        mockProjectId,
        { name: 'Test' },
        mockAdminUserId,
      )
      expect(result).toBeDefined()
    })

    it('should allow only team admins to delete projects', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject)

      // Regular member should not be able to delete
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMembership)
      await expect(service.remove(mockProjectId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      )

      // Admin should be able to delete
      mockPrismaService.teamMember.findUnique.mockResolvedValue(
        mockAdminMembership,
      )
      mockPrismaService.project.delete.mockResolvedValue(mockProject)
      await service.remove(mockProjectId, mockAdminUserId)
      expect(mockPrismaService.project.delete).toHaveBeenCalled()
    })
  })
})
