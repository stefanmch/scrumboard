'use client'

import React from 'react'
import { FileText, Clock, Calendar } from 'lucide-react'
import type { Project } from '@/lib/projects/api'
import { Button } from '@/components/forms/Button'

export interface ProjectCardProps {
  project: Project
  onView?: (project: Project) => void
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  isLoading?: boolean
}

const STATUS_COLORS = {
  PLANNING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onView,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {project.name}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                STATUS_COLORS[project.status]
              }`}
            >
              {project.status.replace('_', ' ')}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Stories
          </span>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {project.storyCount || 0}
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Sprints
          </span>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {project.sprintCount || 0}
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs mb-1">
            Created
          </span>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {onView && (
          <Button
            onClick={() => onView(project)}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="flex-1"
          >
            View
          </Button>
        )}
        {onEdit && (
          <Button
            onClick={() => onEdit(project)}
            variant="ghost"
            size="sm"
            disabled={isLoading}
          >
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            onClick={() => onDelete(project)}
            variant="danger"
            size="sm"
            disabled={isLoading}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
