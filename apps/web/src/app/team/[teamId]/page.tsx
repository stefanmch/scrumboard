'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Plus, Loader2, Folder } from 'lucide-react'
import { teamsApi, type Team, type TeamMember, type UpdateTeamData, type AddMemberData, type UpdateMemberRoleData } from '@/lib/teams/api'
import { projectsApi, type Project } from '@/lib/projects/api'
import { authApi } from '@/lib/auth/api'
import { Button } from '@/components/forms/Button'
import { MemberList } from '@/components/team/MemberList'
import { TeamFormModal } from '@/components/team/TeamFormModal'
import { AddMemberModal } from '@/components/team/AddMemberModal'
import { ProjectCard } from '@/components/project/ProjectCard'

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string

  const [team, setTeam] = useState<Team | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is authenticated before loading
    const token = authApi.getAccessToken()
    if (!token) {
      router.push('/login?redirect=/team/' + teamId)
      return
    }

    const user = authApi.getCurrentUser()
    if (user) {
      setCurrentUserId(user.id)
    }
    loadTeamData()
  }, [teamId])

  const loadTeamData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [teamData, projectsData] = await Promise.all([
        teamsApi.getById(teamId),
        projectsApi.getAllForTeam(teamId)
      ])
      setTeam(teamData)
      setProjects(projectsData)

      // Check if current user is admin
      const user = authApi.getCurrentUser()
      if (user && teamData.members) {
        const member = teamData.members.find(m => m.userId === user.id)
        setIsAdmin(member?.role === 'ADMIN')
      }
    } catch (err) {
      console.error('Failed to load team:', err)
      setError('Failed to load team. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTeam = async (data: UpdateTeamData) => {
    try {
      const updatedTeam = await teamsApi.update(teamId, data)
      setTeam(updatedTeam)
      setIsEditModalOpen(false)
    } catch (err) {
      console.error('Failed to update team:', err)
      throw err
    }
  }

  const handleAddMember = async (data: AddMemberData) => {
    try {
      await teamsApi.addMember(teamId, data)
      await loadTeamData() // Reload to get updated members
      setIsAddMemberModalOpen(false)
    } catch (err) {
      console.error('Failed to add member:', err)
      throw err
    }
  }

  const handleRemoveMember = async (member: TeamMember) => {
    if (!confirm(`Are you sure you want to remove ${member.userName} from the team?`)) {
      return
    }

    try {
      await teamsApi.removeMember(teamId, member.userId)
      await loadTeamData()
    } catch (err) {
      console.error('Failed to remove member:', err)
      alert('Failed to remove member. Please try again.')
    }
  }

  const handleChangeRole = async (member: TeamMember) => {
    const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    if (!confirm(`Change ${member.userName}'s role to ${newRole}?`)) {
      return
    }

    try {
      const data: UpdateMemberRoleData = { role: newRole }
      await teamsApi.updateMemberRole(teamId, member.userId, data)
      await loadTeamData()
    } catch (err) {
      console.error('Failed to update member role:', err)
      alert('Failed to update member role. Please try again.')
    }
  }

  const handleViewProject = (project: Project) => {
    router.push(`/team/${teamId}/projects/${project.id}`)
  }

  if (isLoading) {
    return (
      <div className="page-container flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="page-container">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error || 'Team not found'}</p>
        </div>
        <Button
          onClick={() => router.push('/team')}
          variant="outline"
          className="mt-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Button>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <Button
          onClick={() => router.push('/team')}
          variant="ghost"
          size="sm"
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {team.name}
            </h1>
            {team.description && (
              <p className="text-gray-600 dark:text-gray-400">{team.description}</p>
            )}
          </div>
          {isAdmin && (
            <Button
              onClick={() => setIsEditModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Team
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MemberList
            members={team.members || []}
            currentUserId={currentUserId || undefined}
            onRemove={isAdmin ? handleRemoveMember : undefined}
            onChangeRole={isAdmin ? handleChangeRole : undefined}
            isAdmin={isAdmin}
          />

          {isAdmin && (
            <Button
              onClick={() => setIsAddMemberModalOpen(true)}
              variant="outline"
              className="mt-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </Button>
          )}
        </div>

        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Projects ({projects.length})
              </h3>
              <Button
                onClick={() => router.push(`/team/${teamId}/projects`)}
                variant="primary"
                size="sm"
              >
                View All
              </Button>
            </div>

            {projects.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No projects yet
              </p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 3).map(project => (
                  <div
                    key={project.id}
                    onClick={() => handleViewProject(project)}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {project.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {project.status.replace('_', ' ')} • {project.storyCount || 0} stories
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <TeamFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateTeam}
        team={team}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSubmit={handleAddMember}
      />
    </div>
  )
}
