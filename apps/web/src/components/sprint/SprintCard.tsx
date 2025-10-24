'use client'

import { Sprint } from '@/types'
import { Calendar, Target, TrendingUp } from 'lucide-react'

interface SprintCardProps {
  sprint: Sprint
  onClick?: () => void
}

export function SprintCard({ sprint, onClick }: SprintCardProps) {
  const startDate = new Date(sprint.startDate).toLocaleDateString()
  const endDate = new Date(sprint.endDate).toLocaleDateString()

  const statusColors = {
    PLANNING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
    COMPLETED: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  }

  const statusIcons = {
    PLANNING: '📋',
    ACTIVE: '🚀',
    COMPLETED: '✅',
  }

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {sprint.name}
          </h3>
          {sprint.goal && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{sprint.goal}</p>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            statusColors[sprint.status]
          }`}
        >
          {statusIcons[sprint.status]} {sprint.status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>
            {startDate} - {endDate}
          </span>
        </div>

        {sprint.goal && (
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{sprint.goal}</span>
          </div>
        )}

        {sprint.capacity && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <TrendingUp className="w-4 h-4" />
            <span>Capacity: {sprint.capacity} points</span>
          </div>
        )}

        {sprint.stories && sprint.stories.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {sprint.stories.length}
              </span>{' '}
              {sprint.stories.length === 1 ? 'story' : 'stories'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
