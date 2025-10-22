import { teamsApi, Team, TeamMember, CreateTeamData, UpdateTeamData, AddMemberData, UpdateMemberRoleData } from '../api'
import { ApiError } from '@/lib/api'

// Mock fetch globally
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('teamsApi', () => {
  const mockToken = 'test-token'
  const API_URL = 'http://localhost:3001'

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.setItem('accessToken', mockToken)
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('create', () => {
    it('should create a team successfully', async () => {
      const createData: CreateTeamData = {
        name: 'Engineering Team',
        description: 'Core engineering team'
      }

      const mockResponse: Team = {
        id: 'team-1',
        name: 'Engineering Team',
        description: 'Core engineering team',
        creatorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        memberCount: 1
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse
      })

      const result = await teamsApi.create(createData)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(createData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`
          })
        })
      )
    })

    it('should throw ApiError on validation error (400)', async () => {
      const createData: CreateTeamData = {
        name: 'AB', // Too short
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          message: 'name must be at least 3 characters'
        })
      })

      await expect(teamsApi.create(createData)).rejects.toThrow(ApiError)
      await expect(teamsApi.create(createData)).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining('3 characters')
      })
    })

    it('should throw ApiError on unauthorized (401)', async () => {
      localStorageMock.removeItem('accessToken')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized'
      })

      await expect(teamsApi.create({ name: 'Test Team' })).rejects.toThrow(ApiError)
    })
  })

  describe('getAll', () => {
    it('should retrieve all teams', async () => {
      const mockTeams: Team[] = [
        {
          id: 'team-1',
          name: 'Team A',
          creatorId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberCount: 5
        },
        {
          id: 'team-2',
          name: 'Team B',
          creatorId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberCount: 3
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTeams
      })

      const result = await teamsApi.getAll()

      expect(result).toEqual(mockTeams)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams`,
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should return empty array when no teams exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      })

      const result = await teamsApi.getAll()

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('should retrieve team by id', async () => {
      const mockTeam: Team = {
        id: 'team-1',
        name: 'Engineering Team',
        description: 'Core team',
        creatorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
        memberCount: 1
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTeam
      })

      const result = await teamsApi.getById('team-1')

      expect(result).toEqual(mockTeam)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams/team-1`,
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should throw ApiError on team not found (404)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({
          message: 'Team not found'
        })
      })

      await expect(teamsApi.getById('non-existent')).rejects.toThrow(ApiError)
    })

    it('should throw ApiError on forbidden access (403)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          message: 'Not a team member'
        })
      })

      await expect(teamsApi.getById('team-1')).rejects.toThrow(ApiError)
    })
  })

  describe('update', () => {
    it('should update team successfully', async () => {
      const updateData: UpdateTeamData = {
        name: 'Updated Team Name',
        description: 'Updated description'
      }

      const mockResponse: Team = {
        id: 'team-1',
        name: 'Updated Team Name',
        description: 'Updated description',
        creatorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        memberCount: 1
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      const result = await teamsApi.update('team-1', updateData)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams/team-1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData)
        })
      )
    })

    it('should throw ApiError when not team admin (403)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          message: 'Not a team admin'
        })
      })

      await expect(teamsApi.update('team-1', { name: 'New Name' })).rejects.toThrow(ApiError)
    })
  })

  describe('delete', () => {
    it('should delete team successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204
      })

      const result = await teamsApi.delete('team-1')

      expect(result).toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams/team-1`,
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should throw ApiError when not authorized (403)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          message: 'Not a team admin'
        })
      })

      await expect(teamsApi.delete('team-1')).rejects.toThrow(ApiError)
    })
  })

  describe('addMember', () => {
    it('should add member to team successfully', async () => {
      const memberData: AddMemberData = {
        userId: 'user-2',
        role: 'MEMBER'
      }

      const mockResponse: TeamMember = {
        id: 'member-1',
        userId: 'user-2',
        teamId: 'team-1',
        role: 'MEMBER',
        joinedAt: new Date()
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse
      })

      const result = await teamsApi.addMember('team-1', memberData)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams/team-1/members`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(memberData)
        })
      )
    })

    it('should throw ApiError when user already a member (409)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => JSON.stringify({
          message: 'User already a member'
        })
      })

      await expect(teamsApi.addMember('team-1', { userId: 'user-2', role: 'MEMBER' })).rejects.toThrow(ApiError)
    })
  })

  describe('removeMember', () => {
    it('should remove member from team successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204
      })

      const result = await teamsApi.removeMember('team-1', 'user-2')

      expect(result).toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams/team-1/members/user-2`,
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should throw ApiError when cannot remove last admin (400)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          message: 'Cannot remove last admin'
        })
      })

      await expect(teamsApi.removeMember('team-1', 'user-1')).rejects.toThrow(ApiError)
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      const roleData: UpdateMemberRoleData = {
        role: 'ADMIN'
      }

      const mockResponse: TeamMember = {
        id: 'member-1',
        userId: 'user-2',
        teamId: 'team-1',
        role: 'ADMIN',
        joinedAt: new Date()
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      const result = await teamsApi.updateMemberRole('team-1', 'user-2', roleData)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams/team-1/members/user-2/role`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(roleData)
        })
      )
    })

    it('should throw ApiError when cannot change last admin role (400)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          message: 'Cannot change last admin role'
        })
      })

      await expect(
        teamsApi.updateMemberRole('team-1', 'user-1', { role: 'MEMBER' })
      ).rejects.toThrow(ApiError)
    })

    it('should throw ApiError when member not found (404)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({
          message: 'Member not found'
        })
      })

      await expect(
        teamsApi.updateMemberRole('team-1', 'non-existent', { role: 'ADMIN' })
      ).rejects.toThrow(ApiError)
    })
  })
})
