'use client'

import { useState, useCallback, useMemo } from 'react'
import { DndContext, DragOverlay, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { BoardColumn } from '@/components/board/BoardColumn'
import { StoryCard } from '@/components/story/StoryCard'
import { Column, Story, StoryStatus } from '@/types'
import { storiesApi } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

interface SprintBoardProps {
  stories: Story[]
  onStoriesChange: (stories: Story[]) => void
  onEditStory?: (story: Story) => void
}

export function SprintBoard({ stories, onStoriesChange, onEditStory }: SprintBoardProps) {
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const toast = useToast()

  // Organize stories into columns
  const columns = useMemo<Column[]>(() => {
    const groupedStories = stories.reduce(
      (acc, story) => {
        acc[story.status].push(story)
        return acc
      },
      {
        TODO: [],
        IN_PROGRESS: [],
        DONE: [],
        BLOCKED: [],
      } as Record<StoryStatus, Story[]>
    )

    return [
      {
        id: 'todo',
        title: 'To Do',
        status: 'TODO' as const,
        stories: groupedStories['TODO'].sort((a, b) => a.rank - b.rank),
      },
      {
        id: 'in-progress',
        title: 'In Progress',
        status: 'IN_PROGRESS' as const,
        stories: groupedStories['IN_PROGRESS'].sort((a, b) => a.rank - b.rank),
      },
      {
        id: 'done',
        title: 'Done',
        status: 'DONE' as const,
        stories: groupedStories['DONE'].sort((a, b) => a.rank - b.rank),
      },
      {
        id: 'blocked',
        title: 'Blocked',
        status: 'BLOCKED' as const,
        stories: groupedStories['BLOCKED'].sort((a, b) => a.rank - b.rank),
      },
    ]
  }, [stories])

  const findStoryById = useCallback(
    (storyId: string): Story | null => {
      return stories.find(s => s.id === storyId) || null
    },
    [stories]
  )

  const findColumnByStoryId = useCallback(
    (storyId: string): Column | null => {
      return columns.find(col => col.stories.some(s => s.id === storyId)) || null
    },
    [columns]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const story = findStoryById(active.id as string)
    setActiveStory(story)
  }, [findStoryById])

  const handleDragOver = useCallback(
    async (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeStoryId = active.id as string
      const overTarget = over.id as string

      const theStory = findStoryById(activeStoryId)
      const fromColumn = findColumnByStoryId(activeStoryId)
      if (!theStory || !fromColumn) return

      const overColumn = columns.find(c => c.id === overTarget)
      const overStory = findStoryById(overTarget)

      if (overColumn && fromColumn.id !== overColumn.id) {
        // Move to different column
        try {
          await storiesApi.updateStatus(theStory.id, overColumn.status)

          const updatedStories = stories.map(s =>
            s.id === theStory.id ? { ...s, status: overColumn.status } : s
          )
          onStoriesChange(updatedStories)
        } catch (error) {
          toast.showError(error as Error, 'Failed to update story status')
        }
      } else if (overStory && overStory.id !== theStory.id) {
        // Reorder within same column or move to position
        const targetColumn = findColumnByStoryId(overStory.id)
        if (!targetColumn) return

        if (fromColumn.id === targetColumn.id) {
          // Reorder within same column
          const currentColumn = columns.find(c => c.id === fromColumn.id)
          if (!currentColumn) return

          const oldIndex = currentColumn.stories.findIndex(s => s.id === theStory.id)
          const newIndex = currentColumn.stories.findIndex(s => s.id === overStory.id)
          if (oldIndex === -1 || newIndex === -1) return

          const reordered = arrayMove(currentColumn.stories, oldIndex, newIndex)
          const storyIdsToUpdate = reordered.map(s => s.id)

          try {
            await storiesApi.reorder(storyIdsToUpdate)

            const updatedStories = stories.map(s => {
              const index = storyIdsToUpdate.indexOf(s.id)
              return index !== -1 ? { ...s, rank: index + 1 } : s
            })
            onStoriesChange(updatedStories)
          } catch (error) {
            toast.showError(error as Error, 'Failed to reorder stories')
          }
        }
      }
    },
    [columns, stories, findStoryById, findColumnByStoryId, onStoriesChange, toast]
  )

  const handleDragEnd = useCallback(() => {
    setActiveStory(null)
  }, [])

  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-8">
        {columns.map(column => (
          <BoardColumn
            key={column.id}
            column={column}
            onEditStory={onEditStory}
            onDeleteStory={() => {}}
            onAddStory={() => {}}
          />
        ))}
      </div>

      <DragOverlay>
        {activeStory ? (
          <div className="transform rotate-3 shadow-2xl">
            <StoryCard story={activeStory} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
