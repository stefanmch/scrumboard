import { Story, StoryStatus } from '@/types'
import { createMockStory } from '../utils/test-utils'

// Mock API Error class
class MockApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: Error,
    public isNetworkError: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  get isServerError(): boolean {
    return this.status >= 500
  }

  get isRetryable(): boolean {
    return this.isNetworkError || this.isServerError
  }

  getUserFriendlyMessage(): string {
    if (this.isNetworkError) {
      return 'Connection failed. Please check your internet connection and try again.'
    }
    switch (this.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.'
      case 404:
        return 'The requested resource could not be found.'
      case 500:
        return 'Server error. Please try again in a few moments.'
      default:
        return this.message || 'An unexpected error occurred. Please try again.'
    }
  }
}

// Mock API responses
export const mockStories: Story[] = [
  createMockStory({
    id: 'story-1',
    title: 'TODO Story',
    description: 'First story description',
    status: 'TODO',
    rank: 1,
  }),
  createMockStory({
    id: 'story-2',
    title: 'In Progress Story',
    description: 'Second story description',
    status: 'IN_PROGRESS',
    rank: 1,
  }),
  createMockStory({
    id: 'story-3',
    title: 'Done Story',
    description: 'Third story description',
    status: 'DONE',
    rank: 1,
  }),
]

// Mock the storiesApi module
export const mockStoriesApi = {
  getAll: jest.fn().mockResolvedValue(mockStories),
  getById: jest.fn().mockImplementation((id: string) => {
    const story = mockStories.find(s => s.id === id)
    return story ? Promise.resolve(story) : Promise.reject(new MockApiError(404, 'Story not found'))
  }),
  getByStatus: jest.fn().mockImplementation((status: StoryStatus) => {
    const stories = mockStories.filter(s => s.status === status)
    return Promise.resolve(stories)
  }),
  create: jest.fn().mockImplementation((storyData) => {
    const newStory = createMockStory({
      ...storyData,
      id: `story-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return Promise.resolve(newStory)
  }),
  update: jest.fn().mockImplementation((id: string, updates) => {
    const story = mockStories.find(s => s.id === id)
    if (!story) {
      return Promise.reject(new MockApiError(404, 'Story not found'))
    }
    const updatedStory = { ...story, ...updates, updatedAt: new Date() }
    return Promise.resolve(updatedStory)
  }),
  updateStatus: jest.fn().mockImplementation((id: string, status: StoryStatus) => {
    const story = mockStories.find(s => s.id === id)
    if (!story) {
      return Promise.reject(new MockApiError(404, 'Story not found'))
    }
    const updatedStory = { ...story, status, updatedAt: new Date() }
    return Promise.resolve(updatedStory)
  }),
  reorder: jest.fn().mockResolvedValue(mockStories),
  delete: jest.fn().mockResolvedValue(undefined),
  moveToSprint: jest.fn().mockImplementation((id: string, sprintId: string | null) => {
    const story = mockStories.find(s => s.id === id)
    if (!story) {
      return Promise.reject(new MockApiError(404, 'Story not found'))
    }
    const updatedStory = { ...story, sprintId, updatedAt: new Date() }
    return Promise.resolve(updatedStory)
  }),
}

// Reset all mocks
export const resetApiMocks = () => {
  Object.values(mockStoriesApi).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear()
    }
  })
  // Reset to default implementations
  mockStoriesApi.getAll.mockResolvedValue(mockStories)
  mockStoriesApi.getByStatus.mockImplementation((status: StoryStatus) => {
    const stories = mockStories.filter(s => s.status === status)
    return Promise.resolve(stories)
  })
}

// Mock the API module
jest.mock('@/lib/api', () => ({
  storiesApi: mockStoriesApi,
  ApiError: MockApiError,
}))