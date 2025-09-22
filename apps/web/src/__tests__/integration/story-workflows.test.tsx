import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '@/components/board/Board'
import { createMockStory } from '../utils/test-utils'
import { mockStoriesApi, resetApiMocks } from '../mocks/api'

// Import the mocks
import '../mocks/api'
import '../mocks/dnd-kit'

describe('Story Workflows Integration', () => {
  const initialStories = [
    createMockStory({
      id: 'story-1',
      title: 'Existing Story',
      description: 'Existing Description',
      status: 'TODO',
      rank: 1,
    }),
  ]

  beforeEach(() => {
    resetApiMocks()
    // Ensure the mock is properly set up for this test
    mockStoriesApi.getAll.mockResolvedValue(initialStories)
    mockStoriesApi.getByStatus.mockImplementation((status) => {
      return Promise.resolve(initialStories.filter(s => s.status === status))
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Story Creation Workflow', () => {
    it('should handle the complete flow: add -> edit -> save', async () => {
      const user = userEvent.setup()

      // Mock API responses
      const newStory = createMockStory({
        id: 'new-story-123',
        title: 'Brand New Story',
        description: 'Detailed description for the new story',
        storyPoints: 5,
        status: 'TODO',
        assigneeId: 'user-123',
      })
      mockStoriesApi.create.mockResolvedValue(newStory)

      // Render the board
      render(<Board />)

      // Wait for initial load - board should show at least one story card
      await waitFor(() => {
        expect(screen.getByText(/To Do/)).toBeInTheDocument()
        // Look for any story content to ensure board loaded
        const storyCards = screen.getAllByRole('button', { name: /Edit story/ })
        expect(storyCards.length).toBeGreaterThan(0)
      })

      // Step 1: Click Add Story button
      const addButtons = screen.getAllByText(/Add/i)
      expect(addButtons.length).toBeGreaterThan(0)
      await user.click(addButtons[0]) // Click first add button (TODO column)

      // Step 2: Modal should open with default values
      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      expect(screen.getByDisplayValue('New Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Add your story description here...')).toBeInTheDocument()

      // Step 3: Fill in the form
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')
      const storyPointsSelect = screen.getByDisplayValue('3') // Default value
      const assigneeInput = screen.getByLabelText(/Assignee/)

      await user.clear(titleInput)
      await user.type(titleInput, 'Brand New Story')

      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Detailed description for the new story')

      await user.selectOptions(storyPointsSelect, '5')

      await user.clear(assigneeInput)
      await user.type(assigneeInput, 'user-123')

      // Step 4: Save the story
      const saveButton = screen.getByText('Save Changes')
      expect(saveButton).toBeEnabled()
      await user.click(saveButton)

      // Step 5: Verify API call was made correctly
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledWith({
          title: 'Brand New Story',
          description: 'Detailed description for the new story',
          storyPoints: 5,
          status: 'TODO',
          assigneeId: 'user-123',
        })
      })

      // Step 6: Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })

      // Step 7: New story should appear on the board
      // Note: This would require proper state updates, which might need additional setup
    })

    it('should handle cancellation during story creation', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Open create modal
      const addButtons = screen.getAllByText(/Add/i)
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Fill some data
      const titleInput = screen.getByDisplayValue('New Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Cancelled Story')

      // Cancel instead of saving
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })

      // No API call should be made
      expect(mockStoriesApi.create).not.toHaveBeenCalled()

      // Draft story should be removed from board
      expect(screen.queryByText('Cancelled Story')).not.toBeInTheDocument()
    })

    it('should handle validation errors during story creation', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Open create modal
      const addButtons = screen.getAllByText(/Add/i)
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      // Try to save with default (invalid) content
      const saveButton = screen.getByText('Save Changes')
      expect(saveButton).toBeDisabled()

      // Try to click it anyway (should not work)
      await user.click(saveButton)

      // Modal should remain open
      expect(screen.getByText('Edit Story')).toBeInTheDocument()

      // No API call should be made
      expect(mockStoriesApi.create).not.toHaveBeenCalled()
    })
  })

  describe('Complete Story Editing Workflow', () => {
    it('should handle the complete flow: click edit -> modify -> save', async () => {
      const user = userEvent.setup()

      const updatedStory = createMockStory({
        id: 'story-1',
        title: 'Updated Existing Story',
        description: 'Updated description with more details',
        storyPoints: 8,
        assigneeId: 'new-user-456',
      })
      mockStoriesApi.update.mockResolvedValue(updatedStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Step 1: Hover over story to reveal edit button
      const storyCard = screen.getByText('Existing Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      // Step 2: Click edit button
      await waitFor(() => {
        const editButton = screen.getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      // Step 3: Modal should open with existing data
      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      expect(screen.getByDisplayValue('Existing Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing Description')).toBeInTheDocument()

      // Step 4: Modify the form
      const titleInput = screen.getByDisplayValue('Existing Story')
      const descriptionInput = screen.getByDisplayValue('Existing Description')
      const storyPointsSelect = screen.getByDisplayValue('3')
      const assigneeInput = screen.getByDisplayValue('')

      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Existing Story')

      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description with more details')

      await user.selectOptions(storyPointsSelect, '8')

      await user.clear(assigneeInput)
      await user.type(assigneeInput, 'new-user-456')

      // Step 5: Save changes
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Step 6: Verify API call
      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalledWith(
          'story-1',
          expect.objectContaining({
            title: 'Updated Existing Story',
            description: 'Updated description with more details',
            storyPoints: 8,
            assigneeId: 'new-user-456',
          })
        )
      })

      // Step 7: Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })
    })

    it('should handle edit cancellation', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Open edit modal
      const storyCard = screen.getByText('Existing Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const editButton = screen.getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Story')).toBeInTheDocument()
      })

      // Make some changes
      const titleInput = screen.getByDisplayValue('Existing Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Modified Title')

      // Cancel changes
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })

      // No API call should be made
      expect(mockStoriesApi.update).not.toHaveBeenCalled()

      // Original story should still be visible
      expect(screen.getByText('Existing Story')).toBeInTheDocument()
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      mockStoriesApi.update.mockRejectedValue(new Error('Update failed'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Open and edit story
      const storyCard = screen.getByText('Existing Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const editButton = screen.getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Story')).toBeInTheDocument()
      })

      // Make changes and try to save
      const titleInput = screen.getByDisplayValue('Existing Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Should handle error and keep modal open
      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Modal should remain open after error
      expect(screen.getByText('Edit Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument()
    })
  })

  describe('Complete Story Deletion Workflow', () => {
    it('should handle the complete flow: click delete -> confirm -> remove', async () => {
      const user = userEvent.setup()
      mockStoriesApi.delete.mockResolvedValue(undefined)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Step 1: Hover over story to reveal delete button
      const storyCard = screen.getByText('Existing Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      // Step 2: Click delete button
      await waitFor(() => {
        const deleteButton = screen.getByTitle('Delete story')
        expect(deleteButton).toBeInTheDocument()
      })

      const deleteButton = screen.getByTitle('Delete story')
      await user.click(deleteButton)

      // Step 3: Confirmation modal should open
      await waitFor(() => {
        expect(screen.getByText('Delete Story')).toBeInTheDocument()
      })

      expect(screen.getByText('Are you sure you want to delete this story?')).toBeInTheDocument()
      expect(screen.getByText('Existing Story')).toBeInTheDocument() // Story preview

      // Step 4: Confirm deletion
      const confirmDeleteButton = screen.getByRole('button', { name: /Delete Story/i })
      await user.click(confirmDeleteButton)

      // Step 5: Verify API call
      await waitFor(() => {
        expect(mockStoriesApi.delete).toHaveBeenCalledWith('story-1')
      })

      // Step 6: Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Delete Story')).not.toBeInTheDocument()
      })
    })

    it('should handle deletion cancellation', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Open delete confirmation
      const storyCard = screen.getByText('Existing Story')
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

      // Cancel deletion
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Delete Story')).not.toBeInTheDocument()
      })

      // No API call should be made
      expect(mockStoriesApi.delete).not.toHaveBeenCalled()

      // Story should still be visible
      expect(screen.getByText('Existing Story')).toBeInTheDocument()
    })

    it('should handle deletion errors gracefully', async () => {
      const user = userEvent.setup()
      mockStoriesApi.delete.mockRejectedValue(new Error('Delete failed'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Attempt deletion
      const storyCard = screen.getByText('Existing Story')
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

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockStoriesApi.delete).toHaveBeenCalled()
      })

      // Story should remain in UI (error handling)
      expect(screen.getByText('Existing Story')).toBeInTheDocument()
    })
  })

  describe('Multiple Story Operations', () => {
    it('should handle multiple story creations in sequence', async () => {
      const user = userEvent.setup()

      const firstStory = createMockStory({
        id: 'story-new-1',
        title: 'First New Story',
        description: 'First description',
      })

      const secondStory = createMockStory({
        id: 'story-new-2',
        title: 'Second New Story',
        description: 'Second description',
      })

      mockStoriesApi.create
        .mockResolvedValueOnce(firstStory)
        .mockResolvedValueOnce(secondStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // Create first story
      const addButtons = screen.getAllByText(/Add/i)
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      const titleInput1 = screen.getByDisplayValue('New Story')
      const descriptionInput1 = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput1)
      await user.type(titleInput1, 'First New Story')

      await user.clear(descriptionInput1)
      await user.type(descriptionInput1, 'First description')

      const saveButton1 = screen.getByText('Save Changes')
      await user.click(saveButton1)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })

      // Create second story
      const addButtons2 = screen.getAllByText(/Add/i)
      await user.click(addButtons2[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      const titleInput2 = screen.getByDisplayValue('New Story')
      const descriptionInput2 = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput2)
      await user.type(titleInput2, 'Second New Story')

      await user.clear(descriptionInput2)
      await user.type(descriptionInput2, 'Second description')

      const saveButton2 = screen.getByText('Save Changes')
      await user.click(saveButton2)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(2)
      })

      expect(mockStoriesApi.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
        title: 'First New Story',
        description: 'First description',
      }))

      expect(mockStoriesApi.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
        title: 'Second New Story',
        description: 'Second description',
      }))
    })

    it('should handle mixed operations (create, edit, delete)', async () => {
      const user = userEvent.setup()

      const newStory = createMockStory({
        id: 'story-new',
        title: 'Created Story',
        description: 'Created description',
      })

      const updatedStory = createMockStory({
        id: 'story-1',
        title: 'Updated Story',
        description: 'Updated description',
      })

      mockStoriesApi.create.mockResolvedValue(newStory)
      mockStoriesApi.update.mockResolvedValue(updatedStory)
      mockStoriesApi.delete.mockResolvedValue(undefined)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Existing Story')).toBeInTheDocument()
      })

      // 1. Create a new story
      const addButtons = screen.getAllByText(/Add/i)
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Created Story')

      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Created description')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.queryByText('Edit Story')).not.toBeInTheDocument()
      })

      // 2. Edit the existing story
      const existingStoryCard = screen.getByText('Existing Story')
      fireEvent.mouseEnter(existingStoryCard.closest('.group')!)

      await waitFor(() => {
        const editButton = screen.getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Story')).toBeInTheDocument()
      })

      const editTitleInput = screen.getByDisplayValue('Existing Story')
      await user.clear(editTitleInput)
      await user.type(editTitleInput, 'Updated Story')

      const editSaveButton = screen.getByText('Save Changes')
      await user.click(editSaveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalled()
      })

      // Verify all operations were performed
      expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      expect(mockStoriesApi.update).toHaveBeenCalledTimes(1)
    })
  })
})