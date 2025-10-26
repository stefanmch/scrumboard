'use client'

import { useState, useEffect } from 'react'
import { X, FolderPlus } from 'lucide-react'
import { projectsApi, type CreateProjectData } from '@/lib/api/projects'
import { teamsApi, type Team } from '@/lib/teams/api'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadTeams()
    }
  }, [isOpen])

  const loadTeams = async () => {
    try {
      setIsLoadingTeams(true)
      const data = await teamsApi.getAll()
      setTeams(data)

      // Auto-select first team if available
      if (data.length > 0 && selectedTeamIds.length === 0) {
        setSelectedTeamIds([data[0].id])
      }
    } catch (err) {
      console.error('Failed to load teams:', err)
      setError('Failed to load teams. Please try again.')
    } finally {
      setIsLoadingTeams(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    if (selectedTeamIds.length === 0) {
      setError('Please select at least one team')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const projectData: CreateProjectData = {
        name: name.trim(),
        description: description.trim() || undefined,
        teamIds: selectedTeamIds,
      }

      await projectsApi.create(selectedTeamIds[0], projectData)

      // Reset form
      setName('')
      setDescription('')
      setSelectedTeamIds([])

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to create project:', err)
      const error = err as Error
      setError(error.message || 'Failed to create project. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId)
      } else {
        return [...prev, teamId]
      }
    })
  }

  const handleClose = () => {
    if (!isLoading) {
      setName('')
      setDescription('')
      setSelectedTeamIds([])
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FolderPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold">Create New Project</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E-commerce Platform"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              disabled={isLoading}
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {name.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Building a scalable e-commerce platform with React and NestJS"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 resize-none"
              disabled={isLoading}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Teams <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Choose one or more teams to associate with this project
            </p>

            {isLoadingTeams ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                ))}
              </div>
            ) : teams.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-800 dark:text-yellow-300">
                <p>No teams available. Please create a team first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                {teams.map((team) => (
                  <label
                    key={team.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTeamIds.includes(team.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={() => handleTeamToggle(team.id)}
                      disabled={isLoading}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{team.name}</div>
                      {team.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {team.description}
                        </div>
                      )}
                      {team.memberCount !== undefined && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedTeamIds.length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                {selectedTeamIds.length} {selectedTeamIds.length === 1 ? 'team' : 'teams'} selected
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || selectedTeamIds.length === 0 || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
