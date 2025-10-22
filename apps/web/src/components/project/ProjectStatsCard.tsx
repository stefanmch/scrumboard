'use client'

import React from 'react'
import { FileText, CheckCircle, Clock, ListChecks, TrendingUp } from 'lucide-react'
import type { ProjectStats } from '@/lib/projects/api'

export interface ProjectStatsCardProps {
  stats: ProjectStats
  isLoading?: boolean
}

export const ProjectStatsCard: React.FC<ProjectStatsCardProps> = ({ stats, isLoading = false }) => {
  const storiesCompletionRate = stats.totalStories > 0
    ? Math.round((stats.completedStories / stats.totalStories) * 100)
    : 0

  const tasksCompletionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Project Statistics
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Stories</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.completedStories} / {stats.totalStories}
          </p>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
              style={{ width: `${storiesCompletionRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {storiesCompletionRate}% complete
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Sprints</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.completedSprints} / {stats.totalSprints}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
            {stats.activeSprints} active sprint{stats.activeSprints !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Tasks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.completedTasks} / {stats.totalTasks}
          </p>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 dark:bg-purple-500 transition-all"
              style={{ width: `${tasksCompletionRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {tasksCompletionRate}% complete
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Overall</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(stats.completionPercentage)}%
          </p>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-600 dark:bg-orange-500 transition-all"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Project completion
          </p>
        </div>
      </div>
    </div>
  )
}
