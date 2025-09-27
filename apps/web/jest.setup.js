import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock scrollTo
global.scrollTo = jest.fn()

// Setup modal-root for all tests (ensures React Portal works)
const setupModalRoot = () => {
  // Remove existing modal-root if it exists
  const existingModalRoot = document.getElementById('modal-root')
  if (existingModalRoot) {
    document.body.removeChild(existingModalRoot)
  }

  // Create fresh modal-root element
  const modalRoot = document.createElement('div')
  modalRoot.setAttribute('id', 'modal-root')
  document.body.appendChild(modalRoot)

  // Reset body overflow in case previous test left it modified
  document.body.style.overflow = ''
}

// Setup modal environment before each test
beforeEach(() => {
  setupModalRoot()
})

// Cleanup after each test
afterEach(() => {
  // Clean up modal-root
  const modalRoot = document.getElementById('modal-root')
  if (modalRoot) {
    document.body.removeChild(modalRoot)
  }
  // Reset body styles
  document.body.style.overflow = ''
})

// Suppress specific console warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' && (
        args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('An update to') ||
        args[0].includes('was not wrapped in act') ||
        args[0].includes('The current testing environment is not configured to support act') ||
        args[0].includes('A component suspended inside an `act` scope') ||
        args[0].startsWith('Failed to load stories:') ||
        args[0].startsWith('Failed to update story:') ||
        args[0].startsWith('Failed to save story:') ||
        args[0].startsWith('Failed to delete story:')
      )
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock @dnd-kit modules for testing
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragOver, onDragEnd }) => {
    // Store callbacks for testing
    ;(global).dndCallbacks = { onDragStart, onDragOver, onDragEnd }
    return children
  },
  DragOverlay: ({ children }) => children,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (array, oldIndex, newIndex) => {
    const result = [...array]
    const item = result.splice(oldIndex, 1)[0]
    result.splice(newIndex, 0, item)
    return result
  },
  verticalListSortingStrategy: 'vertical',
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}))

// Create mock stories data
const createMockStory = (overrides = {}) => ({
  id: 'story-1',
  title: 'Test Story',
  description: 'Test Description',
  storyPoints: 3,
  status: 'TODO',
  priority: 'MEDIUM',
  type: 'FEATURE',
  refinementStatus: 'NOT_REFINED',
  tags: [],
  rank: 1,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  projectId: 'project-1',
  creatorId: 'user-1',
  sprintId: null,
  assigneeId: null,
  parentId: null,
  businessValue: null,
  acceptanceCriteria: null,
  assignee: null,
  creator: null,
  parent: null,
  children: [],
  project: null,
  sprint: null,
  tasks: [],
  comments: [],
  ...overrides,
})

// Mock API responses
const mockStories = [
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
const mockStoriesApi = {
  getAll: jest.fn().mockResolvedValue(mockStories),
  getById: jest.fn().mockImplementation((id) => {
    const story = mockStories.find(s => s.id === id)
    return story ? Promise.resolve(story) : Promise.reject(new Error('Story not found'))
  }),
  getByStatus: jest.fn().mockImplementation((status) => {
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
  update: jest.fn().mockImplementation((id, updates) => {
    const story = mockStories.find(s => s.id === id)
    if (!story) {
      return Promise.reject(new Error('Story not found'))
    }
    const updatedStory = { ...story, ...updates, updatedAt: new Date() }
    return Promise.resolve(updatedStory)
  }),
  updateStatus: jest.fn().mockImplementation((id, status) => {
    const story = mockStories.find(s => s.id === id)
    if (!story) {
      return Promise.reject(new Error('Story not found'))
    }
    const updatedStory = { ...story, status, updatedAt: new Date() }
    return Promise.resolve(updatedStory)
  }),
  reorder: jest.fn().mockResolvedValue(mockStories),
  delete: jest.fn().mockResolvedValue(undefined),
  moveToSprint: jest.fn().mockImplementation((id, sprintId) => {
    const story = mockStories.find(s => s.id === id)
    if (!story) {
      return Promise.reject(new Error('Story not found'))
    }
    const updatedStory = { ...story, sprintId, updatedAt: new Date() }
    return Promise.resolve(updatedStory)
  }),
}

// Mock API Error class with comprehensive error handling
class MockApiError extends Error {
  constructor(status, message, originalError, isNetworkError = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.originalError = originalError
    this.isNetworkError = isNetworkError
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500
  }

  get isServerError() {
    return this.status >= 500
  }

  get isRetryable() {
    return this.isNetworkError || this.isServerError
  }

  getUserFriendlyMessage() {
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

jest.mock('@/lib/api', () => ({
  storiesApi: mockStoriesApi,
  ApiError: MockApiError,
}))

// Reset all mocks function
const resetApiMocks = () => {
  Object.values(mockStoriesApi).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear()
    }
  })
}

// Mock Toast Provider
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
    clearAllToasts: jest.fn(),
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  }),
  ToastProvider: ({ children }) => children,
}))

// Mock Error Boundary
jest.mock('@/components/error/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }) => children,
  useErrorHandler: () => ({ handleError: jest.fn() }),
}))

// Make globals available for tests
global.createMockStory = createMockStory
global.mockStories = mockStories
global.mockStoriesApi = mockStoriesApi
global.resetApiMocks = resetApiMocks
global.MockApiError = MockApiError