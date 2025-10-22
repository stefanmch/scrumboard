'use client'

import React from 'react'
import type { UserRole } from '@/lib/teams/api'

export interface RoleBadgeProps {
  role: UserRole
  className?: string
}

const ROLE_STYLES = {
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  MEMBER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        ROLE_STYLES[role]
      } ${className}`}
    >
      {role}
    </span>
  )
}
