import { Test, TestingModule } from '@nestjs/testing'
import { TeamsController } from './teams.controller'
import { TeamsService } from './services/teams.service'
import { SimpleJwtAuthGuard } from '../auth/guards/simple-jwt-auth.guard'
import { UserRole } from '@prisma/client'
import { TeamResponseDto, TeamMemberResponseDto } from './dto'

describe('TeamsController', () => {
  let controller: TeamsController
  let service: jest.Mocked<TeamsService>

  const mockJwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    roles: [UserRole.MEMBER],
  }

  const mockTeamResponse = new TeamResponseDto({
    id: 'team-123',
    name: 'Test Team',
    description: 'Test Description',
    creatorId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    memberCount: 1,
  })

  const mockMemberResponse = new TeamMemberResponseDto({
    id: 'member-123',
    userId: 'user-123',
    userName: 'Test User',
    userEmail: 'test@example.com',
    teamId: 'team-123',
    role: UserRole.ADMIN,
    joinedAt: new Date(),
  })

  const mockTeamsService = {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: mockTeamsService,
        },
      ],
    })
      .overrideGuard(SimpleJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<TeamsController>(TeamsController)
    service = module.get(TeamsService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('create', () => {
    it('should create a team', async () => {
      const createDto = {
        name: 'New Team',
        description: 'New Description',
      }

      mockTeamsService.create.mockResolvedValue(mockTeamResponse)

      const result = await controller.create(createDto, mockJwtPayload)

      expect(service.create).toHaveBeenCalledWith(createDto, 'user-123')
      expect(result).toEqual(mockTeamResponse)
    })
  })

  describe('findAll', () => {
    it('should return all teams for user', async () => {
      mockTeamsService.findAllForUser.mockResolvedValue([mockTeamResponse])

      const result = await controller.findAll(mockJwtPayload)

      expect(service.findAllForUser).toHaveBeenCalledWith('user-123')
      expect(result).toHaveLength(1)
    })
  })

  describe('findOne', () => {
    it('should return a team', async () => {
      mockTeamsService.findOne.mockResolvedValue(mockTeamResponse)

      const result = await controller.findOne('team-123', mockJwtPayload)

      expect(service.findOne).toHaveBeenCalledWith('team-123', 'user-123')
      expect(result).toEqual(mockTeamResponse)
    })
  })

  describe('update', () => {
    it('should update a team', async () => {
      const updateDto = { name: 'Updated Team' }

      mockTeamsService.update.mockResolvedValue(mockTeamResponse)

      const result = await controller.update(
        'team-123',
        updateDto,
        mockJwtPayload
      )

      expect(service.update).toHaveBeenCalledWith(
        'team-123',
        updateDto,
        'user-123'
      )
      expect(result).toEqual(mockTeamResponse)
    })
  })

  describe('remove', () => {
    it('should delete a team', async () => {
      mockTeamsService.remove.mockResolvedValue(undefined)

      await controller.remove('team-123', mockJwtPayload)

      expect(service.remove).toHaveBeenCalledWith('team-123', 'user-123')
    })
  })

  describe('addMember', () => {
    it('should add a member to team', async () => {
      const addMemberDto = {
        userId: 'user-456',
        role: UserRole.DEVELOPER,
      }

      mockTeamsService.addMember.mockResolvedValue(mockMemberResponse)

      const result = await controller.addMember(
        'team-123',
        addMemberDto,
        mockJwtPayload
      )

      expect(service.addMember).toHaveBeenCalledWith(
        'team-123',
        addMemberDto,
        'user-123'
      )
      expect(result).toEqual(mockMemberResponse)
    })
  })

  describe('removeMember', () => {
    it('should remove a member from team', async () => {
      mockTeamsService.removeMember.mockResolvedValue(undefined)

      await controller.removeMember('team-123', 'user-456', mockJwtPayload)

      expect(service.removeMember).toHaveBeenCalledWith(
        'team-123',
        'user-456',
        'user-123'
      )
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const updateRoleDto = { role: UserRole.SCRUM_MASTER }

      mockTeamsService.updateMemberRole.mockResolvedValue(mockMemberResponse)

      const result = await controller.updateMemberRole(
        'team-123',
        'user-456',
        updateRoleDto,
        mockJwtPayload
      )

      expect(service.updateMemberRole).toHaveBeenCalledWith(
        'team-123',
        'user-456',
        updateRoleDto,
        'user-123'
      )
      expect(result).toEqual(mockMemberResponse)
    })
  })
})
