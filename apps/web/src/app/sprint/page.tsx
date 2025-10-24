'use client'

import { useState, useEffect, useCallback } from 'react'
import { SprintHeader } from '@/components/sprint/SprintHeader'
import { SprintBoard } from '@/components/sprint/SprintBoard'
import { BurndownChart } from '@/components/sprint/BurndownChart'
import { StoryEditModal } from '@/components/modals/StoryEditModal'
import { useToast } from '@/components/ui/Toast'
import { sprintsApi } from '@/lib/api-sprints'
import { storiesApi } from '@/lib/api'
import { Sprint, Story, SprintMetrics, BurndownDataPoint, Comment } from '@/types'
import { MessageSquare, CheckCircle2 } from 'lucide-react'

export default function SprintPage() {
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [sprintStories, setSprintStories] = useState<Story[]>([])
  const [metrics, setMetrics] = useState<SprintMetrics | null>(null)
  const [burndownData, setBurndownData] = useState<BurndownDataPoint[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const toast = useToast()

  const loadSprintData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Get active sprints
      const sprints = await sprintsApi.getAll({ status: 'ACTIVE' })

      if (sprints.length === 0) {
        setIsLoading(false)
        return
      }

      const sprint = sprints[0] // Get first active sprint

      // Load all sprint data in parallel
      const [stories, metricsData, commentsData] = await Promise.all([
        storiesApi.getAll(undefined, sprint.id),
        sprintsApi.getMetrics(sprint.id),
        sprintsApi.getComments(sprint.id),
      ])

      setActiveSprint(sprint)
      setSprintStories(stories)
      setMetrics(metricsData)
      setBurndownData(metricsData.burndownData)
      setComments(commentsData)
    } catch (error) {
      toast.showError(error as Error, 'Failed to load sprint data')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSprintData()
  }, [loadSprintData])

  const handleStoriesChange = useCallback((updatedStories: Story[]) => {
    setSprintStories(updatedStories)
    // Recalculate metrics locally for instant feedback
    const totalStoryPoints = updatedStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)
    const completedStoryPoints = updatedStories
      .filter(s => s.status === 'DONE')
      .reduce((sum, s) => sum + (s.storyPoints || 0), 0)

    setMetrics({
      totalStoryPoints,
      completedStoryPoints,
      remainingStoryPoints: totalStoryPoints - completedStoryPoints,
      completionPercentage: totalStoryPoints > 0 ? Math.round((completedStoryPoints / totalStoryPoints) * 100) : 0,
      storiesCount: {
        total: updatedStories.length,
        todo: updatedStories.filter(s => s.status === 'TODO').length,
        inProgress: updatedStories.filter(s => s.status === 'IN_PROGRESS').length,
        done: updatedStories.filter(s => s.status === 'DONE').length,
        blocked: updatedStories.filter(s => s.status === 'BLOCKED').length,
      },
      burndownData: metrics?.burndownData || [],
    })
  }, [metrics])

  const handleCompleteSprint = async () => {
    if (!activeSprint) return

    const confirm = window.confirm(
      'Are you sure you want to complete this sprint? This action cannot be undone.'
    )
    if (!confirm) return

    try {
      await sprintsApi.complete(activeSprint.id)
      toast.showSuccess('Sprint completed successfully')
      loadSprintData()
    } catch (error) {
      toast.showError(error as Error, 'Failed to complete sprint')
    }
  }

  const handleAddComment = async () => {
    if (!activeSprint || !newComment.trim()) return

    try {
      const comment = await sprintsApi.addComment(activeSprint.id, newComment)
      setComments([...comments, comment])
      setNewComment('')
      toast.showSuccess('Comment added')
    } catch (error) {
      toast.showError(error as Error, 'Failed to add comment')
    }
  }

  const handleSaveStory = async (updatedStory: Story) => {
    try {
      const saved = await storiesApi.update(updatedStory.id, {
        title: updatedStory.title,
        description: updatedStory.description,
        storyPoints: updatedStory.storyPoints,
        assigneeId: updatedStory.assigneeId,
      })

      setSprintStories(prev => prev.map(s => (s.id === saved.id ? saved : s)))
      setEditingStory(null)
      toast.showSuccess('Story updated successfully')
    } catch (error) {
      toast.showError(error as Error, 'Failed to update story')
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading active sprint...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!activeSprint) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">No Active Sprint</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              There is no active sprint at the moment. Start a sprint from the planning page to
              begin tracking progress.
            </p>
            <a
              href="/planning"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors inline-block"
            >
              Go to Sprint Planning
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Sprint Header with Metrics */}
      <SprintHeader sprint={activeSprint} metrics={metrics || undefined} />

      {/* Action Bar */}
      <div className="flex justify-end gap-4 mb-6">
        <button
          onClick={handleCompleteSprint}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Complete Sprint
        </button>
      </div>

      {/* Sprint Board */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Sprint Board</h2>
        <SprintBoard
          stories={sprintStories}
          onStoriesChange={handleStoriesChange}
          onEditStory={setEditingStory}
        />
      </div>

      {/* Burndown Chart */}
      <div className="mb-8">
        <BurndownChart data={burndownData} />
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Sprint Comments
        </h3>

        {/* Comment List */}
        <div className="space-y-4 mb-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No comments yet</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-gray-900 dark:text-gray-100">{comment.content}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Add Comment */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddComment()}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Story Edit Modal */}
      <StoryEditModal
        story={editingStory}
        isOpen={!!editingStory}
        onClose={() => setEditingStory(null)}
        onSave={handleSaveStory}
      />
    </div>
  )
}
