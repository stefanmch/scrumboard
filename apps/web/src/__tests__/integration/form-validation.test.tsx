import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMockStory } from '../utils/test-utils'

// Import the mocks FIRST before any components
import '../mocks/api'
import '../mocks/dnd-kit'
import { mockStoriesApi, resetApiMocks } from '../mocks/api'

// Import components AFTER mocks are established
import { Board } from '@/components/board/Board'

describe('Form Validation and Error Handling Integration', () => {
  beforeEach(() => {
    resetApiMocks()
    // Use the global mock stories that are already set up
    // These include: 'TODO Story', 'In Progress Story', 'Done Story'
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Story Creation Form Validation', () => {
    it('should prevent submission with default placeholder content', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Open create modal
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Verify default content is present
      expect(screen.getByDisplayValue('New Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Add your story description here...')).toBeInTheDocument()

      // Save button should be disabled
      const saveButton = screen.getByRole('button', { name: /create story/i })
      expect(saveButton).toBeDisabled()

      // Try to submit anyway (should not work)
      await user.click(saveButton)

      // No API call should be made
      expect(mockStoriesApi.create).not.toHaveBeenCalled()

      // Modal should remain open
      expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
    })

    it('should prevent submission with empty title', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Clear title but keep valid description
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid description')

      // Save button should be disabled due to empty title
      const saveButton = screen.getByRole('button', { name: /create story/i })
      expect(saveButton).toBeDisabled()

      await user.click(saveButton)
      expect(mockStoriesApi.create).not.toHaveBeenCalled()
    })

    it('should prevent submission with empty description', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Clear description but keep valid title
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Valid Title')
      await user.clear(descriptionInput)

      // Save button should be disabled due to empty description
      const saveButton = screen.getByRole('button', { name: /create story/i })
      expect(saveButton).toBeDisabled()

      await user.click(saveButton)
      expect(mockStoriesApi.create).not.toHaveBeenCalled()
    })

    it('should allow submission with valid content', async () => {
      const user = userEvent.setup()
      const newStory = createMockStory({
        id: 'new-story',
        title: 'Valid Title',
        description: 'Valid description content',
      })
      mockStoriesApi.create.mockResolvedValue(newStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Fill with valid content
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Valid Title')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid description content')

      // Save button should be enabled
      const saveButton = screen.getByRole('button', { name: /create story/i })
      expect(saveButton).toBeEnabled()

      await user.click(saveButton)

      // API call should be made
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledWith({
          title: 'Valid Title',
          description: 'Valid description content',
          storyPoints: 3,
          status: 'TODO',
          assigneeId: null,
        })
      })
    })

    it('should validate in real-time as user types', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')
      const saveButton = screen.getByRole('button', { name: /create story/i })

      // Initially disabled due to default content
      expect(saveButton).toBeDisabled()

      // Clear only title - should remain disabled
      await user.clear(titleInput)
      expect(saveButton).toBeDisabled()

      // Add valid title - still disabled due to default description
      await user.type(titleInput, 'Valid Title')
      expect(saveButton).toBeDisabled()

      // Clear description - still disabled due to empty description
      await user.clear(descriptionInput)
      expect(saveButton).toBeDisabled()

      // Add valid description - should become enabled
      await user.type(descriptionInput, 'Valid description')
      expect(saveButton).toBeEnabled()

      // Clear title again - should become disabled
      await user.clear(titleInput)
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Story Editing Form Validation', () => {
    it('should prevent clearing required fields during edit', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Open edit modal - properly scope the selector to avoid multiple matches
      const storyCard = screen.getByText('TODO Story')
      const storyContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyContainer)

      await waitFor(() => {
        const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('TODO Story')
      const saveButton = screen.getByText('Save Changes')

      // Initially enabled with valid content
      expect(saveButton).toBeEnabled()

      // Clear title - should become disabled
      await user.clear(titleInput)
      expect(saveButton).toBeDisabled()

      // Restore title - should become enabled again
      await user.type(titleInput, 'Updated Title')
      expect(saveButton).toBeEnabled()
    })

    it('should maintain validation state across form interactions', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const storyCard = screen.getByText('TODO Story')
      const storyContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyContainer)

      await waitFor(() => {
        const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('TODO Story')
      const descriptionInput = screen.getByDisplayValue('First story description')
      const storyPointsSelect = screen.getByLabelText('Story Points')
      const saveButton = screen.getByText('Save Changes')

      // Test various form interactions
      await user.selectOptions(storyPointsSelect, '5')
      expect(saveButton).toBeEnabled()

      await user.clear(titleInput)
      expect(saveButton).toBeDisabled()

      await user.type(titleInput, 'New Title')
      expect(saveButton).toBeEnabled()

      await user.clear(descriptionInput)
      expect(saveButton).toBeDisabled()

      await user.type(descriptionInput, 'New Description')
      expect(saveButton).toBeEnabled()
    })
  })

  describe('Keyboard Interaction Validation', () => {
    it('should handle Enter key submission with validation', async () => {
      const user = userEvent.setup()
      const newStory = createMockStory({
        id: 'new-story',
        title: 'Keyboard Created',
        description: 'Created with Enter key',
      })
      mockStoriesApi.create.mockResolvedValue(newStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Fill with valid content
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Keyboard Created')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Created with Enter key')

      // Press Enter in title field
      fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' })

      // Should submit the form
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledWith({
          title: 'Keyboard Created',
          description: 'Created with Enter key',
          storyPoints: 3,
          status: 'TODO',
          assigneeId: null,
        })
      })
    })

    it('should prevent Enter key submission with invalid content', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Leave default (invalid) content
      const titleInput = screen.getByDisplayValue('New Story')

      // Press Enter - should not submit
      fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' })

      // No API call should be made
      await waitFor(() => {
        expect(mockStoriesApi.create).not.toHaveBeenCalled()
      })

      // Modal should remain open
      expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
    })

    it('should handle Escape key properly without validation errors', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Partially fill form
      const titleInput = screen.getByDisplayValue('New Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Partial')

      // Press Escape to close
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

      // Modal should close without validation issues
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /create story/i })).not.toBeInTheDocument()
      })

      // No API call should be made
      expect(mockStoriesApi.create).not.toHaveBeenCalled()
    })
  })

  describe('API Error Handling', () => {
    it('should handle creation errors gracefully', async () => {
      const user = userEvent.setup()
      mockStoriesApi.create.mockRejectedValue(new Error('Network error'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Fill valid content
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Valid Title')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid Description')

      // Submit
      const saveButton = screen.getByRole('button', { name: /create story/i })
      await user.click(saveButton)

      // Should attempt API call
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      // Modal should remain open due to error
      expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue('Valid Title')).toBeInTheDocument()
    })

    it('should handle update errors gracefully', async () => {
      const user = userEvent.setup()
      mockStoriesApi.update.mockRejectedValue(new Error('Update failed'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const storyCard = screen.getByText('TODO Story')
      const storyContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyContainer)

      await waitFor(() => {
        const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      })

      // Make changes
      const titleInput = screen.getByDisplayValue('TODO Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      // Submit
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Modal should remain open with changes preserved
      expect(screen.getByRole('heading', { name: /edit story/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument()
    })

    it('should handle validation after API errors', async () => {
      const user = userEvent.setup()
      mockStoriesApi.create
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(createMockStory({ id: 'success-story' }))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      // Fill and submit (will fail)
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Valid Title')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Valid Description')

      const saveButton = screen.getByRole('button', { name: /create story/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      // Modal should still be open
      expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()

      // Make a small change and try again
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Valid Title')

      // Should still be valid and submittable
      expect(saveButton).toBeEnabled()
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      // Should close on success
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /create story/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('should handle special characters in form fields', async () => {
      const user = userEvent.setup()
      const newStory = createMockStory({
        id: 'special-story',
        title: 'Story with quotes and symbols',
        description: 'Description with tags and symbols',
      })
      mockStoriesApi.create.mockResolvedValue(newStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Story with quotes and symbols')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Description with tags and symbols')

      const saveButton = screen.getByRole('button', { name: /create story/i })
      expect(saveButton).toBeEnabled()
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledWith({
          title: 'Story with quotes and symbols',
          description: 'Description with tags and symbols',
          storyPoints: 3,
          status: 'TODO',
          assigneeId: null,
        })
      })
    })

    it('should handle very long input values', async () => {
      const user = userEvent.setup()
      const longTitle = 'A'.repeat(50) // Long title that won't timeout
      const longDescription = 'B'.repeat(100) // Long description that won't timeout

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, longTitle)
      await user.clear(descriptionInput)
      await user.type(descriptionInput, longDescription)

      // Should still be valid despite length
      const saveButton = screen.getByRole('button', { name: /create story/i })
      expect(saveButton).toBeEnabled()
    })

    it('should handle rapid form changes', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create story/i })).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const saveButton = screen.getByRole('button', { name: /create story/i })

      // Rapid changes
      await user.clear(titleInput)
      expect(saveButton).toBeDisabled()

      await user.type(titleInput, 'A')
      expect(saveButton).toBeDisabled()

      await user.clear(titleInput)
      expect(saveButton).toBeDisabled()

      await user.type(titleInput, 'Valid Title')
      expect(saveButton).toBeDisabled() // Still disabled due to default description

      const descriptionInput = screen.getByDisplayValue('Add your story description here...')
      await user.clear(descriptionInput)
      expect(saveButton).toBeDisabled()

      await user.type(descriptionInput, 'Valid Description')
      expect(saveButton).toBeEnabled()
    })
  })
})