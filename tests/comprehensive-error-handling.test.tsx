/**
 * Comprehensive Error Handling Tests for Issue #15
 * Tests network vs API errors, different error codes, consecutive failures, and recovery scenarios
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '@/components/board/Board'
import { StoryEditModal } from '@/components/modals/StoryEditModal'
import { createMockStory } from '@/__tests__/utils/test-utils'
import { ApiError } from '@/lib/api'

// Import test utilities
import {
  ModalTestUtils,
  ErrorTestUtils,
  AsyncTestUtils,
  FormTestUtils,
  TestPatterns
} from './test-utilities/error-testing-utils'

// Import mocks
import '../apps/web/src/__tests__/mocks/api'
import '../apps/web/src/__tests__/mocks/dnd-kit'
import { mockStoriesApi, resetApiMocks } from '../apps/web/src/__tests__/mocks/api'

describe('Comprehensive Error Handling Tests', () => {
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

  describe('Network vs API Error Differentiation', () => {
    it('should handle network connectivity errors differently from API errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Test network error (no internet, DNS failure, etc.)
      const networkError = ErrorTestUtils.createApiError.network('Failed to connect to server')
      mockStoriesApi.create.mockRejectedValue(networkError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      // Open create modal
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      // Fill valid form data
      await FormTestUtils.fillForm({
        'New Story': 'Network Test Story',
        'Add your story description here...': 'Testing network error handling'
      })

      // Attempt to save
      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      // Verify network error handling
      await TestPatterns.testErrorHandling(
        async () => {
          await waitFor(() => {
            expect(mockStoriesApi.create).toHaveBeenCalled()
          })
        },
        'network',
        {
          modalStaysOpen: true,
          showsErrorMessage: true,
          showsUserFriendlyMessage: true,
          allowsRetry: true
        }
      )

      // Modal should stay open for retry
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
    })

    it('should handle API business logic errors appropriately', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Test API validation error (business logic)
      const validationError = ErrorTestUtils.createApiError.validation(
        'Validation failed',
        {
          title: ['Title must be unique'],
          assignee: ['Assignee does not exist']
        }
      )
      mockStoriesApi.create.mockRejectedValue(validationError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Duplicate Story Title',
        'Add your story description here...': 'This will trigger validation error'
      })

      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await TestPatterns.testErrorHandling(
        async () => {
          await waitFor(() => {
            expect(mockStoriesApi.create).toHaveBeenCalled()
          })
        },
        'validation',
        {
          modalStaysOpen: true,
          showsErrorMessage: true,
          showsUserFriendlyMessage: true
        }
      )
    })
  })

  describe('HTTP Error Code Handling', () => {
    const testErrorCode = async (
      errorCode: number,
      errorType: keyof typeof ErrorTestUtils.createApiError,
      expectedBehavior: any
    ) => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const error = ErrorTestUtils.createApiError[errorType]()
      mockStoriesApi.update.mockRejectedValue(error)

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

      // Modify story
      const titleInput = screen.getByDisplayValue('Test Story 1')
      await user.clear(titleInput)
      await user.type(titleInput, `Modified Story ${errorCode}`)

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Verify error handling based on code
      if (expectedBehavior.modalStaysOpen) {
        expect(screen.getByRole('heading', { name: 'Edit Story' })).toBeInTheDocument()
      }

      if (expectedBehavior.showsSpecificMessage) {
        ErrorTestUtils.verifyErrorMessage(expectedBehavior.showsSpecificMessage)
      }
    }

    it('should handle 400 Bad Request errors', async () => {
      await testErrorCode(400, 'validation', {
        modalStaysOpen: true,
        showsSpecificMessage: /invalid|validation|bad request/i
      })
    })

    it('should handle 401 Unauthorized errors', async () => {
      await testErrorCode(401, 'unauthorized', {
        modalStaysOpen: true,
        showsSpecificMessage: /unauthorized|authentication|login/i
      })
    })

    it('should handle 403 Forbidden errors', async () => {
      await testErrorCode(403, 'forbidden', {
        modalStaysOpen: true,
        showsSpecificMessage: /permission|forbidden|access/i
      })
    })

    it('should handle 404 Not Found errors', async () => {
      await testErrorCode(404, 'notFound', {
        modalStaysOpen: true,
        showsSpecificMessage: /not found|does not exist/i
      })
    })

    it('should handle 500 Internal Server Error', async () => {
      await testErrorCode(500, 'serverError', {
        modalStaysOpen: true,
        showsSpecificMessage: /server error|try again|technical issue/i
      })
    })

    it('should handle 429 Rate Limiting with retry guidance', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const rateLimitError = ErrorTestUtils.createApiError.rateLimit('Too many requests', 30)
      mockStoriesApi.create.mockRejectedValue(rateLimitError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Rate Limited Story',
        'Add your story description here...': 'Testing rate limit handling'
      })

      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should show rate limit message with guidance
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      ErrorTestUtils.verifyErrorMessage(/rate limit|too many|wait|try again/i)
    })
  })

  describe('Multiple Consecutive Save Failures', () => {
    it('should handle multiple consecutive network failures gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Setup multiple failures followed by success
      const networkError = ErrorTestUtils.createApiError.network()
      mockStoriesApi.create
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(createMockStory({ id: 'success-story' }))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Persistent Story',
        'Add your story description here...': 'Testing multiple failures'
      })

      // First attempt - fail
      let saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // Second attempt - fail
      saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // Third attempt - fail
      saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(3)
      })

      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // Fourth attempt - success
      saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(4)
      })

      // Should finally close modal on success
      await ModalTestUtils.waitForModalToClose('Create Story')
    })

    it('should maintain form state across multiple save failures', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const serverError = ErrorTestUtils.createApiError.serverError()
      mockStoriesApi.create
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      const originalTitle = 'Persistent Form Data'
      const originalDescription = 'This data should persist across failures'

      await FormTestUtils.fillForm({
        'New Story': originalTitle,
        'Add your story description here...': originalDescription
      })

      // First failure
      let saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Verify form data is preserved
      expect(screen.getByDisplayValue(originalTitle)).toBeInTheDocument()
      expect(screen.getByDisplayValue(originalDescription)).toBeInTheDocument()

      // Make a small modification
      const titleInput = screen.getByDisplayValue(originalTitle)
      await user.clear(titleInput)
      await user.type(titleInput, `${originalTitle} - Modified`)

      // Second failure
      saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Verify modified data is still preserved
      expect(screen.getByDisplayValue(`${originalTitle} - Modified`)).toBeInTheDocument()
      expect(screen.getByDisplayValue(originalDescription)).toBeInTheDocument()
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should allow successful retry after network error recovery', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const networkError = ErrorTestUtils.createApiError.network()
      const successResponse = createMockStory({ id: 'recovered-story' })

      mockStoriesApi.create
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Recovery Test Story',
        'Add your story description here...': 'Testing error recovery'
      })

      // First attempt - network error
      let saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Modal should stay open
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // Second attempt - success
      saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Modal should close on success
      await ModalTestUtils.waitForModalToClose('Create Story')
    })

    it('should handle recovery from validation errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const validationError = ErrorTestUtils.createApiError.validation(
        'Title too short',
        { title: ['Must be at least 3 characters'] }
      )
      const successResponse = createMockStory({ id: 'validated-story' })

      mockStoriesApi.create
        .mockRejectedValueOnce(validationError)
        .mockResolvedValueOnce(successResponse)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      // Fill with invalid data
      await FormTestUtils.fillForm({
        'New Story': 'AB', // Too short
        'Add your story description here...': 'Valid description'
      })

      // First attempt - validation error
      let saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // Fix validation issue
      const titleInput = screen.getByDisplayValue('AB')
      await user.clear(titleInput)
      await user.type(titleInput, 'Valid Title')

      // Second attempt - success
      saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      await ModalTestUtils.waitForModalToClose('Create Story')
    })

    it('should provide clear recovery instructions for different error types', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const testRecoveryInstructions = async (
        error: any,
        expectedInstructions: RegExp
      ) => {
        mockStoriesApi.create.mockRejectedValueOnce(error)

        render(<Board />)

        await waitFor(() => {
          expect(screen.getByText('Test Story 1')).toBeInTheDocument()
        })

        const addButtons = screen.getAllByTitle('Add new story')
        await user.click(addButtons[0])

        await ModalTestUtils.waitForModalToOpen('Create Story')

        await FormTestUtils.fillForm({
          'New Story': 'Recovery Instructions Test',
          'Add your story description here...': 'Testing recovery instructions'
        })

        const saveButton = screen.getByText('Create Story')
        await user.click(saveButton)

        await waitFor(() => {
          expect(mockStoriesApi.create).toHaveBeenCalled()
        })

        // Should show appropriate recovery instructions
        ErrorTestUtils.verifyErrorMessage(expectedInstructions)

        // Close modal for next test
        const cancelButton = screen.getByText('Cancel')
        await user.click(cancelButton)

        await ModalTestUtils.waitForModalToClose('Create Story')
      }

      // Test different error types and their recovery instructions
      await testRecoveryInstructions(
        ErrorTestUtils.createApiError.network(),
        /check.*connection|try again|network/i
      )

      await testRecoveryInstructions(
        ErrorTestUtils.createApiError.rateLimit(),
        /wait|too many|rate limit/i
      )

      await testRecoveryInstructions(
        ErrorTestUtils.createApiError.serverError(),
        /server.*problem|try again|technical/i
      )
    })
  })

  describe('Loading State Management During Errors', () => {
    it('should properly manage loading states during error scenarios', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Simulate slow network with eventual error
      const networkError = ErrorTestUtils.createApiError.network()
      mockStoriesApi.create.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(networkError), 1000)
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
        'New Story': 'Loading State Test',
        'Add your story description here...': 'Testing loading during error'
      })

      const saveButton = screen.getByText('Create Story')

      // Verify loading state management
      await AsyncTestUtils.verifyButtonDisabledDuringAsync(
        saveButton,
        async () => {
          await user.click(saveButton)

          // Advance timers to trigger the timeout and error
          act(() => {
            jest.advanceTimersByTime(1000)
          })

          await waitFor(() => {
            expect(mockStoriesApi.create).toHaveBeenCalled()
          })
        }
      )

      // After error, button should be enabled again for retry
      await waitFor(() => {
        expect(saveButton).toBeEnabled()
      })
    })

    it('should show appropriate loading indicators during retry attempts', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const networkError = ErrorTestUtils.createApiError.network()
      mockStoriesApi.create
        .mockRejectedValueOnce(networkError)
        .mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve(createMockStory({ id: 'retry-success' })), 500)
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
        'New Story': 'Retry Loading Test',
        'Add your story description here...': 'Testing loading on retry'
      })

      // First attempt - immediate error
      let saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Second attempt - with loading
      saveButton = screen.getByText('Create Story')

      await AsyncTestUtils.verifyLoadingStates(
        async () => {
          await user.click(saveButton)
          act(() => {
            jest.advanceTimersByTime(500)
          })
        },
        /saving|creating/i
      )

      await ModalTestUtils.waitForModalToClose('Create Story')
    })
  })
})