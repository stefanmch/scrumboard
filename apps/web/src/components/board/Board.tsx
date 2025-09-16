'use client'

import { useState } from 'react'
import { DndContext, DragOverlay, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { BoardColumn } from './BoardColumn'
import { StoryCard } from '@/components/story/StoryCard'
import { StoryEditModal } from '@/components/modals/StoryEditModal'
import { initialColumns } from '@/lib/mockData'
import { Column, Story } from '@/types'

// --- Board ---
export function Board() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [editingStory, setEditingStory] = useState<Story | null>(null)

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

  const handleDragOver = (event: DragOverEvent) => {
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
    } else if (overStory && overStory.id !== theStory.id) {
      // Reorder within same column or move to specific position in other column
      const targetColumn = findColumnByStoryId(overStory.id)
      if (!targetColumn) return

      if (fromColumn.id === targetColumn.id) {
        // reorder within same column
        setColumns(prev => prev.map(col => {
          if (col.id !== fromColumn.id) return col
          const oldIndex = col.stories.findIndex(s => s.id === theStory.id)
          const newIndex = col.stories.findIndex(s => s.id === overStory.id)
          if (oldIndex === -1 || newIndex === -1) return col
          const reordered = arrayMove(col.stories, oldIndex, newIndex)
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
            return { ...col, stories: newStories.map((s, i) => ({ ...s, rank: i + 1 })) }
          }
          return col
        }))
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

  const handleSaveStory = (updatedStory: Story) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      stories: col.stories.map(s => (s.id === updatedStory.id ? updatedStory : s)),
    })))
    setEditingStory(null)
  }
  const handleAddStory = (columnStatus: 'todo' | 'in-progress' | 'done') => {
    const target = columns.find(c => c.status === columnStatus)
    if (!target) return

    const newStory: Story = {
      id: `story-${Date.now()}`,
      title: 'New Story',
      description: 'Add your story description here...',
      points: 3,
      status: columnStatus,
      assignee: '',
      rank: target.stories.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setColumns(prev => prev.map(col => (col.id === target.id ? { ...col, stories: [...col.stories, newStory] } : col)))
    setEditingStory(newStory)
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
