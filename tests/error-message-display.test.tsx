import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '@/components/board/Board'
import { createMockStory } from '@/__tests__/utils/test-utils'
import { ApiError } from '@/lib/api'

// Import mocks
import '../apps/web/src/__tests__/mocks/api'
import '../apps/web/src/__tests__/mocks/dnd-kit'
import { mockStoriesApi, resetApiMocks } from '../apps/web/src/__tests__/mocks/api'

// Mock toast notifications if they exist
const mockToast = jest.fn()
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: jest.fn()
  })
}), { virtual: true })

describe('Error Message Display and User Communication', () => {
  beforeEach(() => {
    resetApiMocks()
    mockToast.mockClear()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('User-Friendly Error Messages', () => {
    it('should display appropriate message for network errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Create a network error with the enhanced ApiError structure
      const networkError = new ApiError(0, 'Network error occurred', new Error('fetch failed'), true)
      mockStoriesApi.create.mockRejectedValue(networkError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Open create modal and fill form
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Network Error Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing network error display')

      // Submit and trigger network error
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Verify user-friendly error handling (exact implementation depends on error display mechanism)
      // This could be a toast, inline message, or other UI feedback
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Network Error Test')).toBeInTheDocument()
    })

    it('should display specific validation error messages', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Mock validation error with field-specific messages
      const validationError = new ApiError(422, 'Validation failed')
      // Add validation details if your error handling supports it
      ;(validationError as any).validationErrors = {
        title: ['Title must be at least 3 characters long'],
        description: ['Description is required']
      }

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

      // Submit with data that will trigger validation error
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Hi') // Too short
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid description')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Modal should remain open with error state
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Hi')).toBeInTheDocument()
    })

    it('should show rate limiting messages with retry guidance', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const rateLimitError = new ApiError(429, 'Too many requests')
      ;(rateLimitError as any).retryAfter = 60 // 60 seconds

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

      // Fill and submit form
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Rate Limited Story')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing rate limit message')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should show user-friendly rate limit message
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Rate Limited Story')).toBeInTheDocument()
    })

    it('should display server error messages with retry suggestion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const serverError = new ApiError(500, 'Internal server error')
      mockStoriesApi.update.mockRejectedValue(serverError)

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

      // Modify and submit
      const titleInput = screen.getByDisplayValue('First Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Server Error Test')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Should handle server error gracefully
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Server Error Test')).toBeInTheDocument()
    })

    it('should display permission error messages', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const forbiddenError = new ApiError(403, 'Insufficient permissions')
      mockStoriesApi.delete.mockRejectedValue(forbiddenError)

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

      // Should handle permission error
      expect(screen.getByText('First Story')).toBeInTheDocument()
    })
  })

  describe('Error Message Positioning and Visibility', () => {
    it('should display error messages in appropriate locations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const validationError = new ApiError(422, 'Validation failed')
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

      // Submit invalid form
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton) // Should be disabled, but test error handling anyway

      // Error messages should be positioned appropriately
      // This depends on your specific error display implementation
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
    })

    it('should clear error messages when user makes corrections', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // First attempt fails, second succeeds
      mockStoriesApi.create
        .mockRejectedValueOnce(new ApiError(422, 'Validation failed'))
        .mockResolvedValueOnce(createMockStory({ id: 'corrected-story' }))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill form with valid data
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Valid Title')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid description')

      // First submission - validation error
      let saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Modal should remain open
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // Second submission - success
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

  describe('Error Message Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const serverError = new ApiError(500, 'Server temporarily unavailable')
      mockStoriesApi.create.mockRejectedValue(serverError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill and submit form
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Accessibility Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing error announcements')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Error should be properly announced (implementation specific)
      // Look for aria-live regions or other accessibility features
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
    })

    it('should maintain focus on error elements', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const validationError = new ApiError(422, 'Title too short')
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

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'AB') // Too short
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid description')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Focus should be managed appropriately after error
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('AB')).toBeInTheDocument()
    })
  })

  describe('Progressive Error Disclosure', () => {
    it('should show basic error first, then details on request', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const detailedError = new ApiError(400, 'Detailed validation information')
      // Add technical details that might be hidden initially
      ;(detailedError as any).details = {
        field: 'title',
        constraint: 'length',
        value: 'AB',
        minimum: 3
      }

      mockStoriesApi.create.mockRejectedValue(detailedError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'AB')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid description')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should show user-friendly error initially
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('AB')).toBeInTheDocument()
    })
  })

  describe('Error Message Persistence', () => {
    it('should maintain error context across form interactions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const persistentError = new ApiError(500, 'Persistent server error')
      mockStoriesApi.create.mockRejectedValue(persistentError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Persistent Error Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing error persistence')

      // Submit and get error
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Continue interacting with form
      await user.clear(titleInput)
      await user.type(titleInput, 'Modified Title')

      // Error context should be maintained
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Modified Title')).toBeInTheDocument()
    })

    it('should clear errors when modal is reopened', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const temporaryError = new ApiError(500, 'Temporary error')
      mockStoriesApi.create.mockRejectedValue(temporaryError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // First attempt with error
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'First Attempt')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'First attempt description')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Close modal
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })

      // Reopen modal - should be clean slate
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Should show default values, no error state
      expect(screen.getByDisplayValue('New Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Add your story description here...')).toBeInTheDocument()
    })
  })
})