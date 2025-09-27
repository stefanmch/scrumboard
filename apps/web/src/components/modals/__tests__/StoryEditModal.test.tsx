import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryEditModal } from '../StoryEditModal'
import { createMockStory } from '@/__tests__/utils/test-utils'

// Mock the portal for modal rendering
beforeEach(() => {
  const modalRoot = document.createElement('div')
  modalRoot.setAttribute('id', 'modal-root')
  document.body.appendChild(modalRoot)
})

afterEach(() => {
  const modalRoot = document.getElementById('modal-root')
  if (modalRoot) {
    document.body.removeChild(modalRoot)
  }
  document.body.style.overflow = ''
})

describe('StoryEditModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()
  const mockStory = createMockStory({
    title: 'Test Story',
    description: 'Test Description',
    storyPoints: 5,
    assigneeId: 'user-1',
    status: 'TODO',
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnSave.mockResolvedValue(undefined)
    // Mock window.confirm for unsaved changes tests
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    // Restore window.confirm mock
    jest.restoreAllMocks()
  })

  describe('Modal Rendering', () => {
    it('should not render when closed', () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
    })

    it('should not render without story', () => {
      render(
        <StoryEditModal
          story={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
    })

    it('should lock body scroll when open', () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  describe('Form Fields', () => {
    it('should display all form fields with correct values', async () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Story')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
        expect(screen.getByDisplayValue('user-1')).toBeInTheDocument()
      })

      // Use more specific selector for the select elements
      const storyPointsSelect = screen.getByLabelText(/story points/i)
      expect(storyPointsSelect).toHaveValue('5')

      const statusSelect = screen.getByLabelText(/status/i)
      expect(statusSelect).toHaveValue('TODO')
    })

    it('should update form fields when typing', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('Test Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Story')

      expect(screen.getByDisplayValue('Updated Story')).toBeInTheDocument()
    })

    it('should mark required fields', () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const titleInput = screen.getByLabelText(/Story Title \*/)
      const descriptionInput = screen.getByLabelText(/Description \*/)

      expect(titleInput).toBeRequired()
      expect(descriptionInput).toBeRequired()
    })
  })

  describe('Form Validation', () => {
    it('should disable save button with default content', () => {
      const defaultStory = createMockStory({
        title: 'New Story',
        description: 'Add your story description here...',
      })

      render(
        <StoryEditModal
          story={defaultStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const saveButton = screen.getByText('Save Changes')
      expect(saveButton).toBeDisabled()
    })

    it('should disable save button with empty title', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('Test Story')
      await user.clear(titleInput)

      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes')
        expect(saveButton).toBeDisabled()
      })
    })

    it('should disable save button with empty description', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
      })

      const descriptionInput = screen.getByDisplayValue('Test Description')
      await user.clear(descriptionInput)

      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes')
        expect(saveButton).toBeDisabled()
      })
    })

    it('should enable save button with valid content', async () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes')
        expect(saveButton).toBeEnabled()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSave with updated story data when form is submitted', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('Test Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Story')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            ...mockStory,
            title: 'Updated Story',
            updatedAt: expect.any(Date),
          })
        )
      })
    })

    it('should close modal after successful save', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should not close modal if save fails', async () => {
      const user = userEvent.setup()
      mockOnSave.mockRejectedValue(new Error('Save failed'))

      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should not submit form with invalid data', async () => {
      const user = userEvent.setup()
      const defaultStory = createMockStory({
        title: 'New Story',
        description: 'Add your story description here...',
      })

      render(
        <StoryEditModal
          story={defaultStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Interactions', () => {
    it('should close modal when Escape key is pressed', async () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should submit form when Enter key is pressed in form field', async () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const titleInput = screen.getByDisplayValue('Test Story')
      fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should prevent Enter key default behavior', async () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const titleInput = screen.getByDisplayValue('Test Story')
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault')

      fireEvent(titleInput, enterEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Modal Interactions', () => {
    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const modal = screen.getByRole('dialog')
      const cancelButton = within(modal).getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close modal when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Click on the backdrop (the outer div)
      const backdrop = screen.getByText('Edit Story').closest('[class*="fixed inset-0"]')!
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close modal when clicking inside modal content', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const modalContent = screen.getByDisplayValue('Test Story')
      await user.click(modalContent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Story Points Selection', () => {
    it('should display story points options', async () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        const storyPointsSelect = screen.getByLabelText(/story points/i)
        expect(storyPointsSelect).toBeInTheDocument()
        expect(storyPointsSelect).toHaveValue('5')
      })

      // Check if options are available (you might need to open the select first)
      expect(screen.getByText('5 points')).toBeInTheDocument()
    })

    it('should update story points when changed', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/story points/i)).toBeInTheDocument()
      })

      const storyPointsSelect = screen.getByLabelText(/story points/i)
      await user.selectOptions(storyPointsSelect, '8')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            storyPoints: 8,
          })
        )
      })
    })
  })

  describe('Status Selection', () => {
    it('should display status options', async () => {
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        const statusSelect = screen.getByLabelText(/status/i)
        expect(statusSelect).toBeInTheDocument()
        expect(statusSelect).toHaveValue('TODO')
      })
    })

    it('should update status when changed', async () => {
      const user = userEvent.setup()
      render(
        <StoryEditModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
      })

      const statusSelect = screen.getByLabelText(/status/i)
      await user.selectOptions(statusSelect, 'IN_PROGRESS')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'IN_PROGRESS',
          })
        )
      })
    })
  })
})