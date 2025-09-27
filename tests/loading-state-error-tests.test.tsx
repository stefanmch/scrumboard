/**
 * Loading State and Error Management Tests
 * Tests proper loading state management during errors and async operations
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '@/components/board/Board'
import { createMockStory } from '@/__tests__/utils/test-utils'
import { ApiError } from '@/lib/api'

// Import test utilities
import {
  ModalTestUtils,
  ErrorTestUtils,
  AsyncTestUtils,
  FormTestUtils
} from './test-utilities/error-testing-utils'

// Import mocks
import '../apps/web/src/__tests__/mocks/api'
import '../apps/web/src/__tests__/mocks/dnd-kit'
import { mockStoriesApi, resetApiMocks } from '../apps/web/src/__tests__/mocks/api'

describe('Loading State and Error Management Tests', () => {
  const setupModalEnvironment = () => {
    const modalRoot = document.createElement('div')
    modalRoot.setAttribute('id', 'modal-root')
    document.body.appendChild(modalRoot)
  }

  const cleanupModalEnvironment = () => {
    const modalRoot = document.getElementById('modal-root')
    if (modalRoot) {
      document.body.removeChild(modalRoot)
    }
    document.body.style.overflow = ''
  }

  beforeEach(() => {
    resetApiMocks()
    setupModalEnvironment()
    jest.clearAllTimers()
    jest.useFakeTimers()

    // Setup default successful responses
    mockStoriesApi.getAll.mockResolvedValue([
      createMockStory({
        id: 'story-1',
        title: 'Test Story 1',
        status: 'TODO'
      }),
      createMockStory({
        id: 'story-2',
        title: 'Test Story 2',
        status: 'IN_PROGRESS'
      })
    ])
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    cleanupModalEnvironment()
  })

  describe('Loading States During Normal Operations', () => {
    it('should show loading state while creating a story', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Simulate slow API response
      mockStoriesApi.create.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockStory({ id: 'slow-create' }))
          }, 1000)
        })
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Loading Test Story',
        'Add your story description here...': 'Testing loading states'
      })

      const saveButton = screen.getByText('Create Story')

      // Start the save operation
      await user.click(saveButton)

      // Verify loading state appears
      await waitFor(() => {
        expect(saveButton).toBeDisabled()
      })

      // Look for loading indicators (text or visual)
      const loadingIndicators = screen.queryAllByText(/saving|creating|loading/i)
      expect(loadingIndicators.length).toBeGreaterThan(0)

      // Advance time to complete the operation
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Wait for completion
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Modal should close after successful save
      await ModalTestUtils.waitForModalToClose('Create Story')
    })

    it('should manage button states during update operations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Simulate slow update
      mockStoriesApi.update.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockStory({ id: 'story-1', title: 'Updated Story' }))
          }, 800)
        })
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      // Open edit modal
      const storyCard = screen.getByText('Test Story 1')
      const storyContainer = storyCard.closest('.group')!

      act(() => {
        fireEvent.mouseEnter(storyContainer)
      })

      await waitFor(() => {
        const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await ModalTestUtils.waitForModalToOpen('Edit Story')

      // Modify the story
      const titleInput = screen.getByDisplayValue('Test Story 1')
      await user.clear(titleInput)
      await user.type(titleInput, 'Loading State Update Test')

      const saveButton = screen.getByText('Save Changes')

      // Test button state management during async operation
      await AsyncTestUtils.verifyButtonDisabledDuringAsync(
        saveButton,
        async () => {
          await user.click(saveButton)
          act(() => {
            jest.advanceTimersByTime(800)
          })
        }
      )

      await ModalTestUtils.waitForModalToClose('Edit Story')
    })

    it('should handle concurrent loading states properly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Setup multiple slow operations
      mockStoriesApi.create.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockStory({ id: 'concurrent-1' }))
          }, 1000)
        })
      })

      mockStoriesApi.update.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockStory({ id: 'story-1', title: 'Concurrent Update' }))
          }, 800)
        })
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      // Start first operation (create)
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Concurrent Test 1',
        'Add your story description here...': 'First concurrent operation'
      })

      const createButton = screen.getByText('Create Story')
      await user.click(createButton)

      // Start second operation (edit) - should be handled independently
      const storyCard = screen.getByText('Test Story 1')
      const storyContainer = storyCard.closest('.group')!

      act(() => {
        fireEvent.mouseEnter(storyContainer)
      })

      await waitFor(() => {
        const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      // Each operation should manage its own loading state
      const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await ModalTestUtils.waitForModalToOpen('Edit Story')

      const titleInput = screen.getByDisplayValue('Test Story 1')
      await user.clear(titleInput)
      await user.type(titleInput, 'Concurrent Update Test')

      const updateButton = screen.getByText('Save Changes')
      await user.click(updateButton)

      // Both operations should be loading independently
      expect(createButton).toBeDisabled()
      expect(updateButton).toBeDisabled()

      // Complete operations
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })
    })
  })

  describe('Loading States During Error Scenarios', () => {
    it('should properly restore button state after network errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Simulate network error after delay
      mockStoriesApi.create.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(ErrorTestUtils.createApiError.network())
          }, 500)
        })
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Network Error Loading Test',
        'Add your story description here...': 'Testing loading state recovery'
      })

      const saveButton = screen.getByText('Create Story')

      // Button should be enabled initially
      expect(saveButton).toBeEnabled()

      // Click and verify loading state
      await user.click(saveButton)

      await waitFor(() => {
        expect(saveButton).toBeDisabled()
      })

      // Complete the operation (error)
      act(() => {
        jest.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Button should be enabled again for retry
      await waitFor(() => {
        expect(saveButton).toBeEnabled()
      })

      // Modal should stay open
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
    })

    it('should handle loading state during validation errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Simulate validation error after processing time
      mockStoriesApi.update.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(ErrorTestUtils.createApiError.validation('Invalid data'))
          }, 300)
        })
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      // Open edit modal
      const storyCard = screen.getByText('Test Story 1')
      const storyContainer = storyCard.closest('.group')!

      act(() => {
        fireEvent.mouseEnter(storyContainer)
      })

      await waitFor(() => {
        const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await ModalTestUtils.waitForModalToOpen('Edit Story')

      const titleInput = screen.getByDisplayValue('Test Story 1')
      await user.clear(titleInput)
      await user.type(titleInput, 'Validation Error Test')

      const saveButton = screen.getByText('Save Changes')

      // Test loading cycle with validation error
      await AsyncTestUtils.verifyLoadingStates(
        async () => {
          await user.click(saveButton)
          act(() => {
            jest.advanceTimersByTime(300)
          })
        },
        /saving|updating/i
      )

      // After error, button should be enabled for retry
      await waitFor(() => {
        expect(saveButton).toBeEnabled()
      })

      // Modal should remain open
      expect(screen.getByRole('heading', { name: 'Edit Story' })).toBeInTheDocument()
    })

    it('should manage loading states during server errors with retries', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // First call fails, second succeeds
      mockStoriesApi.create
        .mockImplementationOnce(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(ErrorTestUtils.createApiError.serverError())
            }, 400)
          })
        })
        .mockImplementationOnce(() => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(createMockStory({ id: 'retry-success' }))
            }, 300)
          })
        })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Server Error Retry Test',
        'Add your story description here...': 'Testing retry loading states'
      })

      let saveButton = screen.getByText('Create Story')

      // First attempt - server error
      await user.click(saveButton)

      await waitFor(() => {
        expect(saveButton).toBeDisabled()
      })

      act(() => {
        jest.advanceTimersByTime(400)
      })

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Button should be enabled again
      await waitFor(() => {
        expect(saveButton).toBeEnabled()
      })

      // Second attempt - success
      saveButton = screen.getByText('Create Story')

      await AsyncTestUtils.verifyLoadingStates(
        async () => {
          await user.click(saveButton)
          act(() => {
            jest.advanceTimersByTime(300)
          })
        },
        /saving|creating/i
      )

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      await ModalTestUtils.waitForModalToClose('Create Story')
    })
  })

  describe('Loading State Visual Feedback', () => {
    it('should provide clear visual feedback during loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockStoriesApi.create.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockStory({ id: 'visual-feedback' }))
          }, 600)
        })
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Visual Feedback Test',
        'Add your story description here...': 'Testing visual loading feedback'
      })

      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      // Should show loading state
      await waitFor(() => {
        expect(saveButton).toBeDisabled()
      })

      // Look for loading indicators
      const possibleLoadingStates = [
        /saving|creating|loading/i,
        /please wait/i,
        /processing/i
      ]

      let foundLoadingIndicator = false
      for (const pattern of possibleLoadingStates) {
        const elements = screen.queryAllByText(pattern)
        if (elements.length > 0) {
          foundLoadingIndicator = true
          break
        }
      }

      // Should have some form of loading indication
      expect(foundLoadingIndicator || saveButton.textContent !== 'Create Story').toBe(true)

      // Complete operation
      act(() => {
        jest.advanceTimersByTime(600)
      })

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      await ModalTestUtils.waitForModalToClose('Create Story')
    })

    it('should handle loading state interruptions gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      mockStoriesApi.create.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockStory({ id: 'interrupted' }))
          }, 1000)
        })
      })

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Interruption Test',
        'Add your story description here...': 'Testing loading interruption'
      })

      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      // Verify loading state
      await waitFor(() => {
        expect(saveButton).toBeDisabled()
      })

      // Try to interrupt with cancel
      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeEnabled() // Cancel should remain available

      // Complete the operation normally
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      await ModalTestUtils.waitForModalToClose('Create Story')
    })
  })

  describe('Loading State Performance', () => {
    it('should handle rapid successive operations efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Setup multiple quick operations
      mockStoriesApi.create
        .mockImplementationOnce(() => Promise.resolve(createMockStory({ id: 'quick-1' })))
        .mockImplementationOnce(() => Promise.resolve(createMockStory({ id: 'quick-2' })))
        .mockImplementationOnce(() => Promise.resolve(createMockStory({ id: 'quick-3' })))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      // Measure performance of rapid operations
      const { time } = await AsyncTestUtils.measureRenderTime(async () => {
        // First operation
        let addButtons = screen.getAllByTitle('Add new story')
        await user.click(addButtons[0])

        await ModalTestUtils.waitForModalToOpen('Create Story')

        await FormTestUtils.fillForm({
          'New Story': 'Rapid Test 1',
          'Add your story description here...': 'First rapid operation'
        })

        let saveButton = screen.getByText('Create Story')
        await user.click(saveButton)

        await waitFor(() => {
          expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
        })

        await ModalTestUtils.waitForModalToClose('Create Story')

        // Second operation
        addButtons = screen.getAllByTitle('Add new story')
        await user.click(addButtons[0])

        await ModalTestUtils.waitForModalToOpen('Create Story')

        await FormTestUtils.fillForm({
          'New Story': 'Rapid Test 2',
          'Add your story description here...': 'Second rapid operation'
        })

        saveButton = screen.getByText('Create Story')
        await user.click(saveButton)

        await waitFor(() => {
          expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
        })

        await ModalTestUtils.waitForModalToClose('Create Story')
      })

      // Should handle rapid operations efficiently (under 2 seconds for 2 operations)
      expect(time).toBeLessThan(2000)
    })

    it('should not accumulate loading state issues over multiple operations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Mix of successful and failed operations
      mockStoriesApi.create
        .mockResolvedValueOnce(createMockStory({ id: 'success-1' }))
        .mockRejectedValueOnce(ErrorTestUtils.createApiError.network())
        .mockResolvedValueOnce(createMockStory({ id: 'success-2' }))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      for (let i = 0; i < 3; i++) {
        const addButtons = screen.getAllByTitle('Add new story')
        await user.click(addButtons[0])

        await ModalTestUtils.waitForModalToOpen('Create Story')

        await FormTestUtils.fillForm({
          'New Story': `Accumulation Test ${i + 1}`,
          'Add your story description here...': `Testing operation ${i + 1}`
        })

        const saveButton = screen.getByText('Create Story')
        await user.click(saveButton)

        await waitFor(() => {
          expect(mockStoriesApi.create).toHaveBeenCalledTimes(i + 1)
        })

        if (i === 1) {
          // Second operation fails - modal should stay open
          expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

          // Cancel to close modal after error
          const cancelButton = screen.getByText('Cancel')
          await user.click(cancelButton)
        }

        if (i !== 1) {
          // Success operations should close modal
          await ModalTestUtils.waitForModalToClose('Create Story')
        }
      }

      // All operations should have completed without accumulating issues
      expect(mockStoriesApi.create).toHaveBeenCalledTimes(3)
    })
  })
})