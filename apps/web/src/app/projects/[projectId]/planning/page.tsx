'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { SprintCard } from '@/components/sprint/SprintCard'
import { SprintFormModal } from '@/components/sprint/SprintFormModal'
import { StoryCard } from '@/components/story/StoryCard'
import { useToast } from '@/components/ui/Toast'
import { sprintsApi } from '@/lib/api-sprints'
import { storiesApi } from '@/lib/api'
import { Sprint, Story } from '@/types'
import { Plus, Calendar } from 'lucide-react'

export default function ProjectPlanningPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [sprints, setSprints] = useState<Sprint[]>([])
  const [backlogStories, setBacklogStories] = useState<Story[]>([])
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null)
  const [isCreatingSprint, setIsCreatingSprint] = useState(false)
  const [isEditingSprint, setIsEditingSprint] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const toast = useToast()

  const loadData = useCallback(async () => {
    if (!projectId) {
      toast.showError('No project selected')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      const [sprintsData, storiesData] = await Promise.all([
        sprintsApi.getAll({ status: 'PLANNING', projectId }),
        storiesApi.getAll(projectId),
      ])

      setSprints(sprintsData)
      setBacklogStories(storiesData.filter(s => !s.sprintId))
    } catch (error) {
      toast.showError(error as Error, 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateSprint = async (data: Partial<Sprint>) => {
    if (!projectId) {
      toast.showError('No project selected')
      return
    }

    try {
      await sprintsApi.create({
        name: data.name!,
        goal: data.goal,
        startDate: new Date(data.startDate!),
        endDate: new Date(data.endDate!),
        capacity: data.capacity,
        projectId: projectId,
      })

      toast.showSuccess('Sprint created successfully')
      setIsCreatingSprint(false)
      loadData()
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string }
      if (err?.status === 409 || err?.message?.includes('overlap')) {
        toast.showError('Sprint dates overlap with an existing active or planning sprint. Please choose different dates or complete the existing sprint first.')
      } else {
        toast.showError(error as Error, 'Failed to create sprint')
      }
      throw error
    }
  }

  const handleUpdateSprint = async (data: Partial<Sprint>) => {
    if (!selectedSprint) return

    try {
      await sprintsApi.update(selectedSprint.id, {
        name: data.name,
        goal: data.goal,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        capacity: data.capacity,
      })

      toast.showSuccess('Sprint updated successfully')
      setIsEditingSprint(false)
      setSelectedSprint(null)
      loadData()
    } catch (error) {
      toast.showError(error as Error, 'Failed to update sprint')
      throw error
    }
  }

  const handleStartSprint = async (sprint: Sprint) => {
    try {
      await sprintsApi.start(sprint.id)
      toast.showSuccess('Sprint started successfully')
      loadData()
    } catch (error) {
      toast.showError(error as Error, 'Failed to start sprint')
    }
  }

  const handleAddStoryToSprint = async (story: Story, sprint: Sprint) => {
    try {
      await storiesApi.moveToSprint(story.id, sprint.id)
      toast.showSuccess('Story added to sprint')
      loadData()
    } catch (error) {
      toast.showError(error as Error, 'Failed to add story to sprint')
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading sprint planning...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Sprint Planning</h1>
            <p className="text-gray-600 dark:text-gray-400">Plan and organize your upcoming sprints</p>
          </div>
          <button
            onClick={() => setIsCreatingSprint(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Sprint
          </button>
        </div>
      </div>

      {/* Sprints Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Planned Sprints ({sprints.length})
        </h2>

        {sprints.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No sprints planned</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first sprint to start planning</p>
            <button
              onClick={() => setIsCreatingSprint(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Sprint
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sprints.map(sprint => (
              <div key={sprint.id} className="relative">
                <SprintCard
                  sprint={sprint}
                  onClick={() => {
                    setSelectedSprint(sprint)
                    setIsEditingSprint(true)
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartSprint(sprint)
                    }}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Start Sprint
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backlog Stories */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Backlog Stories ({backlogStories.length})
        </h2>

        {backlogStories.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">No stories in backlog</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {backlogStories.map(story => (
              <div key={story.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <StoryCard story={story} />
                {sprints.length > 0 && (
                  <div className="mt-3">
                    <select
                      onChange={e => {
                        const sprint = sprints.find(s => s.id === e.target.value)
                        if (sprint) handleAddStoryToSprint(story, sprint)
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Add to sprint...
                      </option>
                      {sprints.map(sprint => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Sprint Modal */}
      <SprintFormModal
        sprint={null}
        isOpen={isCreatingSprint}
        onClose={() => setIsCreatingSprint(false)}
        onSave={handleCreateSprint}
      />

      {/* Edit Sprint Modal */}
      <SprintFormModal
        sprint={selectedSprint}
        isOpen={isEditingSprint}
        onClose={() => {
          setIsEditingSprint(false)
          setSelectedSprint(null)
        }}
        onSave={handleUpdateSprint}
      />
    </div>
  )
}
