import { Test, TestingModule } from '@nestjs/testing'
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { TeamsService } from './teams.service'
import { PrismaService } from '../../prisma/prisma.service'
import { UserRole } from '@prisma/client'

describe('TeamsService', () => {
  let service: TeamsService
  let prismaService: jest.Mocked<PrismaService>

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: null,
    isActive: true,
  }

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    description: 'Test team description',
    creatorId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockMember = {
    id: 'member-123',
    userId: 'user-123',
    teamId: 'team-123',
    role: UserRole.ADMIN,
    joinedAt: new Date(),
  }

  const mockPrismaService = {
    team: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<TeamsService>(TeamsService)
    prismaService = module.get(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create team and add creator as admin', async () => {
      const createDto = {
        name: 'New Team',
        description: 'New team description',
      }

      mockPrismaService.team.create.mockResolvedValue({
        ...mockTeam,
        ...createDto,
        members: [
          {
            ...mockMember,
            user: mockUser,
          },
        ],
      })

      const result = await service.create(createDto, 'user-123')

      expect(prismaService.team.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          description: createDto.description,
          creatorId: 'user-123',
          members: {
            create: {
              userId: 'user-123',
              role: UserRole.ADMIN,
            },
          },
        },
        include: expect.any(Object),
      })
      expect(result).toBeDefined()
      expect(result.name).toBe(createDto.name)
    })
  })

  describe('findAllForUser', () => {
    it('should return all teams for user', async () => {
      mockPrismaService.team.findMany.mockResolvedValue([
        {
          ...mockTeam,
          members: [{ ...mockMember, user: mockUser }],
          _count: { members: 1, projects: 0 },
        },
      ])

      const result = await service.findAllForUser('user-123')

      expect(prismaService.team.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              userId: 'user-123',
            },
          },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('findOne', () => {
    it('should return team if user is member', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember)
      mockPrismaService.team.findUnique.mockResolvedValue({
        ...mockTeam,
        members: [{ ...mockMember, user: mockUser }],
        _count: { members: 1, projects: 0 },
      })

      const result = await service.findOne('team-123', 'user-123')

      expect(result).toBeDefined()
      expect(result.id).toBe('team-123')
    })

    it('should throw ForbiddenException if user is not member', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(null)

      await expect(service.findOne('team-123', 'user-456')).rejects.toThrow(
        ForbiddenException
      )
    })

    it('should throw NotFoundException if team does not exist', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember)
      mockPrismaService.team.findUnique.mockResolvedValue(null)

      await expect(service.findOne('team-123', 'user-123')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('should update team if user is admin', async () => {
      const updateDto = { name: 'Updated Team' }

      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember)
      mockPrismaService.team.update.mockResolvedValue({
        ...mockTeam,
        ...updateDto,
        members: [{ ...mockMember, user: mockUser }],
      })

      const result = await service.update('team-123', updateDto, 'user-123')

      expect(result.name).toBe('Updated Team')
    })

    it('should throw ForbiddenException if user is not admin', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue({
        ...mockMember,
        role: UserRole.MEMBER,
      })

      await expect(
        service.update('team-123', { name: 'Updated' }, 'user-123')
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('remove', () => {
    it('should delete team if user is admin', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember)
      mockPrismaService.team.delete.mockResolvedValue(mockTeam)

      await service.remove('team-123', 'user-123')

      expect(prismaService.team.delete).toHaveBeenCalledWith({
        where: { id: 'team-123' },
      })
    })

    it('should throw ForbiddenException if user is not admin', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue({
        ...mockMember,
        role: UserRole.MEMBER,
      })

      await expect(service.remove('team-123', 'user-123')).rejects.toThrow(
        ForbiddenException
      )
    })
  })

  describe('addMember', () => {
    it('should add member to team', async () => {
      const addMemberDto = {
        userId: 'user-456',
        role: UserRole.DEVELOPER,
      }

      mockPrismaService.teamMember.findUnique
        .mockResolvedValueOnce(mockMember) // For admin check
        .mockResolvedValueOnce(null) // For duplicate check

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        id: 'user-456',
      })

      mockPrismaService.teamMember.create.mockResolvedValue({
        ...mockMember,
        id: 'member-456',
        userId: 'user-456',
        role: UserRole.DEVELOPER,
      })

      const result = await service.addMember(
        'team-123',
        addMemberDto,
        'user-123'
      )

      expect(result.userId).toBe('user-456')
      expect(result.role).toBe(UserRole.DEVELOPER)
    })

    it('should throw ConflictException if user already a member', async () => {
      mockPrismaService.teamMember.findUnique
        .mockResolvedValueOnce(mockMember) // For admin check
        .mockResolvedValueOnce(mockMember) // For duplicate check

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      await expect(
        service.addMember('team-123', { userId: 'user-123' }, 'user-123')
      ).rejects.toThrow(ConflictException)
    })

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember)
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(
        service.addMember('team-123', { userId: 'nonexistent' }, 'user-123')
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException if user is inactive', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockMember)
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      })

      await expect(
        service.addMember('team-123', { userId: 'user-456' }, 'user-123')
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('removeMember', () => {
    it('should remove member from team', async () => {
      mockPrismaService.teamMember.findUnique
        .mockResolvedValueOnce(mockMember) // For admin check
        .mockResolvedValueOnce({
          ...mockMember,
          userId: 'user-456',
          role: UserRole.MEMBER,
        }) // For member to remove

      mockPrismaService.teamMember.delete.mockResolvedValue({
        ...mockMember,
        userId: 'user-456',
      })

      await service.removeMember('team-123', 'user-456', 'user-123')

      expect(prismaService.teamMember.delete).toHaveBeenCalled()
    })

    it('should throw BadRequestException when removing last admin', async () => {
      mockPrismaService.teamMember.findUnique
        .mockResolvedValueOnce(mockMember) // For admin check
        .mockResolvedValueOnce({
          ...mockMember,
          role: UserRole.ADMIN,
        }) // For member to remove

      mockPrismaService.teamMember.count.mockResolvedValue(1) // Only 1 admin

      await expect(
        service.removeMember('team-123', 'user-123', 'user-123')
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException if member does not exist', async () => {
      mockPrismaService.teamMember.findUnique
        .mockResolvedValueOnce(mockMember) // For admin check
        .mockResolvedValueOnce(null) // For member to remove

      await expect(
        service.removeMember('team-123', 'user-456', 'user-123')
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const updateRoleDto = { role: UserRole.SCRUM_MASTER }

      mockPrismaService.teamMember.findUnique
        .mockResolvedValueOnce(mockMember) // For admin check
        .mockResolvedValueOnce({
          ...mockMember,
          userId: 'user-456',
          role: UserRole.MEMBER,
          user: { ...mockUser, id: 'user-456' },
        }) // For member to update

      mockPrismaService.teamMember.update.mockResolvedValue({
        ...mockMember,
        userId: 'user-456',
        role: UserRole.SCRUM_MASTER,
      })

      const result = await service.updateMemberRole(
        'team-123',
        'user-456',
        updateRoleDto,
        'user-123'
      )

      expect(result.role).toBe(UserRole.SCRUM_MASTER)
    })

    it('should throw BadRequestException when changing last admin role', async () => {
      mockPrismaService.teamMember.findUnique
        .mockResolvedValueOnce(mockMember) // For admin check
        .mockResolvedValueOnce({
          ...mockMember,
          role: UserRole.ADMIN,
          user: mockUser,
        }) // For member to update

      mockPrismaService.teamMember.count.mockResolvedValue(1) // Only 1 admin

      await expect(
        service.updateMemberRole(
          'team-123',
          'user-123',
          { role: UserRole.MEMBER },
          'user-123'
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException if member does not exist', async () => {
      mockPrismaService.teamMember.findUnique
        .mockResolvedValueOnce(mockMember) // For admin check
        .mockResolvedValueOnce(null) // For member to update

      await expect(
        service.updateMemberRole(
          'team-123',
          'user-456',
          { role: UserRole.MEMBER },
          'user-123'
        )
      ).rejects.toThrow(NotFoundException)
    })
  })
})
