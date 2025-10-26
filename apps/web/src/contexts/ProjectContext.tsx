'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Project } from '@/lib/projects/api'

interface ProjectContextType {
  selectedProject: Project | null
  setSelectedProject: (project: Project | null) => void
  isLoading: boolean
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

const PROJECT_STORAGE_KEY = 'scrumboard_selected_project'

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load selected project from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROJECT_STORAGE_KEY)
      if (stored) {
        const project = JSON.parse(stored)
        setSelectedProjectState(project)
      }
    } catch (error) {
      console.error('Failed to load selected project from localStorage:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save selected project to localStorage whenever it changes
  const setSelectedProject = (project: Project | null) => {
    setSelectedProjectState(project)
    try {
      if (project) {
        localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project))
      } else {
        localStorage.removeItem(PROJECT_STORAGE_KEY)
      }

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('project-change', { detail: project }))
    } catch (error) {
      console.error('Failed to save selected project to localStorage:', error)
    }
  }

  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject, isLoading }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
