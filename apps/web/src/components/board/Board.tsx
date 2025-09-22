'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { BoardColumn } from './BoardColumn'
import { StoryCard } from '@/components/story/StoryCard'
import { StoryEditModal } from '@/components/modals/StoryEditModal'
import { storiesApi } from '@/lib/api'
import { Column, Story, StoryStatus } from '@/types'

// --- Board ---
export function Board() {
  const [columns, setColumns] = useState<Column[]>([])
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [isDragReady, setIsDragReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load stories from API and prevent hydration mismatch
  useEffect(() => {
    loadStories();
    setIsDragReady(true);
  }, []);

  const loadStories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stories = await storiesApi.getAll();

      // Group stories by status
      const todoStories = stories.filter(s => s.status === 'TODO').sort((a, b) => a.rank - b.rank);
      const inProgressStories = stories.filter(s => s.status === 'IN_PROGRESS').sort((a, b) => a.rank - b.rank);
      const doneStories = stories.filter(s => s.status === 'DONE').sort((a, b) => a.rank - b.rank);

      setColumns([
        {
          id: 'todo',
          title: 'To Do',
          status: 'TODO',
          stories: todoStories,
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          status: 'IN_PROGRESS',
          stories: inProgressStories,
        },
        {
          id: 'done',
          title: 'Done',
          status: 'DONE',
          stories: doneStories,
        },
      ]);
    } catch (err) {
      console.error('Failed to load stories:', err);
      setError('Failed to load stories. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const findStoryById = (storyId: string): Story | null => {
    for (const column of columns) {
      const story = column.stories.find(s => s.id === storyId)
      if (story) return story
    }
    return null
  }

  const findColumnByStoryId = (storyId: string): Column | null => {
    for (const column of columns) {
      if (column.stories.some(s => s.id === storyId)) return column
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const story = findStoryById(active.id as string)
    setActiveStory(story)
  }

  const handleDragOver = async (event: DragOverEvent) => {
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
      // Move to a different column (append to end)
      setColumns(prev => prev.map(col => {
        if (col.id === fromColumn.id) {
          const filtered = col.stories.filter(s => s.id !== theStory.id)
          return { ...col, stories: filtered.map((s, i) => ({ ...s, rank: i + 1 })) }
        } else if (col.id === overColumn.id) {
          const updated = { ...theStory, status: overColumn.status, rank: col.stories.length + 1, updatedAt: new Date() }
          return { ...col, stories: [...col.stories, updated] }
        }
        return col
      }))

      // Update status in API
      try {
        await storiesApi.updateStatus(theStory.id, overColumn.status);
      } catch (err) {
        console.error('Failed to update story status:', err);
      }
    } else if (overStory && overStory.id !== theStory.id) {
      // Reorder within same column or move to specific position in other column
      const targetColumn = findColumnByStoryId(overStory.id)
      if (!targetColumn) return

      let storyIdsToUpdate: string[] = [];

      if (fromColumn.id === targetColumn.id) {
        // reorder within same column
        setColumns(prev => prev.map(col => {
          if (col.id !== fromColumn.id) return col
          const oldIndex = col.stories.findIndex(s => s.id === theStory.id)
          const newIndex = col.stories.findIndex(s => s.id === overStory.id)
          if (oldIndex === -1 || newIndex === -1) return col
          const reordered = arrayMove(col.stories, oldIndex, newIndex)
          storyIdsToUpdate = reordered.map(s => s.id);
          return {
            ...col,
            stories: reordered.map((s, i) => ({
              ...s,
              rank: i + 1,
              updatedAt: s.id === theStory.id ? new Date() : s.updatedAt,
            })),
          }
        }))
      } else {
        // move to other column at overStory position
        setColumns(prev => prev.map(col => {
          if (col.id === fromColumn.id) {
            const filtered = col.stories.filter(s => s.id !== theStory.id)
            return { ...col, stories: filtered.map((s, i) => ({ ...s, rank: i + 1 })) }
          } else if (col.id === targetColumn.id) {
            const idx = col.stories.findIndex(s => s.id === overStory.id)
            const updated = { ...theStory, status: targetColumn.status, updatedAt: new Date() }
            const newStories = [...col.stories]
            newStories.splice(idx, 0, updated)
            storyIdsToUpdate = newStories.map(s => s.id);
            return { ...col, stories: newStories.map((s, i) => ({ ...s, rank: i + 1 })) }
          }
          return col
        }))

        // Update status in API if moving to different column
        try {
          await storiesApi.updateStatus(theStory.id, targetColumn.status);
        } catch (err) {
          console.error('Failed to update story status:', err);
        }
      }

      // Update reordering in API
      if (storyIdsToUpdate.length > 0) {
        try {
          await storiesApi.reorder(storyIdsToUpdate);
        } catch (err) {
          console.error('Failed to reorder stories:', err);
        }
      }
    }
  }

  const handleDragEnd = () => {
    setActiveStory(null)
  }

  const handleEditStory = (story: Story) => {
    // next microtask to avoid backdrop close race
    Promise.resolve().then(() => setEditingStory(story))
  }

  const handleSaveStory = async (updatedStory: Story) => {
    try {
      const savedStory = await storiesApi.update(updatedStory.id, {
        title: updatedStory.title,
        description: updatedStory.description,
        storyPoints: updatedStory.storyPoints,
        assigneeId: updatedStory.assigneeId,
      });

      setColumns(prev => prev.map(col => ({
        ...col,
        stories: col.stories.map(s => (s.id === savedStory.id ? savedStory : s)),
      })))
    } catch (err) {
      console.error('Failed to save story:', err);
      setError('Failed to save story. Please try again.');
    }
    setEditingStory(null)
  }
  const handleAddStory = async (columnStatus: StoryStatus) => {
    const target = columns.find(c => c.status === columnStatus)
    if (!target) return

    try {
      const newStory = await storiesApi.create({
        title: 'New Story',
        description: 'Add your story description here...',
        storyPoints: 3,
        status: columnStatus,
      });

      setColumns(prev => prev.map(col =>
        col.id === target.id
          ? { ...col, stories: [...col.stories, newStory] }
          : col
      ));
      setEditingStory(newStory);
    } catch (err) {
      console.error('Failed to create story:', err);
      setError('Failed to create story. Please try again.');
    }
  }

  const handleDeleteStory = async (storyToDelete: Story) => {
    try {
      await storiesApi.delete(storyToDelete.id);

      setColumns(prev => prev.map(col => ({
        ...col,
        stories: col.stories.filter(s => s.id !== storyToDelete.id),
      })));
    } catch (err) {
      console.error('Failed to delete story:', err);
      setError('Failed to delete story. Please try again.');
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading stories...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="flex flex-col justify-center items-center h-64">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadStories}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render static version during SSR, interactive version after hydration
  if (!isDragReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-gray-600">Drag stories between columns, click to edit, or add new stories</p>
        </div>
        {/* Board - Static Version */}
        <div className="flex gap-8 overflow-x-auto pb-8">
          {columns.map(column => (
            <BoardColumn
              key={column.id}
              column={column}
              onAddStory={() => handleAddStory(column.status)}
              onEditStory={handleEditStory}
              onDeleteStory={handleDeleteStory}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
          {/* Header */}
          <div className="mb-8">
            <p className="text-gray-600">Drag stories between columns, click to edit, or add new stories</p>
          </div>
          {/* Board */}
          <div className="flex gap-8 overflow-x-auto pb-8">
            {columns.map(column => (
              <BoardColumn
                key={column.id}
                column={column}
                onAddStory={() => handleAddStory(column.status)}
                onEditStory={handleEditStory}
                onDeleteStory={handleDeleteStory}
              />
            ))}
          </div>
        </div>
        {/* Drag Overlay */}
        <DragOverlay>
          {activeStory ? (
            <div className="transform rotate-3 shadow-2xl">
              <StoryCard story={activeStory} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {/* Story Edit Modal */}
      <StoryEditModal story={editingStory} isOpen={!!editingStory} onClose={() => setEditingStory(null)} onSave={handleSaveStory} />
    </>
  )
}
