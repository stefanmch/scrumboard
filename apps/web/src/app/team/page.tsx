'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { teamsApi, type Team, type CreateTeamData } from '@/lib/teams/api'
import { authApi } from '@/lib/auth/api'
import { TeamCard } from '@/components/team/TeamCard'
import { TeamFormModal } from '@/components/team/TeamFormModal'
import { Button } from '@/components/forms/Button'

export default function TeamPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authenticated before loading
    if (!authApi.isAuthenticated()) {
      authApi.clearAuth() // Clear any invalid tokens
      router.push('/login?redirect=/team')
      return
    }
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await teamsApi.getAll()
      setTeams(data)
    } catch (err: any) {
      console.error('Failed to load teams:', err)

      // Check if it's an authentication error
      if (err?.status === 401 || err?.message?.includes('access token')) {
        setError('Your session has expired. Redirecting to login...')
        authApi.clearAuth() // Clear invalid auth data
        setTimeout(() => {
          router.push('/login?redirect=/team')
        }, 1500)
      } else {
        setError('Failed to load teams. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTeam = async (data: CreateTeamData) => {
    try {
      const newTeam = await teamsApi.create(data)
      setTeams(prev => [newTeam, ...prev])
      setIsCreateModalOpen(false)
    } catch (err) {
      console.error('Failed to create team:', err)
      throw err
    }
  }

  const handleViewTeam = (team: Team) => {
    router.push(`/team/${team.id}`)
  }

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await teamsApi.delete(team.id)
      setTeams(prev => prev.filter(t => t.id !== team.id))
    } catch (err) {
      console.error('Failed to delete team:', err)
      alert('Failed to delete team. Please try again.')
    }
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Teams
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your teams and collaborate with members
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Team
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No teams yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get started by creating your first team to collaborate with others.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create Your First Team
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onView={handleViewTeam}
              onDelete={handleDeleteTeam}
            />
          ))}
        </div>
      )}

      <TeamFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTeam}
      />
    </div>
  )
}
