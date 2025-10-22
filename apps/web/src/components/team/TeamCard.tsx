'use client'

import React from 'react'
import { Users, Calendar } from 'lucide-react'
import type { Team } from '@/lib/teams/api'
import { Button } from '@/components/forms/Button'

export interface TeamCardProps {
  team: Team
  onView?: (team: Team) => void
  onEdit?: (team: Team) => void
  onDelete?: (team: Team) => void
  isLoading?: boolean
}

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  onView,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {team.name}
          </h3>
          {team.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {team.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{team.memberCount || 0} members</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{new Date(team.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {onView && (
          <Button
            onClick={() => onView(team)}
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
            onClick={() => onEdit(team)}
            variant="ghost"
            size="sm"
            disabled={isLoading}
          >
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            onClick={() => onDelete(team)}
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
