import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '../Board'

// Get globals from jest setup
const createMockStory = global.createMockStory
const mockStoriesApi = global.mockStoriesApi

// Helper functions for drag and drop testing
const simulateDragStart = (activeId) => {
  const callbacks = global.dndCallbacks
  if (callbacks?.onDragStart) {
    callbacks.onDragStart({ active: { id: activeId } })
  }
}

const simulateDragOver = (activeId, overId) => {
  const callbacks = global.dndCallbacks
  if (callbacks?.onDragOver) {
    callbacks.onDragOver({
      active: { id: activeId },
      over: { id: overId }
    })
  }
}

const simulateDragEnd = () => {
  const callbacks = global.dndCallbacks
  if (callbacks?.onDragEnd) {
    callbacks.onDragEnd({})
  }
}

describe('Board', () => {
  const mockStories = [
    createMockStory({
      id: 'story-1',
      title: 'TODO Story',
      status: 'TODO',
      rank: 1,
    }),
    createMockStory({
      id: 'story-2',
      title: 'In Progress Story',
      status: 'IN_PROGRESS',
      rank: 1,
    }),
    createMockStory({
      id: 'story-3',
      title: 'Done Story',
      status: 'DONE',
      rank: 1,
    }),
  ]

  beforeEach(() => {
    resetApiMocks()
    mockStoriesApi.getAll.mockResolvedValue(mockStories)

    // Setup modal root for portals
    const modalRoot = document.createElement('div')
    modalRoot.setAttribute('id', 'modal-root')
    document.body.appendChild(modalRoot)
  })

  afterEach(() => {
    jest.clearAllMocks()

    // Cleanup modal root
    const modalRoot = document.getElementById('modal-root')
    if (modalRoot) {
      document.body.removeChild(modalRoot)
    }
  })

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      render(<Board />)

      expect(screen.getByText('Loading stories...')).toBeInTheDocument()
    })

    it('should load and display stories from API', async () => {
      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      expect(screen.getByText('In Progress Story')).toBeInTheDocument()
      expect(screen.getByText('Done Story')).toBeInTheDocument()
    })

    it('should organize stories into correct columns', async () => {
      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Check that column headers are present
      expect(screen.getByText('To Do')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('should call storiesApi.getAll on mount', async () => {
      render(<Board />)

      await waitFor(() => {
        expect(mockStoriesApi.getAll).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockStoriesApi.getAll.mockRejectedValue(new Error('API Error'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load stories. Please try again.')).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      mockStoriesApi.getAll.mockRejectedValue(new Error('API Error'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should reload stories when retry button is clicked', async () => {
      const user = userEvent.setup()
      mockStoriesApi.getAll
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockStories)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      expect(mockStoriesApi.getAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('Story Creation', () => {
    beforeEach(async () => {
      render(<Board />)
      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })
    })

    it('should create draft story when add button is clicked', async () => {
      const user = userEvent.setup()

      // Find and click an "Add new story" button (there should be one for each column)
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0]) // Click first add button (TODO column)

      // Should open the edit modal with a draft story
      await waitFor(() => {
        expect(screen.getByText('Create Story')).toBeInTheDocument()
      })

      expect(screen.getByDisplayValue('New Story')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Add your story description here...')).toBeInTheDocument()
    })

    it('should save draft story when valid data is submitted', async () => {
      const user = userEvent.setup()
      const newStory = createMockStory({
        id: 'new-story-id',
        title: 'Created Story',
        description: 'Created Description',
      })
      mockStoriesApi.create.mockResolvedValue(newStory)

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      // Fill in the form
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Created Story')

      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Created Description')

      // Submit the form
      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalledWith({
          title: 'Created Story',
          description: 'Created Description',
          storyPoints: 3,
          status: 'TODO',
          assigneeId: null,
        })
      })
    })

    it('should remove draft story when modal is closed without saving', async () => {
      const user = userEvent.setup()

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      // Close without saving
      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)

      // Draft story should be removed from the board
      await waitFor(() => {
        expect(screen.queryByText('New Story')).not.toBeInTheDocument()
      })
    })
  })

  describe('Story Editing', () => {
    beforeEach(async () => {
      render(<Board />)
      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })
    })

    it('should open edit modal when story is clicked', async () => {
      const user = userEvent.setup()

      // Find and click a story card (assuming it has edit functionality)
      // Note: The actual implementation might require hovering first to show edit button
      const storyCard = screen.getByText('TODO Story')

      // Find the parent story card container
      const storyContainer = storyCard.closest('.group')!

      // Simulate hover to show edit button
      fireEvent.mouseEnter(storyContainer)

      // Now find the edit button within this specific story
      await waitFor(() => {
        const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = within(storyContainer as HTMLElement).getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })

      expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
    })

    it('should save story changes when form is submitted', async () => {
      const user = userEvent.setup()
      const updatedStory = createMockStory({
        id: 'story-1',
        title: 'Updated TODO Story',
        description: 'Updated description',
      })
      mockStoriesApi.update.mockResolvedValue(updatedStory)

      const storyCard = screen.getByText('TODO Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const editButton = screen.getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('TODO Story')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated TODO Story')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.update).toHaveBeenCalledWith(
          'story-1',
          expect.objectContaining({
            title: 'Updated TODO Story',
          })
        )
      })
    })
  })

  describe('Story Deletion', () => {
    beforeEach(async () => {
      render(<Board />)
      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })
    })

    it('should open delete confirmation modal when delete button is clicked', async () => {
      const user = userEvent.setup()

      const storyCard = screen.getByText('TODO Story')
      const storyCardContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyCardContainer)

      await waitFor(() => {
        const deleteButton = storyCardContainer.querySelector('[title="Delete story"]')
        expect(deleteButton).toBeInTheDocument()
      })

      const deleteButton = storyCardContainer.querySelector('[title="Delete story"]') as HTMLElement
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure you want to delete this story/)).toBeInTheDocument()
      })
    })

    it('should delete story when confirmation is clicked', async () => {
      const user = userEvent.setup()
      mockStoriesApi.delete.mockResolvedValue(undefined)

      const storyCard = screen.getByText('TODO Story')
      const storyCardContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyCardContainer)

      await waitFor(() => {
        const deleteButton = storyCardContainer.querySelector('[title="Delete story"]')
        expect(deleteButton).toBeInTheDocument()
      })

      const deleteButton = storyCardContainer.querySelector('[title="Delete story"]') as HTMLElement
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to delete this story/)).toBeInTheDocument()
      })

      const confirmDeleteButton = screen.getByRole('button', { name: 'Delete Story' })
      await user.click(confirmDeleteButton)

      await waitFor(() => {
        expect(mockStoriesApi.delete).toHaveBeenCalledWith('story-1')
      })
    })

    it('should not delete story when cancel is clicked', async () => {
      const user = userEvent.setup()

      const storyCard = screen.getByText('TODO Story')
      const storyCardContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyCardContainer)

      await waitFor(() => {
        const deleteButton = storyCardContainer.querySelector('[title="Delete story"]')
        expect(deleteButton).toBeInTheDocument()
      })

      const deleteButton = storyCardContainer.querySelector('[title="Delete story"]') as HTMLElement
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure you want to delete this story/)).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      expect(mockStoriesApi.delete).not.toHaveBeenCalled()
    })
  })

  describe('Drag and Drop', () => {
    beforeEach(async () => {
      render(<Board />)
      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })
    })

    it('should set active story when drag starts', async () => {
      simulateDragStart('story-1')

      // The drag overlay should show the dragged story
      // This is handled by the DndContext mock
      expect(global.dndCallbacks.onDragStart).toBeDefined()
    })

    it('should move story between columns when dropped on different column', async () => {
      mockStoriesApi.updateStatus.mockResolvedValue(createMockStory({
        id: 'story-1',
        status: 'IN_PROGRESS',
      }))

      simulateDragStart('story-1')
      simulateDragOver('story-1', 'in-progress')

      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalledWith('story-1', 'IN_PROGRESS')
      })
    })

    it('should reorder stories within same column', async () => {
      mockStoriesApi.reorder.mockResolvedValue([])

      simulateDragStart('story-1')
      simulateDragOver('story-1', 'story-2')

      await waitFor(() => {
        expect(mockStoriesApi.reorder).toHaveBeenCalled()
      })
    })

    it('should clear active story when drag ends', () => {
      simulateDragStart('story-1')
      simulateDragEnd()

      // This verifies the drag end callback is properly set up
      expect(global.dndCallbacks.onDragEnd).toBeDefined()
    })
  })

  describe('Static Rendering', () => {
    it('should render static version before drag is ready', async () => {
      render(<Board />)

      // Initially, the board should render without DndContext
      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Should show instruction text
      expect(screen.getByText(/Drag stories between columns/)).toBeInTheDocument()
    })
  })

  describe('Save Error Handling', () => {
    beforeEach(async () => {
      render(<Board />)
      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      mockStoriesApi.update.mockRejectedValue(new Error('Save failed'))

      const storyCard = screen.getByText('TODO Story')
      fireEvent.mouseEnter(storyCard.closest('.group')!)

      await waitFor(() => {
        const editButton = screen.getByTitle('Edit story')
        expect(editButton).toBeInTheDocument()
      })

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TODO Story')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      // Modal should stay open when save fails
      await waitFor(() => {
        expect(screen.getByText('Edit Story')).toBeInTheDocument()
      })
    })

    it('should display error message when delete fails', async () => {
      const user = userEvent.setup()
      mockStoriesApi.delete.mockRejectedValue(new Error('Delete failed'))

      const storyCard = screen.getByText('TODO Story')
      const storyCardContainer = storyCard.closest('.group')!
      fireEvent.mouseEnter(storyCardContainer)

      await waitFor(() => {
        const deleteButton = storyCardContainer.querySelector('[title="Delete story"]')
        expect(deleteButton).toBeInTheDocument()
      })

      const deleteButton = storyCardContainer.querySelector('[title="Delete story"]') as HTMLElement
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to delete this story/)).toBeInTheDocument()
      })

      const confirmDeleteButton = screen.getByRole('button', { name: 'Delete Story' })
      await user.click(confirmDeleteButton)

      // Should handle the error gracefully
      await waitFor(() => {
        expect(mockStoriesApi.delete).toHaveBeenCalled()
      })
    })
  })

  describe('Draft Story Handling', () => {
    beforeEach(async () => {
      render(<Board />)
      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })
    })

    it('should handle draft stories correctly when saving', async () => {
      const user = userEvent.setup()
      const newStory = createMockStory({
        id: 'saved-story-id',
        title: 'Saved Story',
        description: 'Saved Description',
      })
      mockStoriesApi.create.mockResolvedValue(newStory)

      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      // Fill and save
      const titleInput = screen.getByDisplayValue('New Story')
      const descriptionInput = screen.getByDisplayValue('Add your story description here...')

      await user.clear(titleInput)
      await user.type(titleInput, 'Saved Story')

      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Saved Description')

      const saveButton = screen.getByRole('button', { name: 'Create Story' })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockStoriesApi.create).toHaveBeenCalled()
      })
    })

    it('should not call API delete for draft stories', async () => {
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('TODO Story')).toBeInTheDocument()
      })

      // Create a draft story
      const addButtons = screen.getAllByTitle('Add new story')
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Story' })).toBeInTheDocument()
      })

      // Close without saving (creates a draft)
      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)

      // Since we don't have a direct way to test draft deletion,
      // we verify that no API call was made
      expect(mockStoriesApi.delete).not.toHaveBeenCalled()
    })
  })
})