import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteConfirmationModal } from '../DeleteConfirmationModal'
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

describe('DeleteConfirmationModal', () => {
  const mockOnClose = jest.fn()
  const mockOnConfirm = jest.fn()
  const mockStory = createMockStory({
    title: 'Story to Delete',
    description: 'This story will be deleted',
    storyPoints: 3,
    status: 'TODO',
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Modal Rendering', () => {
    it('should not render when closed', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByText('Delete Story')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('button', { name: 'Delete Story' })).toBeInTheDocument()
      expect(screen.getByText('Story to Delete')).toBeInTheDocument()
      expect(screen.getByText('This story will be deleted')).toBeInTheDocument()
    })

    it('should not render without story', () => {
      render(
        <DeleteConfirmationModal
          story={null}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByText('Delete Story')).not.toBeInTheDocument()
    })

    it('should lock body scroll when open', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  describe('Story Preview', () => {
    it('should display story details in preview', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('Story to Delete')).toBeInTheDocument()
      expect(screen.getByText('This story will be deleted')).toBeInTheDocument()
      expect(screen.getByText('3 pts')).toBeInTheDocument()
      expect(screen.getByText('To Do')).toBeInTheDocument()
    })

    it('should display correct status badge for IN_PROGRESS', () => {
      const inProgressStory = createMockStory({
        ...mockStory,
        status: 'IN_PROGRESS',
      })

      render(
        <DeleteConfirmationModal
          story={inProgressStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('should display correct status badge for DONE', () => {
      const doneStory = createMockStory({
        ...mockStory,
        status: 'DONE',
      })

      render(
        <DeleteConfirmationModal
          story={doneStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('should handle story without description', () => {
      const storyWithoutDescription = createMockStory({
        ...mockStory,
        description: undefined,
      })

      render(
        <DeleteConfirmationModal
          story={storyWithoutDescription}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('Story to Delete')).toBeInTheDocument()
      expect(screen.queryByText('This story will be deleted')).not.toBeInTheDocument()
    })

    it('should handle story without story points', () => {
      const storyWithoutPoints = createMockStory({
        ...mockStory,
        storyPoints: undefined,
      })

      render(
        <DeleteConfirmationModal
          story={storyWithoutPoints}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('Story to Delete')).toBeInTheDocument()
      expect(screen.queryByText(/pts/)).not.toBeInTheDocument()
    })
  })

  describe('Warning Messages', () => {
    it('should display confirmation message', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(
        screen.getByText('Are you sure you want to delete this story? This action cannot be undone.')
      ).toBeInTheDocument()
    })

    it('should display warning about permanent deletion', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(
        screen.getByText(/This will permanently delete the story and all associated data/)
      ).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('should call onConfirm and onClose when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const deleteButton = screen.getByRole('button', { name: 'Delete Story' })
      await user.click(deleteButton)

      expect(mockOnConfirm).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should call onClose when close (X) button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Interactions', () => {
    it('should close modal when Escape key is pressed', async () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close modal on other key presses', async () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })
      fireEvent.keyDown(window, { key: 'Tab', code: 'Tab' })

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Modal Interactions', () => {
    it('should close modal when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Click on the backdrop (the outer div)
      const backdrop = document.querySelector('[class*="fixed inset-0"]')!
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close modal when clicking inside modal content', async () => {
      const user = userEvent.setup()
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const modalContent = screen.getByText('Story to Delete')
      await user.click(modalContent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Button States', () => {
    it('should display delete button with danger styling', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const deleteButton = screen.getByRole('button', { name: 'Delete Story' })
      expect(deleteButton).toHaveClass('bg-red-600')
      expect(deleteButton).toHaveClass('text-white')
    })

    it('should display cancel button with neutral styling', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toHaveClass('bg-white')
      expect(cancelButton).toHaveClass('text-slate-700')
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label for close button', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toBeInTheDocument()
    })

    it('should display warning icon with alert triangle', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // The AlertTriangle icons should be present (one in header, one in warning)
      const warningIcons = document.querySelectorAll('svg')
      const alertTriangleIcons = Array.from(warningIcons).filter(svg =>
        svg.classList.contains('lucide-triangle-alert') ||
        svg.getAttribute('class')?.includes('triangle-alert')
      )
      expect(alertTriangleIcons.length).toBeGreaterThan(0)
    })

    it('should have proper heading structure', () => {
      render(
        <DeleteConfirmationModal
          story={mockStory}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const heading = screen.getByRole('heading', { name: 'Delete Story' })
      expect(heading).toBeInTheDocument()
    })
  })
})