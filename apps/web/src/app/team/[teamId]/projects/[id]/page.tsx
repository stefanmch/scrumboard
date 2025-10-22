'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Loader2, Calendar, Tag } from 'lucide-react'
import { projectsApi, type Project, type ProjectStats, type UpdateProjectData } from '@/lib/projects/api'
import { teamsApi, type Team } from '@/lib/teams/api'
import { authApi } from '@/lib/auth/api'
import { Button } from '@/components/forms/Button'
import { ProjectFormModal } from '@/components/project/ProjectFormModal'
import { ProjectStatsCard } from '@/components/project/ProjectStatsCard'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadProjectData()
  }, [projectId, teamId])

  const loadProjectData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [projectData, statsData, teamData] = await Promise.all([
        projectsApi.getById(projectId),
        projectsApi.getStats(projectId),
        teamsApi.getById(teamId)
      ])

      setProject(projectData)
      setStats(statsData)
      setTeam(teamData)

      // Check if current user is admin
      const user = authApi.getCurrentUser()
      if (user && teamData.members) {
        const member = teamData.members.find(m => m.userId === user.id)
        setIsAdmin(member?.role === 'ADMIN')
      }
    } catch (err) {
      console.error('Failed to load project:', err)
      setError('Failed to load project. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateProject = async (data: UpdateProjectData) => {
    try {
      const updatedProject = await projectsApi.update(projectId, data)
      setProject(updatedProject)
      setIsEditModalOpen(false)
      // Reload stats in case status changed
      const newStats = await projectsApi.getStats(projectId)
      setStats(newStats)
    } catch (err) {
      console.error('Failed to update project:', err)
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="page-container flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="page-container">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error || 'Project not found'}</p>
        </div>
        <Button
          onClick={() => router.push(`/team/${teamId}/projects`)}
          variant="outline"
          className="mt-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Button>
      </div>
    )
  }

  const STATUS_COLORS = {
    PLANNING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <Button
          onClick={() => router.push(`/team/${teamId}/projects`)}
          variant="ghost"
          size="sm"
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Button>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {project.name}
              </h1>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  STATUS_COLORS[project.status]
                }`}
              >
                {project.status.replace('_', ' ')}
              </span>
            </div>
            {project.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                <span>Team: {team?.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setIsEditModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Project
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {stats && <ProjectStatsCard stats={stats} />}

          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => router.push(`/sprint`)}
                variant="outline"
                className="justify-start"
              >
                View Sprint Board
              </Button>
              <Button
                onClick={() => router.push(`/backlog`)}
                variant="outline"
                className="justify-start"
              >
                Manage Backlog
              </Button>
              <Button
                onClick={() => router.push(`/planning`)}
                variant="outline"
                className="justify-start"
              >
                Sprint Planning
              </Button>
              <Button
                onClick={() => router.push(`/reports`)}
                variant="outline"
                className="justify-start"
              >
                View Reports
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Project Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Status
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {project.status.replace('_', ' ')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Team
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {team?.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Stories
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {project.storyCount || 0} total
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Sprints
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {project.sprintCount || 0} total
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Created
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Last Updated
                </label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProjectFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateProject}
        project={project}
      />
    </div>
  )
}
