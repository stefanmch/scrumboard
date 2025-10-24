import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintFormModal } from '../SprintFormModal'
import { createMockSprint, setupModalTestEnvironment } from '@/__tests__/utils/test-utils'

// Mock the Toast hook
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}))

describe('SprintFormModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()

  setupModalTestEnvironment()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create Sprint')).toBeInTheDocument()
    })
  })

  describe('Create Sprint Mode', () => {
    it('should show "Create Sprint" title when no sprint is provided', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('Create Sprint')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Sprint' })).toBeInTheDocument()
    })

    it('should initialize form with default values', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i) as HTMLInputElement
      const capacityInput = screen.getByLabelText(/Team Capacity/i) as HTMLInputElement

      expect(nameInput.value).toBe('')
      expect(capacityInput.value).toBe('40')
    })

    it('should set default date range (today + 14 days)', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const startDateInput = screen.getByLabelText(/Start Date/i) as HTMLInputElement
      const endDateInput = screen.getByLabelText(/End Date/i) as HTMLInputElement

      const today = new Date().toISOString().split('T')[0]
      const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      expect(startDateInput.value).toBe(today)
      expect(endDateInput.value).toBe(twoWeeksLater)
    })
  })

  describe('Edit Sprint Mode', () => {
    const mockSprint = createMockSprint({
      name: 'Sprint 1',
      goal: 'Complete features',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2025-11-15'),
      capacity: 50,
    })

    it('should show "Edit Sprint" title when sprint is provided', () => {
      render(
        <SprintFormModal
          sprint={mockSprint}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('Edit Sprint')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    })

    it('should pre-fill form with sprint data', () => {
      render(
        <SprintFormModal
          sprint={mockSprint}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i) as HTMLInputElement
      const goalInput = screen.getByLabelText(/Sprint Goal/i) as HTMLTextAreaElement
      const capacityInput = screen.getByLabelText(/Team Capacity/i) as HTMLInputElement

      expect(nameInput.value).toBe('Sprint 1')
      expect(goalInput.value).toBe('Complete features')
      expect(capacityInput.value).toBe('50')
    })
  })

  describe('Form Validation', () => {
    it('should require sprint name', async () => {
      const user = userEvent.setup()
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i)
      expect(nameInput).toBeRequired()
    })

    it('should require start date', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const startDateInput = screen.getByLabelText(/Start Date/i)
      expect(startDateInput).toBeRequired()
    })

    it('should require end date', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const endDateInput = screen.getByLabelText(/End Date/i)
      expect(endDateInput).toBeRequired()
    })

    it('should disable save button when form is invalid', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const saveButton = screen.getByRole('button', { name: /Create Sprint/i })

      // Empty name should disable button
      expect(saveButton).toBeDisabled()
    })

    it('should validate that end date is after start date', async () => {
      const user = userEvent.setup()
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i)
      const startDateInput = screen.getByLabelText(/Start Date/i)
      const endDateInput = screen.getByLabelText(/End Date/i)

      await user.clear(nameInput)
      await user.type(nameInput, 'Test Sprint')
      await user.clear(startDateInput)
      await user.type(startDateInput, '2025-11-15')
      await user.clear(endDateInput)
      await user.type(endDateInput, '2025-11-01')

      const saveButton = screen.getByRole('button', { name: /Create Sprint/i })
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('should call onSave with form data when submitted', async () => {
      const user = userEvent.setup()
      mockOnSave.mockResolvedValue(undefined)

      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i)
      const goalInput = screen.getByLabelText(/Sprint Goal/i)
      const capacityInput = screen.getByLabelText(/Team Capacity/i)

      await user.clear(nameInput)
      await user.type(nameInput, 'New Sprint')
      await user.clear(goalInput)
      await user.type(goalInput, 'Complete all features')
      await user.clear(capacityInput)
      await user.type(capacityInput, '60')

      const saveButton = screen.getByRole('button', { name: /Create Sprint/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Sprint',
            goal: 'Complete all features',
            capacity: 60,
          })
        )
      })
    })

    it('should show loading state during save', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnSave.mockReturnValue(savePromise)

      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Test Sprint')

      const saveButton = screen.getByRole('button', { name: /Create Sprint/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
      })

      resolvePromise!()
    })

    it('should handle save errors', async () => {
      const user = userEvent.setup()
      mockOnSave.mockRejectedValue(new Error('Network error'))

      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Test Sprint')

      const saveButton = screen.getByRole('button', { name: /Create Sprint/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Modal Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const closeButton = screen.getByRole('button', { name: /Close modal/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const backdrop = screen.getByRole('dialog').parentElement!
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close when clicking inside modal content', async () => {
      const user = userEvent.setup()
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const modalContent = screen.getByRole('dialog')
      await user.click(modalContent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Unsaved Changes Warning', () => {
    it('should show unsaved changes indicator when form is modified', async () => {
      const user = userEvent.setup()
      const mockSprint = createMockSprint()

      render(
        <SprintFormModal
          sprint={mockSprint}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i)
      await user.type(nameInput, ' Updated')

      expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument()
    })

    it('should show confirmation dialog when closing with unsaved changes', async () => {
      const user = userEvent.setup()
      const mockSprint = createMockSprint()
      window.confirm = jest.fn(() => false)

      render(
        <SprintFormModal
          sprint={mockSprint}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i)
      await user.type(nameInput, ' Updated')

      const closeButton = screen.getByRole('button', { name: /Close modal/i })
      await user.click(closeButton)

      expect(window.confirm).toHaveBeenCalled()
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should close modal on Escape key', async () => {
      const user = userEvent.setup()
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should prevent closing on Escape during save', async () => {
      const user = userEvent.setup()
      mockOnSave.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/Sprint Name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Test Sprint')

      const saveButton = screen.getByRole('button', { name: /Create Sprint/i })
      await user.click(saveButton)

      await user.keyboard('{Escape}')

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('should have properly labeled form fields', () => {
      render(
        <SprintFormModal
          sprint={null}
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByLabelText(/Sprint Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Sprint Goal/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Team Capacity/i)).toBeInTheDocument()
    })
  })
})
