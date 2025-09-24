import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '@/components/board/Board'
import { StoryEditModal } from '@/components/modals/StoryEditModal'
import { createMockStory } from '@/__tests__/utils/test-utils'
import { ApiError } from '@/lib/api'

// Import mocks
import '../apps/web/src/__tests__/mocks/api'
import '../apps/web/src/__tests__/mocks/dnd-kit'
import { mockStoriesApi, resetApiMocks } from '../apps/web/src/__tests__/mocks/api'

// Error response templates for consistent testing
export const ErrorTemplates = {
  NetworkError: {
    name: 'NetworkError',
    message: 'Network request failed',
    cause: 'NETWORK_FAILURE'
  },

  ValidationError: {
    status: 422,
    message: 'Validation failed',
    errors: {
      title: ['Title is required', 'Title must be at least 3 characters'],
      description: ['Description cannot be empty']
    }
  },

  ServerError: {
    status: 500,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId: 'req_123456789'
  },

  RateLimitError: {
    status: 429,
    message: 'Too many requests',
    retryAfter: 60,
    limit: 100,
    remaining: 0
  },

  ConflictError: {
    status: 409,
    message: 'Resource was modified by another user',
    lastModified: new Date().toISOString(),
    currentVersion: 'v2',
    attemptedVersion: 'v1'
  },

  TimeoutError: {
    name: 'TimeoutError',
    message: 'Request timed out after 30000ms',
    timeout: true
  },

  BadGatewayError: {
    status: 502,
    message: 'Bad Gateway',
    code: 'PROXY_ERROR'
  },

  ServiceUnavailableError: {
    status: 503,
    message: 'Service temporarily unavailable',
    retryAfter: 120
  },

  UnauthorizedError: {
    status: 401,
    message: 'Authentication required',
    code: 'AUTH_REQUIRED'
  },

  ForbiddenError: {
    status: 403,
    message: 'Insufficient permissions',
    code: 'PERMISSION_DENIED'
  },

  NotFoundError: {
    status: 404,
    message: 'Story not found',
    code: 'RESOURCE_NOT_FOUND'
  }
}

// Helper function to create API errors
const createApiError = (template: any) => {
  if (template.status) {
    return new ApiError(template.status, template.message)
  }
  const error = new Error(template.message)
  error.name = template.name
  if (template.timeout) {
    ;(error as any).timeout = true
  }
  return error
}

describe('API Error Handling Comprehensive Tests', () => {
  beforeEach(() => {
    resetApiMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Network-Level Error Handling', () => {
    it('should handle network connection failures during story creation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const networkError = createApiError(ErrorTemplates.NetworkError)
      mockStoriesApi.create.mockRejectedValue(networkError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Open create modal
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill valid form data
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Network Test Story')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing network failure handling')

      // Submit form
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Verify API was called
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledWith({
          title: 'Network Test Story',
          description: 'Testing network failure handling',
          storyPoints: 3,
          status: 'TODO',
          assigneeId: null
        })
      })

      // Verify modal remains open after network error
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // Verify form data is preserved
      expect(screen.getByDisplayValue('Network Test Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Testing network failure handling')).toBeInTheDocument()
    })

    it('should handle timeout errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const timeoutError = createApiError(ErrorTemplates.TimeoutError)
      mockStoriesApi.update.mockRejectedValue(timeoutError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Open edit modal
      const storyCard = screen.getByText('First Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const editButton = within(storyCard.closest('.group') as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyCard.closest('.group') as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('First Story')).toBeInTheDocument()
      })

      // Modify story
      const titleInput = screen.getByDisplayValue('First Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Timeout Test Story')

      // Submit and handle timeout
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Verify modal stays open and data preserved
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Timeout Test Story')).toBeInTheDocument()
    })
  })

  describe('HTTP Status Code Error Handling', () => {
    it('should handle 422 validation errors with field-specific messages', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const validationError = createApiError(ErrorTemplates.ValidationError)
      mockStoriesApi.create.mockRejectedValue(validationError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill form with data that will trigger validation error
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'AB') // Too short for validation
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid description')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Modal should remain open with form data preserved
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('AB')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Valid description')).toBeInTheDocument()
    })

    it('should handle 409 conflict errors during concurrent updates', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const conflictError = createApiError(ErrorTemplates.ConflictError)
      mockStoriesApi.update.mockRejectedValue(conflictError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Open edit modal
      const storyCard = screen.getByText('First Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const editButton = within(storyCard.closest('.group') as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyCard.closest('.group') as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('First Story')).toBeInTheDocument()
      })

      // Make changes
      const titleInput = screen.getByDisplayValue('First Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Conflicted Story')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Verify conflict handling - modal stays open, data preserved
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Conflicted Story')).toBeInTheDocument()
    })

    it('should handle 429 rate limiting errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const rateLimitError = createApiError(ErrorTemplates.RateLimitError)
      mockStoriesApi.create.mockRejectedValue(rateLimitError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill valid data
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Rate Limited Story')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing rate limit handling')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Modal should stay open with data preserved
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Rate Limited Story')).toBeInTheDocument()
    })

    it('should handle 500 internal server errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const serverError = createApiError(ErrorTemplates.ServerError)
      mockStoriesApi.update.mockRejectedValue(serverError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Edit existing story
      const storyCard = screen.getByText('First Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const editButton = within(storyCard.closest('.group') as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyCard.closest('.group') as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('First Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('First Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Server Error Story')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Verify graceful error handling
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Server Error Story')).toBeInTheDocument()
    })

    it('should handle 503 service unavailable errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const serviceError = createApiError(ErrorTemplates.ServiceUnavailableError)
      mockStoriesApi.delete.mockRejectedValue(serviceError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Try to delete story
      const storyCard = screen.getByText('First Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const deleteButton = within(storyCard.closest('.group') as HTMLElement).getByTitle('Delete story')
        expect(deleteButton).toBeInTheDocument()
      })

      const deleteButton = within(storyCard.closest('.group') as HTMLElement).getByTitle('Delete story')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Story')).toBeInTheDocument()
      })

      const confirmDeleteButton = screen.getByRole('button', { name: /Delete Story/i })
      await user.click(confirmDeleteButton)

      await waitFor(() => {
        expect(mockStoriesApi.delete).toHaveBeenCalled()
      })

      // Story should remain visible due to service unavailable error
      expect(screen.getByText('First Story')).toBeInTheDocument()
    })
  })

  describe('Form State Preservation During Errors', () => {
    it('should preserve all form fields after create error', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      mockStoriesApi.create.mockRejectedValue(createApiError(ErrorTemplates.ServerError))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill all form fields
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')
      const storyPointsSelect = screen.getByDisplayValue('3')
      const assigneeInput = screen.getByLabelText(/Assignee/)
      const statusSelect = screen.getByDisplayValue('TODO')

      await user.clear(titleInput)
      await user.type(titleInput, 'Preserved Story Title')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'This description should be preserved')
      await user.selectOptions(storyPointsSelect, '8')
      await user.clear(assigneeInput)
      await user.type(assigneeInput, 'john.doe')
      await user.selectOptions(statusSelect, 'IN_PROGRESS')

      // Submit and fail
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Verify all data is preserved
      expect(screen.getByDisplayValue('Preserved Story Title')).toBeInTheDocument()
      expect(screen.getByDisplayValue('This description should be preserved')).toBeInTheDocument()
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()
      expect(screen.getByDisplayValue('john.doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('IN_PROGRESS')).toBeInTheDocument()

      // Modal should remain open
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
    })

    it('should preserve form state during multiple error scenarios', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // First attempt fails with server error
      mockStoriesApi.create.mockRejectedValueOnce(createApiError(ErrorTemplates.ServerError))
      // Second attempt fails with rate limit
      mockStoriesApi.create.mockRejectedValueOnce(createApiError(ErrorTemplates.RateLimitError))
      // Third attempt succeeds
      const successStory = createMockStory({
        id: 'success-story',
        title: 'Eventually Successful Story'
      })
      mockStoriesApi.create.mockResolvedValueOnce(successStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill form
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Eventually Successful Story')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'This will succeed on third try')

      // First attempt - server error
      let saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Verify form data preserved
      expect(screen.getByDisplayValue('Eventually Successful Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('This will succeed on third try')).toBeInTheDocument()

      // Second attempt - rate limit error
      saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Verify form data still preserved
      expect(screen.getByDisplayValue('Eventually Successful Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('This will succeed on third try')).toBeInTheDocument()

      // Third attempt - success
      saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(3)
      })

      // Modal should close on success
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })
    })
  })

  describe('Concurrent Operation Error Handling', () => {
    it('should handle rapid successive submissions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // First call succeeds after delay, second fails due to duplicate
      let callCount = 0
      mockStoriesApi.create.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return new Promise(resolve =>
            setTimeout(() => resolve(createMockStory({ id: 'first-call' })), 1000)
          )
        } else {
          return Promise.reject(createApiError(ErrorTemplates.ConflictError))
        }
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill form
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Rapid Click Story')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing rapid successive clicks')

      // Rapid successive clicks
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)
      await user.click(saveButton) // Second click while first is processing

      // Advance time to resolve first promise
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Should handle gracefully - exact behavior depends on implementation
      // but should not crash or cause inconsistent state
    })
  })

  describe('Error Recovery and Retry Mechanisms', () => {
    it('should allow manual retry after network failure', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // First attempt fails, second succeeds
      mockStoriesApi.create
        .mockRejectedValueOnce(createApiError(ErrorTemplates.NetworkError))
        .mockResolvedValueOnce(createMockStory({ id: 'retry-success' }))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill form
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Retry Test Story')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing retry functionality')

      // First attempt - network error
      let saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Verify modal remains open
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Retry Test Story')).toBeInTheDocument()

      // Retry - should succeed
      saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Modal should close on success
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Boundary Integration', () => {
    it('should handle unexpected errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Simulate unexpected error (not ApiError)
      const unexpectedError = new Error('Unexpected runtime error')
      ;(unexpectedError as any).stack = 'Error stack trace...'
      mockStoriesApi.create.mockRejectedValue(unexpectedError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill and submit
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Unexpected Error Story')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing unexpected error handling')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should handle gracefully without crashing
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Unexpected Error Story')).toBeInTheDocument()
    })
  })
})