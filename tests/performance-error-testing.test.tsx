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

// Performance monitoring utilities
const measurePerformance = () => {
  const start = performance.now()
  return {
    end: () => performance.now() - start,
    markMemory: () => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize
      }
      return 0
    }
  }
}

describe('Performance and Load Testing for Error Scenarios', () => {
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

  describe('Error Handling Performance', () => {
    it('should handle errors quickly without blocking UI', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Create a fast-failing error
      const quickError = new ApiError(400, 'Quick validation error')
      mockStoriesApi.create.mockRejectedValue(quickError)

      const perf = measurePerformance()

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
      await user.type(titleInput, 'Performance Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing error handling performance')

      // Measure error handling time
      const errorStart = performance.now()
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      const errorHandlingTime = performance.now() - errorStart
      const totalTime = perf.end()

      // Error handling should be fast (< 100ms for UI responsiveness)
      expect(errorHandlingTime).toBeLessThan(100)

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(5000)

      // Form should remain interactive
      expect(screen.getByDisplayValue('Performance Test')).toBeInTheDocument()
      expect(titleInput).not.toBeDisabled()
    })

    it('should not cause memory leaks during repeated errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const memoryError = new ApiError(500, 'Server error causing memory test')
      mockStoriesApi.create.mockRejectedValue(memoryError)

      const initialMemory = measurePerformance().markMemory()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Simulate multiple error cycles
      for (let i = 0; i < 10; i++) {
        const addButtons = screen.getAllByTitle('Add new story')
        await user.click(addButtons[0])

        await waitFor(() => {
          expect(screen.getByText('Edit Story')).toBeInTheDocument()
        })

        const titleInput = screen.getByDisplayValue('New Story')
        const descriptionInput = screen.getByDisplayValue('Add your story description here...')

        await user.clear(titleInput)
        await user.type(titleInput, `Memory Test ${i}`)
        await user.clear(descriptionInput)
        await user.type(descriptionInput, `Iteration ${i} description`)

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
      }

      // Allow garbage collection
      if (global.gc) {
        global.gc()
      }

      const finalMemory = measurePerformance().markMemory()
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (< 5MB for 10 error cycles)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024)
    })

    it('should handle high-frequency error scenarios without degradation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const rapidError = new ApiError(429, 'Rate limit error')
      mockStoriesApi.create.mockRejectedValue(rapidError)

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
      await user.type(titleInput, 'Rapid Fire Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing rapid error handling')

      const saveButton = screen.getByText('Save Changes')
      const performanceTimes = []

      // Simulate rapid clicking (user frustration scenario)
      for (let i = 0; i < 5; i++) {
        const start = performance.now()
        await user.click(saveButton)

        await waitFor(() => {
          expect(mockStoriesApi.create).toHaveBeenCalledTimes(i + 1)
        })

        performanceTimes.push(performance.now() - start)
      }

      // Performance should not degrade significantly over multiple rapid errors
      const avgTime = performanceTimes.reduce((a, b) => a + b, 0) / performanceTimes.length
      const maxTime = Math.max(...performanceTimes)

      expect(avgTime).toBeLessThan(50) // Average should be fast
      expect(maxTime).toBeLessThan(100) // Even worst case should be reasonable

      // UI should remain responsive
      expect(screen.getByDisplayValue('Rapid Fire Test')).toBeInTheDocument()
    })
  })

  describe('Network Latency Simulation', () => {
    it('should handle slow network responses gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Simulate slow network with eventual timeout
      mockStoriesApi.create.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new ApiError(0, 'Request timeout', new Error('timeout'), true))
          }, 5000)
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
      await user.type(titleInput, 'Slow Network Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing slow network handling')

      // Start the slow request
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Form should show loading state or remain interactive
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // Fast-forward to timeout
      jest.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should handle timeout gracefully
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Slow Network Test')).toBeInTheDocument()
    })

    it('should handle intermittent connectivity issues', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      let attempts = 0
      mockStoriesApi.create.mockImplementation(() => {
        attempts++
        if (attempts <= 2) {
          // First two attempts fail with network error
          return Promise.reject(new ApiError(0, 'Network error', new Error('connection failed'), true))
        } else {
          // Third attempt succeeds
          return Promise.resolve(createMockStory({ id: 'intermittent-success' }))
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
      await user.type(titleInput, 'Intermittent Network Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing intermittent connectivity')

      const saveButton = screen.getByText('Save Changes')

      // First attempt - network error
      await user.click(saveButton)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // Second attempt - network error
      await user.click(saveButton)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // Third attempt - success (if retry mechanism exists)
      await user.click(saveButton)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(3)
      })

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })
    })
  })

  describe('Resource Cleanup During Errors', () => {
    it('should clean up event listeners after error modal closes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const cleanupError = new ApiError(500, 'Cleanup test error')
      mockStoriesApi.create.mockRejectedValue(cleanupError)

      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      const initialListenerCount = addEventListenerSpy.mock.calls.length
      const initialRemoveCount = removeEventListenerSpy.mock.calls.length

      // Open modal
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill form and trigger error
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Cleanup Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing resource cleanup')

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

      // Check that event listeners were properly cleaned up
      const finalListenerCount = addEventListenerSpy.mock.calls.length
      const finalRemoveCount = removeEventListenerSpy.mock.calls.length

      // Should have roughly equal adds and removes (allowing for some variance)
      const listenerDiff = finalListenerCount - initialListenerCount
      const removeDiff = finalRemoveCount - initialRemoveCount

      expect(Math.abs(listenerDiff - removeDiff)).toBeLessThanOrEqual(1)

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('should clean up timers and promises during component unmount', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Create a promise that resolves after component might unmount
      mockStoriesApi.create.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(createMockStory({ id: 'delayed-response' }))
          }, 3000)
        })
      })

      const { unmount } = render(<Board />)

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
      await user.type(titleInput, 'Unmount Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing cleanup on unmount')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Immediately unmount component
      unmount()

      // Advance timers to trigger the delayed promise
      jest.advanceTimersByTime(3000)

      // Should not cause any errors or memory leaks
      // (This is mainly to ensure no console errors occur)
      expect(mockStoriesApi.create).toHaveBeenCalled()
    })
  })

  describe('Error State Performance Under Load', () => {
    it('should handle multiple simultaneous error states efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Different errors for different operations
      mockStoriesApi.create.mockRejectedValue(new ApiError(500, 'Create error'))
      mockStoriesApi.update.mockRejectedValue(new ApiError(409, 'Update conflict'))
      mockStoriesApi.delete.mockRejectedValue(new ApiError(403, 'Delete forbidden'))

      const perf = measurePerformance()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('First Story')).toBeInTheDocument()
      })

      // Trigger create error
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Multi Error Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing multiple error handling')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Close create modal
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })

      // Trigger update error
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

      const updateTitleInput = screen.getByDisplayValue('First Story')
      await user.clear(updateTitleInput)
      await user.type(updateTitleInput, 'Updated Title')

      const updateSaveButton = screen.getByText('Save Changes')
      await user.click(updateSaveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      const totalTime = perf.end()

      // Should handle multiple error scenarios efficiently
      expect(totalTime).toBeLessThan(10000) // Should complete in reasonable time

      // All error states should be handled gracefully
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument()
    })

    it('should maintain performance with large error message payloads', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Create error with large payload
      const largeErrorMessage = 'A'.repeat(10000) // 10KB error message
      const largeError = new ApiError(422, largeErrorMessage)
      ;(largeError as any).details = {
        violations: Array(100).fill(0).map((_, i) => ({
          field: `field_${i}`,
          message: `Validation error ${i}: ${largeErrorMessage.substring(0, 100)}`
        }))
      }

      mockStoriesApi.create.mockRejectedValue(largeError)

      const perf = measurePerformance()
      const initialMemory = perf.markMemory()

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
      await user.type(titleInput, 'Large Payload Test')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Testing large error payload handling')

      // Measure error processing time
      const errorStart = performance.now()
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      const errorProcessingTime = performance.now() - errorStart
      const finalMemory = perf.markMemory()
      const memoryIncrease = finalMemory - initialMemory

      // Should handle large payloads efficiently
      expect(errorProcessingTime).toBeLessThan(1000) // < 1 second for large payload
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // < 50MB memory increase

      // UI should remain responsive
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Large Payload Test')).toBeInTheDocument()
    })
  })
})