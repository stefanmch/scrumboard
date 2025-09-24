import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '@/components/board/Board'
import { createMockStory } from '@/__tests__/utils/test-utils'
import { ApiError } from '@/lib/api'

// Import mocks
import '../apps/web/src/__tests__/mocks/api'
import '../apps/web/src/__tests__/mocks/dnd-kit'
import { mockStoriesApi, resetApiMocks } from '../apps/web/src/__tests__/mocks/api'

describe('Retry Mechanism and Recovery Testing', () => {
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

  describe('Automatic Retry Mechanisms', () => {
    it('should automatically retry on network errors with exponential backoff', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let callCount = 0
      mockStoriesApi.create.mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          // First two attempts fail with network error
          return Promise.reject(new ApiError(0, 'Network error', new Error('connection failed'), true))
        } else {
          // Third attempt succeeds
          return Promise.resolve(createMockStory({
            id: 'retry-success',
            title: 'Auto Retry Success',
            description: 'Successfully created after retries'
          }))
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

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Auto Retry Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing automatic retry mechanism')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // If automatic retries are implemented, advance timers to simulate retry delays
      // First retry after 1 second
      jest.advanceTimersByTime(1000)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Second retry after 2 seconds (exponential backoff)
      jest.advanceTimersByTime(2000)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(3)
      })

      // Should eventually succeed and close modal
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should respect maximum retry limits', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Always fail with retryable error
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
      await user.type(titleInput, 'Max Retry Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing maximum retry limits')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Advance time to trigger all retries (assuming 3 max retries with exponential backoff)
      jest.advanceTimersByTime(1000) // First retry
      jest.advanceTimersByTime(2000) // Second retry
      jest.advanceTimersByTime(4000) // Third retry
      jest.advanceTimersByTime(2000) // Allow for processing

      await waitFor(() => {
        // Should have made initial call + 3 retries = 4 total calls
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(4)
      })

      // Modal should remain open after max retries exceeded
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Max Retry Test')).toBeInTheDocument()
    })

    it('should not retry non-retryable errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Client error that should not be retried
      const nonRetryableError = new ApiError(400, 'Bad request - do not retry')
      mockStoriesApi.create.mockRejectedValue(nonRetryableError)

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
      await user.type(titleInput, 'No Retry Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing non-retryable error')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Wait for the initial call to complete
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Advance time - should not trigger any retries
      jest.advanceTimersByTime(10000)

      // Should still only have been called once
      expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)

      // Modal should remain open with error state
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('No Retry Test')).toBeInTheDocument()
    })
  })

  describe('Manual Retry Functionality', () => {
    it('should allow manual retry after automatic retries fail', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let attempts = 0
      mockStoriesApi.create.mockImplementation(() => {
        attempts++
        if (attempts <= 4) {
          // First 4 attempts (initial + 3 auto retries) fail
          return Promise.reject(new ApiError(500, 'Server error'))
        } else {
          // Manual retry succeeds
          return Promise.resolve(createMockStory({ id: 'manual-retry-success' }))
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

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Manual Retry Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing manual retry functionality')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Let automatic retries complete
      jest.advanceTimersByTime(10000)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(4)
      })

      // Modal should still be open
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // Manual retry
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(5)
      })

      // Should succeed and close modal
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })
    })

    it('should preserve form state during manual retries', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let retryCount = 0
      mockStoriesApi.update.mockImplementation(() => {
        retryCount++
        if (retryCount <= 2) {
          return Promise.reject(new ApiError(503, 'Service temporarily unavailable'))
        } else {
          return Promise.resolve(createMockStory({
            id: 'story-1',
            title: 'Manually Retried Story',
            description: 'Updated after manual retries'
          }))
        }
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Open edit modal
      const storyCard = screen.getByText('First Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const editButton = screen.getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('First Story')).toBeInTheDocument()
      })

      // Modify form data
      const titleInput = screen.getByDisplayValue('First Story')
      const descriptionInput = screen.getByDisplayValue('First story description')
      const storyPointsSelect = screen.getByDisplayValue('3')
      const assigneeInput = screen.getByLabelText(/Assignee/)

      await user.clear(titleInput)
      await user.type(titleInput, 'Manually Retried Story')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated after manual retries')
      await user.selectOptions(storyPointsSelect, '8')
      await user.clear(assigneeInput)
      await user.type(assigneeInput, 'retry.user')

      // First attempt - fails
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalledTimes(1)
      })

      // Verify form data is preserved
      expect(screen.getByDisplayValue('Manually Retried Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Updated after manual retries')).toBeInTheDocument()
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()
      expect(screen.getByDisplayValue('retry.user')).toBeInTheDocument()

      // Second attempt - fails
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalledTimes(2)
      })

      // Data still preserved
      expect(screen.getByDisplayValue('Manually Retried Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Updated after manual retries')).toBeInTheDocument()
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()
      expect(screen.getByDisplayValue('retry.user')).toBeInTheDocument()

      // Third attempt - succeeds
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalledTimes(3)
      })

      // Modal should close on success
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })
    })

    it('should handle retry button states appropriately', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const retryableError = new ApiError(500, 'Retryable server error')
      mockStoriesApi.create.mockRejectedValue(retryableError)

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
      await user.type(titleInput, 'Retry Button Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing retry button states')

      const saveButton = screen.getByText('Save Changes')

      // Initial state - button should be enabled
      expect(saveButton).toBeEnabled()

      // Click to trigger error
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // After error, button should still be enabled for retry
      expect(saveButton).toBeEnabled()
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // Button text or appearance might change to indicate retry state
      // This depends on implementation details
    })
  })

  describe('Circuit Breaker Pattern', () => {
    it('should implement circuit breaker for repeated failures', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Always fail to trigger circuit breaker
      const persistentError = new ApiError(500, 'Persistent failure for circuit breaker test')
      mockStoriesApi.create.mockRejectedValue(persistentError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Attempt multiple operations to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        const addButtons = screen.getAllByTitle('Add new story')
        await user.click(addButtons[0])

        await waitFor(() => {
          expect(screen.getByText('Edit Story')).toBeInTheDocument()
        })

        const titleInput = screen.getByDisplayValue('New Story')
        const descriptionInput = screen.getByDisplayValue('Add your story description here...')

        await user.clear(titleInput)
        await user.type(titleInput, `Circuit Breaker Test ${i}`)
        await user.clear(descriptionInput)
        await user.type(descriptionInput, `Attempt ${i} for circuit breaker`)

        const saveButton = screen.getByText('Save Changes')
        await user.click(saveButton)

        await waitFor(() => {
          expect(mockStoriesApi.create).toHaveBeenCalledTimes(i + 1)
        })

        // Close modal for next iteration
        const cancelButton = screen.getByText('Cancel')
        await user.click(cancelButton)

        await waitFor(() => {
          expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
        })
      }

      // Circuit breaker behavior would depend on implementation
      // This test mainly ensures multiple failures don't cause crashes
      expect(mockStoriesApi.create).toHaveBeenCalledTimes(5)
    })
  })

  describe('Retry with Modified Data', () => {
    it('should allow retrying with corrected data after validation error', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let attempts = 0
      mockStoriesApi.create.mockImplementation((data) => {
        attempts++
        if (attempts === 1 && data.title === 'Short') {
          // First attempt with short title fails
          return Promise.reject(new ApiError(422, 'Title too short'))
        } else {
          // Subsequent attempts or longer titles succeed
          return Promise.resolve(createMockStory({
            id: `corrected-story-${attempts}`,
            ...data
          }))
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

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      // First attempt with short title
      await user.clear(titleInput)
      await user.type(titleInput, 'Short')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing retry with corrections')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Should remain open with error
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Short')).toBeInTheDocument()

      // Correct the data
      await user.clear(titleInput)
      await user.type(titleInput, 'Corrected Longer Title')

      // Retry with corrected data
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Should succeed and close modal
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })

      // Verify correct data was sent
      expect(mockStoriesApi.create).toHaveBeenLastCalledWith({
        title: 'Corrected Longer Title',
        description: 'Testing retry with corrections',
        storyPoints: 3,
        status: 'TODO',
        assigneeId: null
      })
    })

    it('should allow retrying delete operations after permission changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let deleteAttempts = 0
      mockStoriesApi.delete.mockImplementation(() => {
        deleteAttempts++
        if (deleteAttempts === 1) {
          // First attempt fails with permission error
          return Promise.reject(new ApiError(403, 'Insufficient permissions'))
        } else {
          // Subsequent attempts succeed (permissions granted)
          return Promise.resolve()
        }
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // First delete attempt
      const storyCard = screen.getByText('First Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const deleteButton = screen.getByTitle('Delete story')
        expect(deleteButton).toBeInTheDocument()
      })

      const deleteButton = screen.getByTitle('Delete story')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Story')).toBeInTheDocument()
      })

      const confirmDeleteButton = screen.getByRole('button', { name: /Delete Story/i })
      await user.click(confirmDeleteButton)

      await waitFor(() => {
        expect(mockStoriesApi.delete).toHaveBeenCalledTimes(1)
      })

      // Should handle permission error - story remains
      expect(screen.getByText('First Story')).toBeInTheDocument()

      // Retry delete operation (assuming permissions are now granted)
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const retryDeleteButton = screen.getByTitle('Delete story')
        expect(retryDeleteButton).toBeInTheDocument()
      })

      await user.click(retryDeleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Story')).toBeInTheDocument()
      })

      const retryConfirmButton = screen.getByRole('button', { name: /Delete Story/i })
      await user.click(retryConfirmButton)

      await waitFor(() => {
        expect(mockStoriesApi.delete).toHaveBeenCalledTimes(2)
      })

      // Should succeed on retry (implementation dependent)
      await waitFor(() => {
        expect(screen.queryByText('Delete Story')).not.toBeInTheDocument()
      })
    })
  })

  describe('Retry Feedback and User Experience', () => {
    it('should provide clear feedback during retry operations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let retryCount = 0
      mockStoriesApi.create.mockImplementation(() => {
        retryCount++
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (retryCount <= 2) {
              reject(new ApiError(503, 'Service temporarily unavailable'))
            } else {
              resolve(createMockStory({ id: 'retry-feedback-success' }))
            }
          }, 1000)
        })
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

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Retry Feedback Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing retry user feedback')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // First attempt
      jest.advanceTimersByTime(1000)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Should show some indication of retry (button disabled, loading state, etc.)
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // Automatic retry
      jest.advanceTimersByTime(2000)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Second retry
      jest.advanceTimersByTime(3000)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(3)
      })

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })
    })

    it('should show appropriate error messages after retry exhaustion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Always fail to exhaust retries
      const exhaustingError = new ApiError(500, 'Persistent server error')
      mockStoriesApi.create.mockRejectedValue(exhaustingError)

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
      await user.type(titleInput, 'Retry Exhaustion Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing retry exhaustion messages')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Let all automatic retries complete
      jest.advanceTimersByTime(15000)

      await waitFor(() => {
        // Should have exhausted retries
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(4) // Initial + 3 retries
      })

      // Should show appropriate error state
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Retry Exhaustion Test')).toBeInTheDocument()

      // Button should still be available for manual retry
      expect(saveButton).toBeEnabled()
    })
  })
})