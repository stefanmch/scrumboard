'use client'

import { useState, useEffect, useCallback } from 'react'
import { DndContext, DragOverlay, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { BoardColumn } from './BoardColumn'
import { StoryCard } from '@/components/story/StoryCard'
import { StoryEditModal } from '@/components/modals/StoryEditModal'
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { useToast } from '@/components/ui/Toast'
import { storiesApi, ApiError } from '@/lib/api'
import { Column, Story, StoryStatus } from '@/types'

interface ErrorState {
  message: string
  type: 'load' | 'save' | 'delete' | 'drag' | 'network'
  isRetryable: boolean
  originalError?: Error
}

interface LoadingState {
  isLoading: boolean
  operations: Set<string>
}

// --- Board ---
function BoardContent() {
  const [columns, setColumns] = useState<Column[]>([])
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [deletingStory, setDeletingStory] = useState<Story | null>(null)
  const [isDragReady, setIsDragReady] = useState(false)
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: true, operations: new Set() })
  const [error, setError] = useState<ErrorState | null>(null)
  const [lastSuccessfulState, setLastSuccessfulState] = useState<Column[]>([])

  const toast = useToast()

  // Helper function to set operation loading state
  const setOperationLoading = useCallback((operation: string, isLoading: boolean) => {
    setLoadingState(prev => {
      const newOperations = new Set(prev.operations)
      if (isLoading) {
        newOperations.add(operation)
      } else {
        newOperations.delete(operation)
      }
      return {
        isLoading: prev.isLoading,
        operations: newOperations
      }
    })
  }, [])

  // Helper function to handle API errors with user feedback
  const handleApiError = useCallback((error: unknown, operation: string, showToast: boolean = true) => {
    console.error(`Failed to ${operation}:`, error)

    let errorState: ErrorState

    if (error instanceof ApiError) {
      errorState = {
        message: error.getUserFriendlyMessage(),
        type: operation.includes('load') ? 'load' : operation.includes('drag') ? 'drag' : operation.includes('delete') ? 'delete' : 'save',
        isRetryable: error.isRetryable,
        originalError: error
      }

      if (showToast) {
        toast.showError(error, `Failed to ${operation}`)
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      errorState = {
        message: `Failed to ${operation}. ${errorMessage}`,
        type: 'network',
        isRetryable: true,
        originalError: error instanceof Error ? error : new Error(String(error))
      }

      if (showToast) {
        toast.showError(errorMessage, `Failed to ${operation}`)
      }
    }

    setError(errorState)
    return errorState
  }, [toast])

  // Optimistic update with rollback capability
  const withOptimisticUpdate = useCallback(<T>(
    optimisticUpdate: () => void,
    apiCall: () => Promise<T>,
    rollbackUpdate: () => void,
    operation: string
  ): Promise<T | null> => {
    // Save current state for rollback
    const currentColumns = columns

    // Apply optimistic update
    optimisticUpdate()

    // Make API call
    setOperationLoading(operation, true)

    return apiCall()
      .then(result => {
        // Success - update successful state
        setLastSuccessfulState(columns)
        setError(null)
        return result
      })
      .catch(error => {
        // Rollback optimistic update
        rollbackUpdate()
        setColumns(currentColumns)
        handleApiError(error, operation)
        return null
      })
      .finally(() => {
        setOperationLoading(operation, false)
      })
  }, [columns, handleApiError, setOperationLoading])

  // Load stories from API and prevent hydration mismatch
  useEffect(() => {
    loadStories();
    setIsDragReady(true);
  }, []);

  const loadStories = async (showLoadingSpinner: boolean = true) => {
    try {
      if (showLoadingSpinner) {
        setLoadingState(prev => ({ ...prev, isLoading: true }))
      } else {
        setOperationLoading('refresh', true)
      }
      setError(null)

      const stories = await storiesApi.getAll()

      // Group stories by status
      const todoStories = stories.filter(s => s.status === 'TODO').sort((a, b) => a.rank - b.rank)
      const inProgressStories = stories.filter(s => s.status === 'IN_PROGRESS').sort((a, b) => a.rank - b.rank)
      const doneStories = stories.filter(s => s.status === 'DONE').sort((a, b) => a.rank - b.rank)

      const newColumns = [
        {
          id: 'todo',
          title: 'To Do',
          status: 'TODO' as const,
          stories: todoStories,
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          status: 'IN_PROGRESS' as const,
          stories: inProgressStories,
        },
        {
          id: 'done',
          title: 'Done',
          status: 'DONE' as const,
          stories: doneStories,
        },
      ]

      setColumns(newColumns)
      setLastSuccessfulState(newColumns)

      if (!showLoadingSpinner) {
        toast.showSuccess('Stories refreshed successfully')
      }
    } catch (err) {
      const errorState = handleApiError(err, 'load stories', !showLoadingSpinner)

      // If we have a previous successful state, offer to restore it
      if (lastSuccessfulState.length > 0 && errorState?.isRetryable) {
        const toastId = toast.addToast({
          type: 'error',
          title: 'Failed to load stories',
          message: 'Would you like to retry or continue with cached data?',
          duration: 10000,
          action: {
            label: 'Use cached data',
            onClick: () => {
              setColumns(lastSuccessfulState)
              setError(null)
              toast.removeToast(toastId)
            }
          }
        })
      }
    } finally {
      if (showLoadingSpinner) {
        setLoadingState(prev => ({ ...prev, isLoading: false }))
      } else {
        setOperationLoading('refresh', false)
      }
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
      await withOptimisticUpdate(
        () => {
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
        },
        () => storiesApi.updateStatus(theStory.id, overColumn.status),
        () => {
          // Rollback is handled by withOptimisticUpdate
        },
        'update story status'
      )
    } else if (overStory && overStory.id !== theStory.id) {
      // Reorder within same column or move to specific position in other column
      const targetColumn = findColumnByStoryId(overStory.id)
      if (!targetColumn) return

      if (fromColumn.id === targetColumn.id) {
        // reorder within same column
        const currentColumn = columns.find(c => c.id === fromColumn.id)
        if (!currentColumn) return

        const oldIndex = currentColumn.stories.findIndex(s => s.id === theStory.id)
        const newIndex = currentColumn.stories.findIndex(s => s.id === overStory.id)
        if (oldIndex === -1 || newIndex === -1) return

        const reordered = arrayMove(currentColumn.stories, oldIndex, newIndex)
        const storyIdsToUpdate = reordered.map(s => s.id)

        await withOptimisticUpdate(
          () => {
            setColumns(prev => prev.map(col => {
              if (col.id !== fromColumn.id) return col
              return {
                ...col,
                stories: reordered.map((s, i) => ({
                  ...s,
                  rank: i + 1,
                  updatedAt: s.id === theStory.id ? new Date() : s.updatedAt,
                })),
              }
            }))
          },
          () => storiesApi.reorder(storyIdsToUpdate),
          () => {
            // Rollback is handled by withOptimisticUpdate
          },
          'reorder stories'
        )
      } else {
        // move to other column at overStory position
        const targetColumnData = columns.find(c => c.id === targetColumn.id)
        if (!targetColumnData) return

        const idx = targetColumnData.stories.findIndex(s => s.id === overStory.id)
        const updated = { ...theStory, status: targetColumn.status, updatedAt: new Date() }
        const newStories = [...targetColumnData.stories]
        newStories.splice(idx, 0, updated)
        const storyIdsToUpdate = newStories.map(s => s.id)

        await withOptimisticUpdate(
          () => {
            setColumns(prev => prev.map(col => {
              if (col.id === fromColumn.id) {
                const filtered = col.stories.filter(s => s.id !== theStory.id)
                return { ...col, stories: filtered.map((s, i) => ({ ...s, rank: i + 1 })) }
              } else if (col.id === targetColumn.id) {
                return { ...col, stories: newStories.map((s, i) => ({ ...s, rank: i + 1 })) }
              }
              return col
            }))
          },
          async () => {
            // Update status and reorder in sequence
            await storiesApi.updateStatus(theStory.id, targetColumn.status)
            await storiesApi.reorder(storyIdsToUpdate)
          },
          () => {
            // Rollback is handled by withOptimisticUpdate
          },
          'move and reorder story'
        )
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
    const isDraft = updatedStory.id.startsWith('draft-')
    const operation = isDraft ? 'create' : 'update'

    setOperationLoading(`save-${updatedStory.id}`, true)

    try {
      let savedStory: Story

      if (isDraft) {
        // Create new story in database
        savedStory = await storiesApi.create({
          title: updatedStory.title,
          description: updatedStory.description,
          storyPoints: updatedStory.storyPoints,
          status: updatedStory.status,
          assigneeId: updatedStory.assigneeId,
        })

        // Replace draft story with saved story
        setColumns(prev => {
          // First, remove the draft story from all columns
          const columnsWithoutDraft = prev.map(col => ({
            ...col,
            stories: col.stories.filter(s => s.id !== updatedStory.id),
          }))

          // Then, add the saved story to the correct column based on its status
          const newColumns = columnsWithoutDraft.map(col => {
            if (col.status === savedStory.status) {
              return {
                ...col,
                stories: [...col.stories, savedStory],
              }
            }
            return col
          })

          // Update successful state with the new columns
          setLastSuccessfulState(newColumns)
          return newColumns
        })

        toast.showSuccess('Story created successfully')
      } else {
        // Update existing story
        savedStory = await storiesApi.update(updatedStory.id, {
          title: updatedStory.title,
          description: updatedStory.description,
          storyPoints: updatedStory.storyPoints,
          assigneeId: updatedStory.assigneeId,
        })

        setColumns(prev => {
          const newColumns = prev.map(col => ({
            ...col,
            stories: col.stories.map(s => (s.id === savedStory.id ? savedStory : s)),
          }))

          // Update successful state with the new columns
          setLastSuccessfulState(newColumns)
          return newColumns
        })

        toast.showSuccess('Story updated successfully')
      }

      // Clear error after successful save
      setError(null)

      // Clear the editing story state after successful save
      setEditingStory(null)
    } catch (err) {
      const errorState = handleApiError(err, `${operation} story`)

      // Don't close modal on error - let user retry or cancel
      throw errorState?.originalError || err
    } finally {
      setOperationLoading(`save-${updatedStory.id}`, false)
    }
  }

  const handleCloseModal = () => {
    if (editingStory && editingStory.id.startsWith('draft-')) {
      // Remove draft story from local state if user cancels
      setColumns(prev => prev.map(col => ({
        ...col,
        stories: col.stories.filter(s => s.id !== editingStory.id),
      })));
    }
    setEditingStory(null)
  }

  const handleAddStory = (columnStatus: StoryStatus) => {
    const target = columns.find(c => c.status === columnStatus)
    if (!target) return

    // Create a draft story locally (not saved to DB yet)
    const draftStory: Story = {
      id: `draft-${Date.now()}`, // Temporary ID to identify drafts
      title: 'New Story',
      description: 'Add your story description here...',
      storyPoints: 3,
      status: columnStatus,
      priority: 'MEDIUM',
      type: 'FEATURE',
      refinementStatus: 'NOT_REFINED',
      tags: [],
      rank: target.stories.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'default-project',
      creatorId: 'default-user',
      sprintId: null,
      assigneeId: null,
      parentId: null,
      businessValue: null,
      acceptanceCriteria: null,
      assignee: null,
      creator: null,
      parent: null,
      children: [],
      project: null,
      sprint: null,
      tasks: [],
      comments: [],
    };

    // Add draft story to local state
    setColumns(prev => prev.map(col =>
      col.id === target.id
        ? { ...col, stories: [...col.stories, draftStory] }
        : col
    ));

    // Open edit modal for the draft story
    setEditingStory(draftStory);
  }

  const handleDeleteStory = (storyToDelete: Story) => {
    setDeletingStory(storyToDelete);
  }

  const handleConfirmDelete = async () => {
    if (!deletingStory) return

    const isDraft = deletingStory.id.startsWith('draft-')

    if (isDraft) {
      // For draft stories, just remove from local state
      setColumns(prev => prev.map(col => ({
        ...col,
        stories: col.stories.filter(s => s.id !== deletingStory.id),
      })))
      setDeletingStory(null)
      return
    }

    // For saved stories, use optimistic update with API call
    await withOptimisticUpdate(
      () => {
        setColumns(prev => prev.map(col => ({
          ...col,
          stories: col.stories.filter(s => s.id !== deletingStory.id),
        })))
      },
      () => storiesApi.delete(deletingStory.id),
      () => {
        // Rollback is handled by withOptimisticUpdate
      },
      'delete story'
    )

    // Close modal after initiating delete
    setDeletingStory(null)

    // Show success toast
    toast.showSuccess('Story deleted successfully')
  }

  const handleCancelDelete = () => {
    setDeletingStory(null);
  }

  // Show loading state
  if (loadingState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading stories...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state with recovery options
  if (error && error.type === 'load') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="flex flex-col justify-center items-center h-64 max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Stories</h3>
          <p className="text-red-600 mb-6 text-center">{error.message}</p>

          <div className="flex gap-3">
            <button
              onClick={() => loadStories()}
              disabled={loadingState.operations.has('refresh')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loadingState.operations.has('refresh') && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              Retry
            </button>

            {lastSuccessfulState.length > 0 && (
              <button
                onClick={() => {
                  setColumns(lastSuccessfulState)
                  setError(null)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Use Cached Data
              </button>
            )}
          </div>

          {error.isRetryable && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              This appears to be a temporary issue. Please try again in a moment.
            </p>
          )}
        </div>
      </div>
    )
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-gray-600">Drag stories between columns, click to edit, or add new stories</p>
              {error && error.type !== 'load' && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error.message}</p>
                  {error.isRetryable && (
                    <button
                      onClick={() => loadStories(false)}
                      className="mt-2 text-xs text-red-600 underline hover:no-underline"
                    >
                      Refresh to resolve
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {loadingState.operations.size > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Syncing...</span>
                </div>
              )}

              <button
                onClick={() => loadStories(false)}
                disabled={loadingState.operations.has('refresh')}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                title="Refresh stories"
              >
                {loadingState.operations.has('refresh') ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh
              </button>
            </div>
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
      <StoryEditModal
        story={editingStory}
        isOpen={!!editingStory}
        onClose={handleCloseModal}
        onSave={handleSaveStory}
        isLoading={editingStory ? loadingState.operations.has(`save-${editingStory.id}`) : false}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        story={deletingStory}
        isOpen={!!deletingStory}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        isLoading={deletingStory ? loadingState.operations.has(`delete-${deletingStory.id}`) : false}
      />
    </>
  )
}

// Main Board component wrapped with error boundary
export function Board() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Board error:', error, errorInfo)
        // Could send to error tracking service
      }}
    >
      <BoardContent />
    </ErrorBoundary>
  )
}
