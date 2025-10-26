'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Filter as FilterIcon,
  LayoutList,
  Network,
  MessageSquare,
  Edit,
  GripVertical,
} from 'lucide-react'
import { BacklogFilters } from '@/components/backlog/BacklogFilters'
import { StoryHierarchyTree } from '@/components/backlog/StoryHierarchyTree'
import { StoryRefinementModal } from '@/components/backlog/StoryRefinementModal'
import { StoryCommentsPanel } from '@/components/backlog/StoryCommentsPanel'
import { StoryEditModal } from '@/components/modals/StoryEditModal'
import { useToast } from '@/components/ui/Toast'
import { enhancedStoriesApi, BacklogFilters as BacklogFiltersType } from '@/lib/api/stories'
import { storiesApi } from '@/lib/api'
import { Story } from '@/types'
import { useProject } from '@/contexts/ProjectContext'

interface SortableStoryRowProps {
  story: Story
  onEdit: () => void
  onRefine: () => void
  onComment: () => void
}

function SortableStoryRow({ story, onEdit, onRefine, onComment }: SortableStoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: story.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30'
      case 'MEDIUM':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
      case 'LOW':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
    }
  }

  const getRefinementColor = (status?: string) => {
    switch (status) {
      case 'NOT_REFINED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      case 'IN_REFINEMENT':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      case 'REFINED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'NEEDS_SPLITTING':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Story Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {story.title}
            </h3>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={onComment}
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="Comments"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={onRefine}
                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                title="Refine Story"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </div>

          {story.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {story.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {/* Priority */}
            {story.priority && (
              <span
                className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(
                  story.priority
                )}`}
              >
                {story.priority}
              </span>
            )}

            {/* Refinement Status */}
            <span
              className={`px-2 py-1 text-xs rounded-full ${getRefinementColor(
                story.refinementStatus
              )}`}
            >
              {story.refinementStatus?.replace(/_/g, ' ') || 'NOT REFINED'}
            </span>

            {/* Story Points */}
            {story.storyPoints !== undefined && (
              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                {story.storyPoints} pts
              </span>
            )}

            {/* Status */}
            <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
              {story.status.replace(/_/g, ' ')}
            </span>

            {/* Assignee */}
            {story.assignee && (
              <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                {story.assignee.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BacklogPage() {
  const { selectedProject } = useProject()
  const [stories, setStories] = useState<Story[]>([])
  const [filters, setFilters] = useState<BacklogFiltersType>({ hasNoSprint: true })
  const [view, setView] = useState<'list' | 'hierarchy'>('list')
  const [sortBy, setSortBy] = useState<'rank' | 'priority' | 'businessValue' | 'storyPoints'>(
    'rank'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [refinementStory, setRefinementStory] = useState<Story | null>(null)
  const [commentStoryId, setCommentStoryId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const toast = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const loadBacklog = useCallback(async () => {
    if (!selectedProject) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const data = await enhancedStoriesApi.getBacklog(selectedProject.id, {
        ...filters,
        sortBy,
        sortOrder: 'asc',
      })
      setStories(data)
    } catch (error) {
      toast.showError(error as Error, 'Failed to load backlog')
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject, filters, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadBacklog()
  }, [loadBacklog])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = stories.findIndex(s => s.id === active.id)
    const newIndex = stories.findIndex(s => s.id === over.id)

    // Optimistic update
    const reorderedStories = arrayMove(stories, oldIndex, newIndex)
    setStories(reorderedStories)

    try {
      // Persist to backend
      if (!selectedProject) return
      await enhancedStoriesApi.reorderBacklog(
        selectedProject.id,
        reorderedStories.map(s => s.id)
      )
    } catch (error) {
      // Revert on error
      toast.showError(error as Error, 'Failed to reorder stories')
      setStories(stories)
    }
  }

  const handleSaveStory = async (updatedStory: Story) => {
    // Check if this is a new story (draft ID) - declare outside try/catch
    const isNewStory = updatedStory.id.startsWith('draft-')

    try {
      let saved: Story
      if (isNewStory) {
        // Create new story
        saved = await storiesApi.create({
          title: updatedStory.title,
          description: updatedStory.description || '',
          storyPoints: updatedStory.storyPoints,
          status: updatedStory.status || 'TODO',
          assigneeId: updatedStory.assigneeId,
        })
        // Add to stories list
        setStories([saved, ...stories])
        toast.showSuccess('Story created successfully')
      } else {
        // Update existing story
        saved = await storiesApi.update(updatedStory.id, {
          title: updatedStory.title,
          description: updatedStory.description,
          storyPoints: updatedStory.storyPoints,
          assigneeId: updatedStory.assigneeId,
        })
        // Update in stories list
        setStories(stories.map(s => (s.id === saved.id ? saved : s)))
        toast.showSuccess('Story updated successfully')
      }

      setSelectedStory(null)
    } catch (error) {
      toast.showError(error as Error, isNewStory ? 'Failed to create story' : 'Failed to update story')
      throw error
    }
  }

  const handleAddStory = () => {
    if (!selectedProject) {
      toast.showError('Please select a project first')
      return
    }

    // Create a draft story object to pass to the modal
    const draftStory: Story = {
      id: `draft-${Date.now()}`,
      title: '',
      description: '',
      status: 'TODO',
      storyPoints: 1,
      rank: stories.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: selectedProject.id,
      creatorId: 'default-user',
      tags: [],
      priority: 'MEDIUM',
      type: 'STORY',
      refinementStatus: 'NOT_REFINED',
      sprintId: null,
      assigneeId: null,
      parentId: null,
    }
    setSelectedStory(draftStory)
  }

  const handleRefinementSave = (story: Story) => {
    setStories(stories.map(s => (s.id === story.id ? story : s)))
    setRefinementStory(null)
  }

  const clearFilters = () => {
    setFilters({ hasNoSprint: true })
  }

  if (!selectedProject) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please select a project to view the backlog
            </p>
            <a
              href="/projects"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
            >
              Select Project
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading backlog...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Product Backlog
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {stories.length} stories · {stories.filter(s => s.refinementStatus === 'REFINED').length} refined
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors ${
                view === 'list'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setView('hierarchy')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors ${
                view === 'hierarchy'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Network className="w-4 h-4" />
              Hierarchy
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'rank' | 'priority' | 'businessValue' | 'storyPoints')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="rank">Manual Order</option>
            <option value="priority">Priority</option>
            <option value="businessValue">Business Value</option>
            <option value="storyPoints">Story Points</option>
          </select>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
              showFilters
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <FilterIcon className="w-4 h-4" />
            Filters
          </button>

          {/* Add Story */}
          <button
            onClick={handleAddStory}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Story
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6">
          <BacklogFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClear={clearFilters}
          />
        </div>
      )}

      {/* Stories View */}
      {view === 'list' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {stories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No stories in backlog matching your filters
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                stories.map(story => (
                  <SortableStoryRow
                    key={story.id}
                    story={story}
                    onEdit={() => setSelectedStory(story)}
                    onRefine={() => setRefinementStory(story)}
                    onComment={() => setCommentStoryId(story.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <StoryHierarchyTree
            stories={stories}
            onStoryClick={story => setRefinementStory(story)}
            selectedStoryId={refinementStory?.id}
          />
        </div>
      )}

      {/* Modals */}
      <StoryEditModal
        story={selectedStory}
        isOpen={!!selectedStory}
        onClose={() => setSelectedStory(null)}
        onSave={handleSaveStory}
      />

      <StoryRefinementModal
        story={refinementStory}
        isOpen={!!refinementStory}
        onClose={() => setRefinementStory(null)}
        onSave={handleRefinementSave}
      />

      <StoryCommentsPanel
        storyId={commentStoryId || ''}
        isOpen={!!commentStoryId}
        onClose={() => setCommentStoryId(null)}
      />
    </div>
  )
}
