'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { projectsApi } from '@/lib/api/projects'
import { useProject } from '@/contexts/ProjectContext'

export default function ProjectReportsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const { selectedProject, setSelectedProject } = useProject()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProject() {
      if (!projectId) {
        router.push('/projects')
        return
      }

      // If this is already the selected project, redirect to main reports page
      if (selectedProject?.id === projectId) {
        router.push('/reports')
        return
      }

      // Load and set the project
      try {
        const project = await projectsApi.getById(projectId)
        setSelectedProject(project)
        router.push('/reports')
      } catch (error) {
        console.error('Failed to load project:', error)
        router.push('/projects')
      } finally {
        setIsLoading(false)
      }
    }

    loadProject()
  }, [projectId, selectedProject, setSelectedProject, router])

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
