/**
 * User Experience Error Tests
 * Focus on user-friendly error messages, retry functionality, and cancel behavior
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
  FormTestUtils,
  TestPatterns
} from './test-utilities/error-testing-utils'

// Import mocks
import '../apps/web/src/__tests__/mocks/api'
import '../apps/web/src/__tests__/mocks/dnd-kit'
import { mockStoriesApi, resetApiMocks } from '../apps/web/src/__tests__/mocks/api'

describe('User Experience Error Tests', () => {
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
    cleanupModalEnvironment()
  })

  describe('User-Friendly Error Messages', () => {
    it('should display simple, actionable error messages instead of technical details', async () => {
      const user = userEvent.setup()

      // Technical server error that should be translated to user-friendly message
      const technicalError = new Error('ERR_CONNECTION_REFUSED: ECONNREFUSED 127.0.0.1:3001')
      mockStoriesApi.create.mockRejectedValue(technicalError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'User Friendly Error Test',
        'Add your story description here...': 'Testing user-friendly error display'
      })

      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should show user-friendly message, not technical details
      const errorElements = screen.queryAllByText(/connection.*refused|ECONNREFUSED|127\.0\.0\.1/i)
      expect(errorElements).toHaveLength(0)

      // Should show actionable, friendly message instead
      ErrorTestUtils.verifyErrorMessage(/unable.*save|try again|connection.*problem/i, true)
    })

    it('should provide contextual help for different error scenarios', async () => {
      const user = userEvent.setup()

      const testContextualHelp = async (
        error: any,
        operation: 'create' | 'update' | 'delete',
        expectedContext: RegExp
      ) => {
        if (operation === 'create') {
          mockStoriesApi.create.mockRejectedValueOnce(error)
        } else if (operation === 'update') {
          mockStoriesApi.update.mockRejectedValueOnce(error)
        } else {
          mockStoriesApi.delete.mockRejectedValueOnce(error)
        }

        render(<Board />)

        await waitFor(() => {
          expect(screen.getByText('Test Story 1')).toBeInTheDocument()
        })

        if (operation === 'create') {
          const addButtons = screen.getAllByTitle('Add new story')
          await user.click(addButtons[0])

          await ModalTestUtils.waitForModalToOpen('Create Story')

          await FormTestUtils.fillForm({
            'New Story': 'Contextual Help Test',
            'Add your story description here...': 'Testing contextual error help'
          })

          const saveButton = screen.getByText('Create Story')
          await user.click(saveButton)
        } else if (operation === 'update') {
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
          await user.type(titleInput, 'Updated Story')

          const saveButton = screen.getByText('Save Changes')
          await user.click(saveButton)
        } else {
          // Delete operation
          const storyCard = screen.getByText('Test Story 1')
          const storyContainer = storyCard.closest('.group')!

          act(() => {
            fireEvent.mouseEnter(storyContainer)
          })

          await waitFor(() => {
            const deleteButton = within(storyContainer as HTMLElement).getByTitle('Delete story')
            expect(deleteButton).toBeInTheDocument()
          })

          const deleteButton = within(storyContainer as HTMLElement).getByTitle('Delete story')
          await user.click(deleteButton)

          await waitFor(() => {
            expect(screen.getByText('Delete Story')).toBeInTheDocument()
          })

          const confirmButton = screen.getByRole('button', { name: /Delete Story/i })
          await user.click(confirmButton)
        }

        await waitFor(() => {
          if (operation === 'create') {
            expect(mockStoriesApi.create).toHaveBeenCalled()
          } else if (operation === 'update') {
            expect(mockStoriesApi.update).toHaveBeenCalled()
          } else {
            expect(mockStoriesApi.delete).toHaveBeenCalled()
          }
        })

        // Should show contextual help message
        ErrorTestUtils.verifyErrorMessage(expectedContext, true)

        // Clean up for next test
        const modalDialog = screen.queryByRole('dialog')
        if (modalDialog) {
          const cancelButton = screen.queryByText('Cancel') || screen.queryByLabelText('Close modal')
          if (cancelButton) {
            await user.click(cancelButton)
          }
        }
      }

      // Test contextual help for different operations
      await testContextualHelp(
        ErrorTestUtils.createApiError.network(),
        'create',
        /creating.*story|check.*connection|new story/i
      )

      await testContextualHelp(
        ErrorTestUtils.createApiError.forbidden(),
        'update',
        /updating.*story|permission.*edit|save.*changes/i
      )

      await testContextualHelp(
        ErrorTestUtils.createApiError.serverError(),
        'delete',
        /deleting.*story|remove.*story|try.*again/i
      )
    })

    it('should avoid technical jargon in error messages', async () => {
      const user = userEvent.setup()

      const technicalErrors = [
        new Error('HTTP 500 Internal Server Error'),
        new Error('TypeError: Cannot read property of undefined'),
        new Error('Promise rejected with status 422'),
        new Error('XMLHttpRequest failed'),
        new Error('CORS policy error')
      ]

      for (const error of technicalErrors) {
        mockStoriesApi.create.mockRejectedValueOnce(error)

        render(<Board />)

        await waitFor(() => {
          expect(screen.getByText('Test Story 1')).toBeInTheDocument()
        })

        const addButtons = screen.getAllByTitle('Add new story')
        await user.click(addButtons[0])

        await ModalTestUtils.waitForModalToOpen('Create Story')

        await FormTestUtils.fillForm({
          'New Story': 'Technical Jargon Test',
          'Add your story description here...': 'Testing jargon-free messages'
        })

        const saveButton = screen.getByText('Create Story')
        await user.click(saveButton)

        await waitFor(() => {
          expect(mockStoriesApi.create).toHaveBeenCalled()
        })

        // Should not contain technical terms
        const technicalTerms = screen.queryAllByText(
          /HTTP|TypeError|XMLHttpRequest|CORS|Promise|status \d+|undefined|property/i
        )
        expect(technicalTerms).toHaveLength(0)

        // Should use friendly language
        const friendlyElements = screen.queryAllByText(
          /unable|try again|something went wrong|please|help/i
        )
        expect(friendlyElements.length).toBeGreaterThan(0)

        // Close modal for next iteration
        const cancelButton = screen.getByText('Cancel')
        await user.click(cancelButton)

        await ModalTestUtils.waitForModalToClose('Create Story')
      }
    })
  })

  describe('Retry Functionality', () => {
    it('should provide clear retry options after save failures', async () => {
      const user = userEvent.setup()

      const networkError = ErrorTestUtils.createApiError.network()
      const successResponse = createMockStory({ id: 'retry-success' })

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
        'New Story': 'Retry Test Story',
        'Add your story description here...': 'Testing retry functionality'
      })

      // First attempt - failure
      let saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Should show error and keep modal open
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // Retry functionality testing
      await ErrorTestUtils.testRetryFunctionality(
        'Create Story', // The button text itself acts as retry
        mockStoriesApi.create,
        successResponse
      )

      // Should close modal after successful retry
      await ModalTestUtils.waitForModalToClose('Create Story')
    })

    it('should maintain form data during retry attempts', async () => {
      const user = userEvent.setup()

      const temporaryError = ErrorTestUtils.createApiError.serverError()
      mockStoriesApi.update
        .mockRejectedValueOnce(temporaryError)
        .mockRejectedValueOnce(temporaryError)
        .mockResolvedValueOnce(createMockStory({ id: 'persistent-data' }))

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

      // Make changes
      const titleInput = screen.getByDisplayValue('Test Story 1')
      const descriptionInput = screen.getByDisplayValue(/description/i)

      await user.clear(titleInput)
      await user.type(titleInput, 'Persistent Data Test')

      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'This data should persist through retries')

      // First attempt - fail
      let saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalledTimes(1)
      })

      // Verify data is preserved
      expect(screen.getByDisplayValue('Persistent Data Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('This data should persist through retries')).toBeInTheDocument()

      // Second attempt - fail
      saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalledTimes(2)
      })

      // Data should still be preserved
      expect(screen.getByDisplayValue('Persistent Data Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('This data should persist through retries')).toBeInTheDocument()

      // Third attempt - success
      saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalledTimes(3)
      })

      await ModalTestUtils.waitForModalToClose('Edit Story')
    })

    it('should handle rapid retry attempts gracefully', async () => {
      const user = userEvent.setup()

      const networkError = ErrorTestUtils.createApiError.network()
      mockStoriesApi.create.mockRejectedValue(networkError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Rapid Retry Test',
        'Add your story description here...': 'Testing rapid retry handling'
      })

      // Multiple rapid retry attempts
      const saveButton = screen.getByText('Create Story')

      // First attempt
      await user.click(saveButton)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Rapid second attempt (should be handled gracefully)
      await user.click(saveButton)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Rapid third attempt
      await user.click(saveButton)
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(3)
      })

      // Should still show error and maintain form state
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      expect(screen.getByDisplayValue('Rapid Retry Test')).toBeInTheDocument()
    })
  })

  describe('Cancel Functionality After Errors', () => {
    it('should allow users to cancel after save failures', async () => {
      const user = userEvent.setup()

      const permanentError = ErrorTestUtils.createApiError.serverError()
      mockStoriesApi.create.mockRejectedValue(permanentError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Cancel After Error Test',
        'Add your story description here...': 'Testing cancel after error'
      })

      // Attempt save - will fail
      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should show error state
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // Cancel button should be available and functional
      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeEnabled()

      await user.click(cancelButton)

      // Should close modal
      await ModalTestUtils.waitForModalToClose('Create Story')

      // Should not create story
      expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
    })

    it('should handle escape key cancellation after errors', async () => {
      const user = userEvent.setup()

      const validationError = ErrorTestUtils.createApiError.validation()
      mockStoriesApi.update.mockRejectedValue(validationError)

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

      // Make changes and save (will fail)
      const titleInput = screen.getByDisplayValue('Test Story 1')
      await user.clear(titleInput)
      await user.type(titleInput, 'Escape Test')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Should show error state
      expect(screen.getByRole('heading', { name: 'Edit Story' })).toBeInTheDocument()

      // Escape key should close modal even after error
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

      await ModalTestUtils.waitForModalToClose('Edit Story')
    })

    it('should provide clear cancel options in error states', async () => {
      const user = userEvent.setup()

      const rateLimitError = ErrorTestUtils.createApiError.rateLimit()
      mockStoriesApi.create.mockRejectedValue(rateLimitError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Clear Cancel Options Test',
        'Add your story description here...': 'Testing clear cancel options'
      })

      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should show multiple ways to cancel
      const cancelButton = screen.getByText('Cancel')
      const closeButton = screen.getByLabelText('Close modal')

      expect(cancelButton).toBeVisible()
      expect(cancelButton).toBeEnabled()
      expect(closeButton).toBeVisible()
      expect(closeButton).toBeEnabled()

      // Both should work
      await user.click(cancelButton)
      await ModalTestUtils.waitForModalToClose('Create Story')
    })
  })

  describe('Error State Visual Feedback', () => {
    it('should provide clear visual feedback for error states', async () => {
      const user = userEvent.setup()

      const serverError = ErrorTestUtils.createApiError.serverError()
      mockStoriesApi.create.mockRejectedValue(serverError)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await ModalTestUtils.waitForModalToOpen('Create Story')

      await FormTestUtils.fillForm({
        'New Story': 'Visual Feedback Test',
        'Add your story description here...': 'Testing visual error feedback'
      })

      const saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Should maintain visual state of modal
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // Form fields should maintain their values
      expect(screen.getByDisplayValue('Visual Feedback Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Testing visual error feedback')).toBeInTheDocument()

      // Save button should be available for retry
      expect(screen.getByText('Create Story')).toBeEnabled()
    })

    it('should handle form validation states during error recovery', async () => {
      const user = userEvent.setup()

      const validationError = ErrorTestUtils.createApiError.validation()
      const successResponse = createMockStory({ id: 'validation-recovery' })

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

      // Fill with invalid data initially
      await FormTestUtils.fillForm({
        'New Story': 'X', // Too short
        'Add your story description here...': 'Valid description'
      })

      // First attempt - validation error
      let saveButton = screen.getByText('Create Story')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Fix validation issue
      const titleInput = screen.getByDisplayValue('X')
      await user.clear(titleInput)
      await user.type(titleInput, 'Valid Title Now')

      // Button should become enabled again
      saveButton = screen.getByText('Create Story')
      expect(saveButton).toBeEnabled()

      // Second attempt - success
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      await ModalTestUtils.waitForModalToClose('Create Story')
    })
  })
})