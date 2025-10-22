'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { projectsApi, type Project, type CreateProjectData } from '@/lib/projects/api'
import { teamsApi, type Team } from '@/lib/teams/api'
import { ProjectCard } from '@/components/project/ProjectCard'
import { ProjectFormModal } from '@/components/project/ProjectFormModal'
import { Button } from '@/components/forms/Button'

export default function ProjectsListPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string

  const [team, setTeam] = useState<Team | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [teamId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [teamData, projectsData] = await Promise.all([
        teamsApi.getById(teamId),
        projectsApi.getAllForTeam(teamId)
      ])
      setTeam(teamData)
      setProjects(projectsData)
    } catch (err) {
      console.error('Failed to load projects:', err)
      setError('Failed to load projects. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (data: CreateProjectData) => {
    try {
      const newProject = await projectsApi.create(teamId, data)
      setProjects(prev => [newProject, ...prev])
      setIsCreateModalOpen(false)
    } catch (err) {
      console.error('Failed to create project:', err)
      throw err
    }
  }

  const handleViewProject = (project: Project) => {
    router.push(`/team/${teamId}/projects/${project.id}`)
  }

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await projectsApi.delete(project.id)
      setProjects(prev => prev.filter(p => p.id !== project.id))
    } catch (err) {
      console.error('Failed to delete project:', err)
      alert('Failed to delete project. Please try again.')
    }
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <Button
          onClick={() => router.push(`/team/${teamId}`)}
          variant="ghost"
          size="sm"
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Projects
            </h1>
            {team && (
              <p className="text-gray-600 dark:text-gray-400">
                Manage projects for {team.name}
              </p>
            )}
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </Button>
        </div>
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
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No projects yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get started by creating your first project for this team.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create Your First Project
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onView={handleViewProject}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  )
}
