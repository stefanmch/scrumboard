'use client'

import { Sprint, SprintMetrics } from '@/types'
import { Calendar, Target, TrendingUp, CheckCircle2 } from 'lucide-react'

interface SprintHeaderProps {
  sprint: Sprint
  metrics?: SprintMetrics
}

export function SprintHeader({ sprint, metrics }: SprintHeaderProps) {
  const startDate = new Date(sprint.startDate).toLocaleDateString()
  const endDate = new Date(sprint.endDate).toLocaleDateString()

  const progressPercentage = metrics ? Math.round(metrics.completionPercentage) : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      {/* Title and Status */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{sprint.name}</h1>
          {sprint.goal && (
            <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <Target className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-lg">{sprint.goal}</p>
            </div>
          )}
        </div>

        <span
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            sprint.status === 'ACTIVE'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
              : sprint.status === 'PLANNING'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
          }`}
        >
          {sprint.status}
        </span>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <Calendar className="w-5 h-5" />
        <span className="text-sm">
          {startDate} - {endDate}
        </span>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Total Points</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.totalStoryPoints}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{metrics.completedStoryPoints}</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Remaining</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{metrics.remainingStoryPoints}</p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Progress</span>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{progressPercentage}%</p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {metrics && (
        <div className="mt-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
