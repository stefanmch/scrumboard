import { projectsApi, Project, ProjectStats, CreateProjectData, UpdateProjectData } from '../api'
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

describe('projectsApi', () => {
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
    it('should create a project successfully', async () => {
      const createData: CreateProjectData = {
        name: 'E-commerce Platform',
        description: 'Building a scalable platform',
        status: 'ACTIVE'
      }

      const mockResponse: Project = {
        id: 'project-1',
        name: 'E-commerce Platform',
        description: 'Building a scalable platform',
        status: 'ACTIVE',
        teamId: 'team-1',
        teamName: 'Engineering Team',
        createdAt: new Date(),
        updatedAt: new Date(),
        storyCount: 0,
        sprintCount: 0,
        taskCount: 0
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse
      })

      const result = await projectsApi.create('team-1', createData)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams/team-1/projects`,
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
      const createData: CreateProjectData = {
        name: 'AB', // Too short
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          message: 'name must be at least 3 characters'
        })
      })

      await expect(projectsApi.create('team-1', createData)).rejects.toThrow(ApiError)
    })

    it('should throw ApiError when user not a team member (403)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          message: 'User is not a member of the team'
        })
      })

      await expect(
        projectsApi.create('team-1', { name: 'Test Project' })
      ).rejects.toThrow(ApiError)
    })
  })

  describe('getAllForTeam', () => {
    it('should retrieve all projects for a team', async () => {
      const mockProjects: Project[] = [
        {
          id: 'project-1',
          name: 'Project A',
          status: 'ACTIVE',
          teamId: 'team-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          storyCount: 10,
          sprintCount: 2
        },
        {
          id: 'project-2',
          name: 'Project B',
          status: 'COMPLETED',
          teamId: 'team-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          storyCount: 5,
          sprintCount: 1
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProjects
      })

      const result = await projectsApi.getAllForTeam('team-1')

      expect(result).toEqual(mockProjects)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/teams/team-1/projects`,
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should return empty array when no projects exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      })

      const result = await projectsApi.getAllForTeam('team-1')

      expect(result).toEqual([])
    })

    it('should throw ApiError when user not a team member (403)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          message: 'User is not a member of the team'
        })
      })

      await expect(projectsApi.getAllForTeam('team-1')).rejects.toThrow(ApiError)
    })
  })

  describe('getById', () => {
    it('should retrieve project by id', async () => {
      const mockProject: Project = {
        id: 'project-1',
        name: 'E-commerce Platform',
        description: 'Full project description',
        status: 'ACTIVE',
        teamId: 'team-1',
        teamName: 'Engineering Team',
        createdAt: new Date(),
        updatedAt: new Date(),
        storyCount: 15,
        sprintCount: 3,
        taskCount: 45
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProject
      })

      const result = await projectsApi.getById('project-1')

      expect(result).toEqual(mockProject)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/projects/project-1`,
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should throw ApiError on project not found (404)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({
          message: 'Project not found'
        })
      })

      await expect(projectsApi.getById('non-existent')).rejects.toThrow(ApiError)
    })
  })

  describe('getStats', () => {
    it('should retrieve project statistics', async () => {
      const mockStats: ProjectStats = {
        projectId: 'project-1',
        projectName: 'E-commerce Platform',
        totalStories: 20,
        completedStories: 15,
        totalSprints: 4,
        activeSprints: 1,
        completedSprints: 3,
        totalTasks: 60,
        completedTasks: 45,
        completionPercentage: 75
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats
      })

      const result = await projectsApi.getStats('project-1')

      expect(result).toEqual(mockStats)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/projects/project-1/stats`,
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should throw ApiError when project not found (404)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({
          message: 'Project not found'
        })
      })

      await expect(projectsApi.getStats('non-existent')).rejects.toThrow(ApiError)
    })
  })

  describe('update', () => {
    it('should update project successfully', async () => {
      const updateData: UpdateProjectData = {
        name: 'Updated Project Name',
        description: 'Updated description',
        status: 'COMPLETED'
      }

      const mockResponse: Project = {
        id: 'project-1',
        name: 'Updated Project Name',
        description: 'Updated description',
        status: 'COMPLETED',
        teamId: 'team-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      const result = await projectsApi.update('project-1', updateData)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/projects/project-1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData)
        })
      )
    })

    it('should throw ApiError when user not team admin (403)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          message: 'User is not a team admin'
        })
      })

      await expect(
        projectsApi.update('project-1', { name: 'New Name' })
      ).rejects.toThrow(ApiError)
    })

    it('should update only specified fields', async () => {
      const updateData: UpdateProjectData = {
        status: 'ARCHIVED'
      }

      const mockResponse: Project = {
        id: 'project-1',
        name: 'Original Name',
        status: 'ARCHIVED',
        teamId: 'team-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      const result = await projectsApi.update('project-1', updateData)

      expect(result.status).toBe('ARCHIVED')
      expect(result.name).toBe('Original Name')
    })
  })

  describe('delete', () => {
    it('should delete project successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204
      })

      const result = await projectsApi.delete('project-1')

      expect(result).toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/projects/project-1`,
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should throw ApiError when user not team admin (403)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          message: 'User is not a team admin'
        })
      })

      await expect(projectsApi.delete('project-1')).rejects.toThrow(ApiError)
    })

    it('should throw ApiError when project not found (404)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({
          message: 'Project not found'
        })
      })

      await expect(projectsApi.delete('non-existent')).rejects.toThrow(ApiError)
    })
  })
})
