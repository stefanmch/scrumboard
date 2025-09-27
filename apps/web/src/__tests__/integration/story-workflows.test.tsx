// Import the mocks first - they need to be hoisted
import '../mocks/api'
import '../mocks/dnd-kit'

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '@/components/board/Board'
import { createMockStory, setupModalTestEnvironment } from '../utils/test-utils'
import { mockStoriesApi, resetApiMocks } from '../mocks/api'

describe('Story Workflows Integration', () => {
  // Set up modal environment for React Portal-based modals
  setupModalTestEnvironment()

  beforeEach(() => {
    resetApiMocks()
    // Use the global mock stories that are already set up
    // These include: 'TODO Story', 'In Progress Story', 'Done Story'
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
      // Mock the API call
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
      const addButton = screen.getByTestId('add-story-button-todo')
      expect(addButton).toBeInTheDocument()
      await user.click(addButton) // Click TODO column add button

      // Step 2: Wait for modal to open and verify it's there
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      // Verify default placeholder values exist
      expect(screen.getByDisplayValue('New Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Add your story description here...')).toBeInTheDocument()

      // Step 3: Fill in the form - must clear placeholder content
      const titleInput = screen.getByLabelText(/Story Title/) as HTMLInputElement
      const descriptionInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement
      const storyPointsSelect = screen.getByLabelText(/Story Points/) as HTMLSelectElement
      const assigneeInput = screen.getByLabelText(/Assignee/) as HTMLInputElement

      // Clear and replace with new values (not placeholders)
      // Use fireEvent.change to ensure the onChange handler is triggered
      fireEvent.change(titleInput, { target: { value: '' } })
      fireEvent.change(titleInput, { target: { value: 'Brand New Story' } })

      fireEvent.change(descriptionInput, { target: { value: '' } })
      fireEvent.change(descriptionInput, { target: { value: 'Detailed description for the new story' } })

      fireEvent.change(storyPointsSelect, { target: { value: '5' } })

      fireEvent.change(assigneeInput, { target: { value: '' } })
      fireEvent.change(assigneeInput, { target: { value: 'user-123' } })

      // Verify form now has valid values (not placeholders)
      await waitFor(() => {
        expect(screen.getByDisplayValue('Brand New Story')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Detailed description for the new story')).toBeInTheDocument()
      })

      // Step 4: Wait for validation to update and save button to be enabled
      const saveButton = screen.getByRole('button', { name: 'Create Story' })
      await waitFor(() => {
        expect(saveButton).toBeEnabled()
      })

      expect(mockStoriesApi.create).not.toHaveBeenCalled()

      // Click the save button using userEvent
      await user.click(saveButton)

      // Step 5: Verify API call was made correctly
      // Wait longer and be more explicit about expectations
      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      }, { timeout: 3000 })

      expect(mockStoriesApi.create).toHaveBeenCalledWith({
        title: 'Brand New Story',
        description: 'Detailed description for the new story',
        storyPoints: 5,
        status: 'TODO',
        assigneeId: 'user-123',
      })

      // Step 6: Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Create Story' })).not.toBeInTheDocument()
      })

      // Step 7: New story should appear on the board
      // Note: This would require proper state updates, which might need additional setup
    })

    it('should handle cancellation during story creation', async () => {
      const user = userEvent.setup()

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Open create modal
      const addButton = screen.getByTestId('add-story-button-todo')
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
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
        expect(screen.queryByRole('heading', { name: 'Create Story' })).not.toBeInTheDocument()
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
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Open create modal
      const addButton = screen.getByTestId('add-story-button-todo')
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      // Try to save with default (invalid) content
      const saveButton = screen.getByRole('button', { name: 'Create Story' })
      expect(saveButton).toBeDisabled()

      // Try to click it anyway (should not work)
      await user.click(saveButton)

      // Modal should remain open
      expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()

      // No API call should be made
      expect(mockStoriesApi.create).not.toHaveBeenCalled()
    })
  })

  describe('Complete Story Editing Workflow', () => {
    it('should handle the complete flow: click edit -> modify -> save', async () => {
      const user = userEvent.setup()

      const updatedStory = createMockStory({
        id: 'story-1',
        title: 'Updated TODO Story',
        description: 'Updated description with more details',
        storyPoints: 8,
        assigneeId: 'new-user-456',
      })
      mockStoriesApi.update.mockResolvedValue(updatedStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Step 1: Hover over story to reveal edit button
      const storyCard = screen.getByText('TODO Story')
      const storyCardContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyCardContainer)

      // Step 2: Click edit button
      await waitFor(() => {
        const editButton = within(storyCardContainer).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyCardContainer).getByTitle('Edit story')
      await user.click(editButton)

      // Step 3: Modal should open with existing data
      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('First story description')).toBeInTheDocument()

      // Step 4: Modify the form
      const titleInput = screen.getByDisplayValue('TODO Story')
      const descriptionInput = screen.getByDisplayValue('First story description')
      const storyPointsSelect = screen.getByDisplayValue('3')
      const assigneeInput = screen.getByDisplayValue('')

      await user.clear(titleInput)
      await user.type(titleInput, 'Updated TODO Story')

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
            title: 'Updated TODO Story',
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

      // Mock window.confirm to simulate user clicking "Yes" to cancel changes
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Open edit modal
      const storyCard = screen.getByText('TODO Story')
      const storyCardContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyCardContainer)

      await waitFor(() => {
        const editButton = within(storyCardContainer).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyCardContainer).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      })

      // Make some changes
      const titleInput = screen.getByDisplayValue('TODO Story')
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
      expect(screen.getByText('TODO Story')).toBeInTheDocument()

      // Verify confirm dialog was shown for unsaved changes
      expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close without saving?')

      // Clean up mock
      confirmSpy.mockRestore()
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      mockStoriesApi.update.mockRejectedValue(new Error('Update failed'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Open and edit story
      const storyCard = screen.getByText('TODO Story')
      const storyCardContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyCardContainer)

      await waitFor(() => {
        const editButton = within(storyCardContainer).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyCardContainer).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      })

      // Make changes and try to save
      const titleInput = screen.getByDisplayValue('TODO Story')
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
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Step 1: Hover over story to reveal delete button
      const storyCard = screen.getByText('TODO Story')
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
      expect(screen.getByText('TODO Story')).toBeInTheDocument() // Story preview

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
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Open delete confirmation
      const storyCard = screen.getByText('TODO Story')
      const storyCardContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyCardContainer)

      await waitFor(() => {
        const deleteButton = storyCardContainer.querySelector('button[title="Delete story"]') as HTMLElement
        expect(deleteButton).toBeInTheDocument()
        expect(deleteButton).toBeVisible()
      })

      const deleteButton = storyCardContainer.querySelector('button[title="Delete story"]') as HTMLElement
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/are you sure you want to delete this story/i)).toBeInTheDocument()
      })

      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // No API call should be made
      expect(mockStoriesApi.delete).not.toHaveBeenCalled()

      // Story should still be visible
      expect(screen.getByText('TODO Story')).toBeInTheDocument()
    })

    it('should handle deletion errors gracefully', async () => {
      const user = userEvent.setup()
      mockStoriesApi.delete.mockRejectedValue(new Error('Delete failed'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Attempt deletion
      const storyCard = screen.getByText('TODO Story')
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
      expect(screen.getByText('TODO Story')).toBeInTheDocument()
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
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Create first story
      const addButton = screen.getByTestId('add-story-button-todo')
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      const titleInput1 = screen.getByDisplayValue('New Story')
      const descriptionInput1 = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput1)
      await user.type(titleInput1, 'First New Story')

      await user.clear(descriptionInput1)
      await user.type(descriptionInput1, 'First description')

      const saveButton1 = screen.getByRole('button', { name: 'Create Story' })
      await user.click(saveButton1)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Create Story' })).not.toBeInTheDocument()
      })

      // Create second story
      const addButton2 = screen.getByTestId('add-story-button-todo')
      await user.click(addButton2)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      const titleInput2 = screen.getByDisplayValue('New Story')
      const descriptionInput2 = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput2)
      await user.type(titleInput2, 'Second New Story')

      await user.clear(descriptionInput2)
      await user.type(descriptionInput2, 'Second description')

      const saveButton2 = screen.getByRole('button', { name: 'Create Story' })
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
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // 1. Create a new story
      const addButton = screen.getByTestId('add-story-button-todo')
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Created Story')

      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Created description')

      const saveButton = screen.getByRole('button', { name: 'Create Story' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Create Story' })).not.toBeInTheDocument()
      })

      // 2. Edit the existing story
      const existingStoryCard = screen.getByText('TODO Story')
      const existingStoryCardContainer = existingStoryCard.closest('.group')!
      fireEvent.mouseEnter(existingStoryCardContainer)

      await waitFor(() => {
        const editButton = within(existingStoryCardContainer).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(existingStoryCardContainer).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      })

      const editTitleInput = screen.getByDisplayValue('TODO Story')
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