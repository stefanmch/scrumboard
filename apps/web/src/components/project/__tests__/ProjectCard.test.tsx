import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProjectCard } from '../ProjectCard'
import type { Project } from '@/lib/projects/api'

describe('ProjectCard Component', () => {
  const mockProject: Project = {
    id: 'project-1',
    name: 'E-commerce Platform',
    description: 'Building a scalable e-commerce platform with React and NestJS',
    status: 'ACTIVE',
    teamId: 'team-1',
    teamName: 'Engineering Team',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    storyCount: 15,
    sprintCount: 3,
    taskCount: 45
  }

  it('renders project information correctly', () => {
    render(<ProjectCard project={mockProject} />)

    expect(screen.getByText('E-commerce Platform')).toBeInTheDocument()
    expect(screen.getByText('Building a scalable e-commerce platform with React and NestJS')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders without description', () => {
    const projectWithoutDescription: Project = {
      ...mockProject,
      description: undefined
    }

    render(<ProjectCard project={projectWithoutDescription} />)

    expect(screen.getByText('E-commerce Platform')).toBeInTheDocument()
    expect(screen.queryByText('Building a scalable')).not.toBeInTheDocument()
  })

  it('displays correct status badge colors for ACTIVE status', () => {
    render(<ProjectCard project={mockProject} />)
    const statusBadge = screen.getByText('ACTIVE')

    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('displays correct status badge colors for PLANNING status', () => {
    const planningProject: Project = {
      ...mockProject,
      status: 'PLANNING'
    }

    render(<ProjectCard project={planningProject} />)
    const statusBadge = screen.getByText('PLANNING')

    expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('displays correct status badge colors for ON_HOLD status', () => {
    const onHoldProject: Project = {
      ...mockProject,
      status: 'ON_HOLD'
    }

    render(<ProjectCard project={onHoldProject} />)
    const statusBadge = screen.getByText('ON HOLD')

    expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('displays correct status badge colors for COMPLETED status', () => {
    const completedProject: Project = {
      ...mockProject,
      status: 'COMPLETED'
    }

    render(<ProjectCard project={completedProject} />)
    const statusBadge = screen.getByText('COMPLETED')

    expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('displays correct status badge colors for ARCHIVED status', () => {
    const archivedProject: Project = {
      ...mockProject,
      status: 'ARCHIVED'
    }

    render(<ProjectCard project={archivedProject} />)
    const statusBadge = screen.getByText('ARCHIVED')

    expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-600')
  })

  it('replaces underscores in status with spaces', () => {
    const onHoldProject: Project = {
      ...mockProject,
      status: 'ON_HOLD'
    }

    render(<ProjectCard project={onHoldProject} />)
    expect(screen.getByText('ON HOLD')).toBeInTheDocument()
  })

  it('displays zero counts when metrics are not available', () => {
    const projectWithoutCounts: Project = {
      ...mockProject,
      storyCount: undefined,
      sprintCount: undefined,
      taskCount: undefined
    }

    render(<ProjectCard project={projectWithoutCounts} />)

    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(2) // At least stories and sprints
  })

  it('calls onView when View button is clicked', () => {
    const onView = jest.fn()
    render(<ProjectCard project={mockProject} onView={onView} />)

    const viewButton = screen.getByRole('button', { name: /view/i })
    fireEvent.click(viewButton)

    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledWith(mockProject)
  })

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = jest.fn()
    render(<ProjectCard project={mockProject} onEdit={onEdit} />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(mockProject)
  })

  it('calls onDelete when Delete button is clicked', () => {
    const onDelete = jest.fn()
    render(<ProjectCard project={mockProject} onDelete={onDelete} />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(mockProject)
  })

  it('does not render View button when onView is not provided', () => {
    render(<ProjectCard project={mockProject} onEdit={jest.fn()} onDelete={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument()
  })

  it('does not render Edit button when onEdit is not provided', () => {
    render(<ProjectCard project={mockProject} onView={jest.fn()} onDelete={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('does not render Delete button when onDelete is not provided', () => {
    render(<ProjectCard project={mockProject} onView={jest.fn()} onEdit={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('disables all buttons when isLoading is true', () => {
    render(
      <ProjectCard
        project={mockProject}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isLoading={true}
      />
    )

    const viewButton = screen.getByRole('button', { name: /view/i })
    const editButton = screen.getByRole('button', { name: /edit/i })
    const deleteButton = screen.getByRole('button', { name: /delete/i })

    expect(viewButton).toBeDisabled()
    expect(editButton).toBeDisabled()
    expect(deleteButton).toBeDisabled()
  })

  it('renders with hover and shadow effects', () => {
    const { container } = render(<ProjectCard project={mockProject} />)
    const card = container.firstChild

    expect(card).toHaveClass('hover:shadow-lg')
    expect(card).toHaveClass('shadow-md')
  })

  it('displays metrics in correct sections', () => {
    render(<ProjectCard project={mockProject} />)

    expect(screen.getByText('Stories')).toBeInTheDocument()
    expect(screen.getByText('Sprints')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
  })

  it('formats creation date correctly', () => {
    const projectWithSpecificDate: Project = {
      ...mockProject,
      createdAt: new Date('2024-06-15T10:30:00')
    }

    render(<ProjectCard project={projectWithSpecificDate} />)

    // Date formatting may vary by locale, so check for the formatted date
    const formattedDate = new Date('2024-06-15T10:30:00').toLocaleDateString()
    expect(screen.getByText(formattedDate)).toBeInTheDocument()
  })
})
