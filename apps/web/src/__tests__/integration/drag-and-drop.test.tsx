import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { createMockStory } from '../utils/test-utils'

// Import the mocks FIRST before any components
import '../mocks/api'
import '../mocks/dnd-kit'
import { mockStoriesApi, resetApiMocks } from '../mocks/api'
import { simulateDragStart, simulateDragOver, simulateDragEnd } from '../mocks/dnd-kit'

// Import components AFTER mocks are established
import { Board } from '@/components/board/Board'

describe('Drag and Drop Integration', () => {
  const mockStories = [
    createMockStory({
      id: 'story-1',
      title: 'TODO Story 1',
      description: 'First TODO story',
      status: 'TODO',
      rank: 1,
    }),
    createMockStory({
      id: 'story-2',
      title: 'TODO Story 2',
      description: 'Second TODO story',
      status: 'TODO',
      rank: 2,
    }),
    createMockStory({
      id: 'story-3',
      title: 'IN_PROGRESS Story',
      description: 'In progress story',
      status: 'IN_PROGRESS',
      rank: 1,
    }),
    createMockStory({
      id: 'story-4',
      title: 'DONE Story',
      description: 'Completed story',
      status: 'DONE',
      rank: 1,
    }),
  ]

  beforeEach(() => {
    resetApiMocks()
    mockStoriesApi.getAll.mockResolvedValue(mockStories)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Cross-Column Drag and Drop', () => {
    it('should move story from TODO to IN_PROGRESS', async () => {
      const updatedStory = createMockStory({
        id: 'story-1',
        title: 'TODO Story 1',
        status: 'IN_PROGRESS',
        rank: 2,
      })
      mockStoriesApi.updateStatus.mockResolvedValue(updatedStory)

      render(<Board />)

      // Wait for stories to load
      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Simulate drag from TODO story to IN_PROGRESS column
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'in-progress')

      // Verify API call to update status
      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalledWith('story-1', 'IN_PROGRESS')
      })

      // Clean up drag
      simulateDragEnd()
    })

    it('should move story from IN_PROGRESS to DONE', async () => {
      const updatedStory = createMockStory({
        id: 'story-3',
        title: 'IN_PROGRESS Story',
        status: 'DONE',
        rank: 2,
      })
      mockStoriesApi.updateStatus.mockResolvedValue(updatedStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('IN_PROGRESS Story')).toBeInTheDocument()
      })

      // Simulate drag from IN_PROGRESS story to DONE column
      simulateDragStart('story-3')
      simulateDragOver('story-3', 'done')

      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalledWith('story-3', 'DONE')
      })

      simulateDragEnd()
    })

    it('should move story from DONE back to TODO', async () => {
      const updatedStory = createMockStory({
        id: 'story-4',
        title: 'DONE Story',
        status: 'TODO',
        rank: 3,
      })
      mockStoriesApi.updateStatus.mockResolvedValue(updatedStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('DONE Story')).toBeInTheDocument()
      })

      // Simulate drag from DONE story to TODO column
      simulateDragStart('story-4')
      simulateDragOver('story-4', 'todo')

      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalledWith('story-4', 'TODO')
      })

      simulateDragEnd()
    })

    it('should handle status update errors gracefully', async () => {
      mockStoriesApi.updateStatus.mockRejectedValue(new Error('Status update failed'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Simulate drag that will fail
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'in-progress')

      // Should attempt the API call but handle error gracefully
      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalled()
      })

      simulateDragEnd()
    })
  })

  describe('Within-Column Reordering', () => {
    it('should reorder stories within the same column', async () => {
      mockStoriesApi.reorder.mockResolvedValue([])

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
        expect(screen.getByText('TODO Story 2')).toBeInTheDocument()
      })

      // Ensure both stories are fully rendered with proper IDs
      expect(mockStoriesApi.getAll).toHaveBeenCalled()

      // Simulate dragging story-1 over story-2 (both in TODO column)
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'story-2')

      // Should call reorder API
      await waitFor(() => {
        expect(mockStoriesApi.reorder).toHaveBeenCalled()
      }, { timeout: 1000 })

      simulateDragEnd()
    })

    it('should handle reorder errors gracefully', async () => {
      mockStoriesApi.reorder.mockRejectedValue(new Error('Reorder failed'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Simulate reorder that will fail
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'story-2')

      // Should attempt the API call but handle error gracefully
      await waitFor(() => {
        expect(mockStoriesApi.reorder).toHaveBeenCalled()
      })

      simulateDragEnd()
    })

    it('should not make API calls for invalid drop targets', async () => {
      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Simulate drag without valid drop target
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'invalid-target')

      // Should not make any API calls
      expect(mockStoriesApi.updateStatus).not.toHaveBeenCalled()
      expect(mockStoriesApi.reorder).not.toHaveBeenCalled()

      simulateDragEnd()
    })
  })

  describe('Cross-Column Positioning', () => {
    it('should move story to specific position in different column', async () => {
      const updatedStory = createMockStory({
        id: 'story-1',
        title: 'TODO Story 1',
        status: 'IN_PROGRESS',
      })
      mockStoriesApi.updateStatus.mockResolvedValue(updatedStory)
      mockStoriesApi.reorder.mockResolvedValue([])

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
        expect(screen.getByText('IN_PROGRESS Story')).toBeInTheDocument()
      })

      // Simulate dragging TODO story over IN_PROGRESS story (different columns)
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'story-3')

      // Should update status and reorder
      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalledWith('story-1', 'IN_PROGRESS')
      })

      await waitFor(() => {
        expect(mockStoriesApi.reorder).toHaveBeenCalled()
      })

      simulateDragEnd()
    })

    it('should handle complex cross-column moves with positioning', async () => {
      // Add more stories to IN_PROGRESS for better testing
      const extendedStories = [
        ...mockStories,
        createMockStory({
          id: 'story-5',
          title: 'IN_PROGRESS Story 2',
          description: 'Second in progress story',
          status: 'IN_PROGRESS',
          rank: 2,
        }),
      ]

      mockStoriesApi.getAll.mockResolvedValue(extendedStories)
      mockStoriesApi.updateStatus.mockResolvedValue(createMockStory({
        id: 'story-1',
        status: 'IN_PROGRESS',
      }))
      mockStoriesApi.reorder.mockResolvedValue([])

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
        expect(screen.getByText('IN_PROGRESS Story 2')).toBeInTheDocument()
      })

      // Move TODO story to position between two IN_PROGRESS stories
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'story-5') // Drop on second IN_PROGRESS story

      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalledWith('story-1', 'IN_PROGRESS')
      })

      simulateDragEnd()
    })
  })

  describe('Drag State Management', () => {
    it('should set active story during drag', async () => {
      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Start drag - should set active story
      simulateDragStart('story-1')

      // The active story state is internal, so we verify through side effects
      // In a real implementation, this might show a drag overlay
      expect(global.dndCallbacks.onDragStart).toHaveBeenCalled()

      simulateDragEnd()
    })

    it('should clear active story when drag ends', async () => {
      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      simulateDragStart('story-1')
      simulateDragEnd()

      // Verify drag end callback was called
      expect(global.dndCallbacks.onDragEnd).toHaveBeenCalled()
    })

    it('should handle drag cancellation', async () => {
      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Start drag and then end without drop
      simulateDragStart('story-1')
      simulateDragEnd()

      // Should not make any API calls for cancelled drag
      expect(mockStoriesApi.updateStatus).not.toHaveBeenCalled()
      expect(mockStoriesApi.reorder).not.toHaveBeenCalled()
    })
  })

  describe('Multiple Consecutive Drags', () => {
    it('should handle multiple drag operations in sequence', async () => {
      mockStoriesApi.updateStatus
        .mockResolvedValueOnce(createMockStory({ id: 'story-1', status: 'IN_PROGRESS' }))
        .mockResolvedValueOnce(createMockStory({ id: 'story-2', status: 'DONE' }))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
        expect(screen.getByText('TODO Story 2')).toBeInTheDocument()
      })

      // First drag: move story-1 to IN_PROGRESS
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'in-progress')
      simulateDragEnd()

      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenNthCalledWith(1, 'story-1', 'IN_PROGRESS')
      })

      // Second drag: move story-2 to DONE
      simulateDragStart('story-2')
      simulateDragOver('story-2', 'done')
      simulateDragEnd()

      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenNthCalledWith(2, 'story-2', 'DONE')
      })

      expect(mockStoriesApi.updateStatus).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid drag operations', async () => {
      mockStoriesApi.reorder.mockResolvedValue([])

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Rapid reordering within same column
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'story-2')
      simulateDragEnd()

      simulateDragStart('story-2')
      simulateDragOver('story-2', 'story-1')
      simulateDragEnd()

      // Should handle both operations
      await waitFor(() => {
        expect(mockStoriesApi.reorder).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Recovery During Drag Operations', () => {
    it('should maintain UI consistency when status update fails', async () => {
      mockStoriesApi.updateStatus.mockRejectedValue(new Error('Network error'))

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Attempt move that will fail
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'in-progress')

      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalled()
      })

      simulateDragEnd()

      // UI should still be functional after error
      expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
    })

    it('should handle network timeouts during drag operations', async () => {
      // Simulate slow network response
      mockStoriesApi.updateStatus.mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      simulateDragStart('story-1')
      simulateDragOver('story-1', 'in-progress')

      // Should handle slow response gracefully
      expect(mockStoriesApi.updateStatus).toHaveBeenCalled()

      simulateDragEnd()
    })
  })

  describe('Drag and Drop with Empty Columns', () => {
    it('should handle dropping on empty column', async () => {
      // Create scenario with empty DONE column
      const storiesWithEmptyDone = mockStories.filter(s => s.status !== 'DONE')
      mockStoriesApi.getAll.mockResolvedValue(storiesWithEmptyDone)

      const updatedStory = createMockStory({
        id: 'story-1',
        status: 'DONE',
        rank: 1,
      })
      mockStoriesApi.updateStatus.mockResolvedValue(updatedStory)

      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO Story 1')).toBeInTheDocument()
      })

      // Move to empty DONE column
      simulateDragStart('story-1')
      simulateDragOver('story-1', 'done')

      await waitFor(() => {
        expect(mockStoriesApi.updateStatus).toHaveBeenCalledWith('story-1', 'DONE')
      })

      simulateDragEnd()
    })

    it('should handle reordering when column has only one item', async () => {
      // Test with IN_PROGRESS column that has only one item
      render(<Board />)

      await waitFor(() => {
        expect(screen.getByText('IN_PROGRESS Story')).toBeInTheDocument()
      })

      // Try to reorder single item (should be no-op)
      simulateDragStart('story-3')
      simulateDragOver('story-3', 'story-3') // Self-drop

      // Should not make unnecessary API calls
      expect(mockStoriesApi.reorder).not.toHaveBeenCalled()
      expect(mockStoriesApi.updateStatus).not.toHaveBeenCalled()

      simulateDragEnd()
    })
  })
})