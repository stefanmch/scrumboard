import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryCard } from '../StoryCard'
import { createMockStory } from '@/__tests__/utils/test-utils'

describe('StoryCard', () => {
  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()
  const mockDragListeners = {
    onPointerDown: jest.fn(),
    onKeyDown: jest.fn(),
  }

  const defaultStory = createMockStory({
    title: 'Test Story Title',
    description: 'Test story description that provides context about what needs to be done',
    storyPoints: 5,
    assigneeId: 'user-1',
    assignee: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
    createdAt: new Date('2023-01-15'),
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render story title', () => {
      render(<StoryCard story={defaultStory} />)

      expect(screen.getByText('Test Story Title')).toBeInTheDocument()
    })

    it('should render story description', () => {
      render(<StoryCard story={defaultStory} />)

      expect(screen.getByText(/Test story description that provides context/)).toBeInTheDocument()
    })

    it('should render created date', () => {
      render(<StoryCard story={defaultStory} />)

      expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument()
    })
  })

  describe('Story Points Display', () => {
    it('should render story points when present', () => {
      render(<StoryCard story={defaultStory} />)

      expect(screen.getByText('5 pts')).toBeInTheDocument()
    })

    it('should not render story points when not present', () => {
      const storyWithoutPoints = createMockStory({
        ...defaultStory,
        storyPoints: undefined,
      })

      render(<StoryCard story={storyWithoutPoints} />)

      expect(screen.queryByText(/pts/)).not.toBeInTheDocument()
    })

    it('should apply correct styling for low points (1-2)', () => {
      const lowPointStory = createMockStory({
        ...defaultStory,
        storyPoints: 2,
      })

      render(<StoryCard story={lowPointStory} />)

      const pointsElement = screen.getByText('2 pts')
      expect(pointsElement).toHaveStyle({
        backgroundColor: '#dbeafe',
        color: '#1e40af',
      })
    })

    it('should apply correct styling for medium points (3-4)', () => {
      const mediumPointStory = createMockStory({
        ...defaultStory,
        storyPoints: 3,
      })

      render(<StoryCard story={mediumPointStory} />)

      const pointsElement = screen.getByText('3 pts')
      expect(pointsElement).toHaveStyle({
        backgroundColor: '#e0e7ff',
        color: '#3730a3',
      })
    })

    it('should apply correct styling for high points (5-6)', () => {
      const highPointStory = createMockStory({
        ...defaultStory,
        storyPoints: 5,
      })

      render(<StoryCard story={highPointStory} />)

      const pointsElement = screen.getByText('5 pts')
      expect(pointsElement).toHaveStyle({
        backgroundColor: '#e9d5ff',
        color: '#581c87',
      })
    })

    it('should apply correct styling for very high points (7+)', () => {
      const veryHighPointStory = createMockStory({
        ...defaultStory,
        storyPoints: 8,
      })

      render(<StoryCard story={veryHighPointStory} />)

      const pointsElement = screen.getByText('8 pts')
      expect(pointsElement).toHaveStyle({
        backgroundColor: '#fce7f3',
        color: '#be185d',
      })
    })
  })

  describe('Assignee Display', () => {
    it('should render assignee when present as object', () => {
      render(<StoryCard story={defaultStory} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should render assignee when present as string', () => {
      const storyWithStringAssignee = createMockStory({
        ...defaultStory,
        assignee: 'Jane Smith',
      })

      render(<StoryCard story={storyWithStringAssignee} />)

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should not render assignee section when not present', () => {
      const storyWithoutAssignee = createMockStory({
        ...defaultStory,
        assignee: null,
      })

      render(<StoryCard story={storyWithoutAssignee} />)

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should render edit button when onEdit prop is provided', () => {
      render(<StoryCard story={defaultStory} onEdit={mockOnEdit} />)

      const editButton = screen.getByTitle('Edit story')
      expect(editButton).toBeInTheDocument()
    })

    it('should render delete button when onDelete prop is provided', () => {
      render(<StoryCard story={defaultStory} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByTitle('Delete story')
      expect(deleteButton).toBeInTheDocument()
    })

    it('should not render edit button when onEdit prop is not provided', () => {
      render(<StoryCard story={defaultStory} />)

      expect(screen.queryByTitle('Edit story')).not.toBeInTheDocument()
    })

    it('should not render delete button when onDelete prop is not provided', () => {
      render(<StoryCard story={defaultStory} />)

      expect(screen.queryByTitle('Delete story')).not.toBeInTheDocument()
    })
  })

  describe('Action Button Interactions', () => {
    it('should call onEdit with story when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<StoryCard story={defaultStory} onEdit={mockOnEdit} />)

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledWith(defaultStory)
    })

    it('should call onDelete with story when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<StoryCard story={defaultStory} onDelete={mockOnDelete} />)

      const deleteButton = screen.getByTitle('Delete story')
      await user.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledWith(defaultStory)
    })

    it('should stop event propagation when edit button is clicked', async () => {
      const user = userEvent.setup()
      const parentClickHandler = jest.fn()

      render(
        <div onClick={parentClickHandler}>
          <StoryCard story={defaultStory} onEdit={mockOnEdit} />
        </div>
      )

      const editButton = screen.getByTitle('Edit story')
      await user.click(editButton)

      expect(mockOnEdit).toHaveBeenCalled()
      expect(parentClickHandler).not.toHaveBeenCalled()
    })

    it('should stop event propagation when delete button is clicked', async () => {
      const user = userEvent.setup()
      const parentClickHandler = jest.fn()

      render(
        <div onClick={parentClickHandler}>
          <StoryCard story={defaultStory} onDelete={mockOnDelete} />
        </div>
      )

      const deleteButton = screen.getByTitle('Delete story')
      await user.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalled()
      expect(parentClickHandler).not.toHaveBeenCalled()
    })
  })

  describe('Drag and Drop Integration', () => {
    it('should apply drag listeners when provided', () => {
      render(<StoryCard story={defaultStory} dragListeners={mockDragListeners} />)

      const draggableArea = screen.getByText('Test Story Title').closest('[class*="cursor-grab"]')
      expect(draggableArea).toBeInTheDocument()
    })

    it('should apply correct cursor classes when drag listeners are provided', () => {
      render(<StoryCard story={defaultStory} dragListeners={mockDragListeners} />)

      const draggableArea = screen.getByText('Test Story Title').closest('[class*="cursor-grab"]')
      expect(draggableArea).toHaveClass('cursor-grab')
      expect(draggableArea).toHaveClass('active:cursor-grabbing')
    })

    it('should not apply cursor classes when drag listeners are not provided', () => {
      render(<StoryCard story={defaultStory} />)

      const mainArea = screen.getByText('Test Story Title').parentElement!.parentElement!
      expect(mainArea).not.toHaveClass('cursor-grab')
      expect(mainArea).not.toHaveClass('active:cursor-grabbing')
    })
  })

  describe('Content Truncation', () => {
    it('should truncate long titles appropriately', () => {
      const longTitleStory = createMockStory({
        ...defaultStory,
        title: 'This is a very long story title that should be truncated when it exceeds the maximum line limit for the title area to maintain a clean layout',
      })

      render(<StoryCard story={longTitleStory} />)

      const titleElement = screen.getByText(/This is a very long story title/)
      expect(titleElement).toHaveClass('line-clamp-2')
    })

    it('should truncate long descriptions appropriately', () => {
      const longDescriptionStory = createMockStory({
        ...defaultStory,
        description: 'This is a very long description that goes on and on and should be truncated when it exceeds the maximum line limit for the description area to maintain a clean and consistent card layout across all story cards in the board',
      })

      render(<StoryCard story={longDescriptionStory} />)

      const descriptionElement = screen.getByText(/This is a very long description/)
      expect(descriptionElement).toHaveClass('line-clamp-3')
    })
  })

  describe('Hover States', () => {
    it('should show action buttons on hover through CSS classes', () => {
      render(<StoryCard story={defaultStory} onEdit={mockOnEdit} onDelete={mockOnDelete} />)

      const actionContainer = screen.getByTitle('Edit story').parentElement!
      expect(actionContainer).toHaveClass('opacity-0')
      expect(actionContainer).toHaveClass('group-hover:opacity-100')
    })

    it('should have hover shadow effect through CSS classes', () => {
      render(<StoryCard story={defaultStory} />)

      const cardElement = screen.getByText('Test Story Title').closest('.bg-white')!
      expect(cardElement).toHaveClass('hover:shadow-lg')
      expect(cardElement).toHaveClass('transition-all')
    })
  })

  describe('Accessibility', () => {
    it('should have proper button types for action buttons', () => {
      render(<StoryCard story={defaultStory} onEdit={mockOnEdit} onDelete={mockOnDelete} />)

      const editButton = screen.getByTitle('Edit story')
      const deleteButton = screen.getByTitle('Delete story')

      expect(editButton).toHaveAttribute('type', 'button')
      expect(deleteButton).toHaveAttribute('type', 'button')
    })

    it('should have proper title attributes for action buttons', () => {
      render(<StoryCard story={defaultStory} onEdit={mockOnEdit} onDelete={mockOnDelete} />)

      expect(screen.getByTitle('Edit story')).toBeInTheDocument()
      expect(screen.getByTitle('Delete story')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing description gracefully', () => {
      const storyWithoutDescription = createMockStory({
        ...defaultStory,
        description: undefined,
      })

      render(<StoryCard story={storyWithoutDescription} />)

      expect(screen.getByText('Test Story Title')).toBeInTheDocument()
      // Should still render the card structure
      expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument()
    })

    it('should handle missing assigneeId gracefully', () => {
      const storyWithoutAssigneeId = createMockStory({
        ...defaultStory,
        assigneeId: undefined,
        assignee: null,
      })

      render(<StoryCard story={storyWithoutAssigneeId} />)

      expect(screen.getByText('Test Story Title')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('should format date correctly for different locales', () => {
      const dateStory = createMockStory({
        ...defaultStory,
        createdAt: new Date('2023-12-01'),
      })

      render(<StoryCard story={dateStory} />)

      expect(screen.getByText('Dec 1, 2023')).toBeInTheDocument()
    })
  })
})