'use client'

import React from 'react'
import { Mail, UserX, Settings } from 'lucide-react'
import type { TeamMember, UserRole } from '@/lib/teams/api'
import { Button } from '@/components/forms/Button'
import { RoleBadge } from './RoleBadge'

export interface MemberListProps {
  members: TeamMember[]
  currentUserId?: string
  onRemove?: (member: TeamMember) => void
  onChangeRole?: (member: TeamMember) => void
  isLoading?: boolean
  isAdmin?: boolean
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentUserId,
  onRemove,
  onChangeRole,
  isLoading = false,
  isAdmin = false
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Team Members ({members.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {members.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No members yet
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                {member.userAvatar ? (
                  <img
                    src={member.userAvatar}
                    alt={member.userName || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                      {member.userName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {member.userName || 'Unknown User'}
                    </h4>
                    <RoleBadge role={member.role} />
                    {currentUserId === member.userId && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        (You)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <Mail className="w-3 h-3" />
                    <span>{member.userEmail}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {isAdmin && currentUserId !== member.userId && (
                <div className="flex gap-2">
                  {onChangeRole && (
                    <Button
                      onClick={() => onChangeRole(member)}
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      title="Change role"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                  {onRemove && (
                    <Button
                      onClick={() => onRemove(member)}
                      variant="danger"
                      size="sm"
                      disabled={isLoading}
                      title="Remove member"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
