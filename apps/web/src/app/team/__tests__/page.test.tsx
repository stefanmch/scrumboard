import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import TeamPage from '../page'
import { teamsApi } from '@/lib/teams/api'
import type { Team } from '@/lib/teams/api'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/teams/api', () => ({
  teamsApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}))

// Mock window.confirm
global.confirm = jest.fn()

describe('TeamPage', () => {
  const mockPush = jest.fn()
  const mockTeams: Team[] = [
    {
      id: 'team-1',
      name: 'Engineering Team',
      description: 'Core engineering team',
      creatorId: 'user-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      memberCount: 8
    },
    {
      id: 'team-2',
      name: 'Design Team',
      description: 'UI/UX design team',
      creatorId: 'user-1',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-18'),
      memberCount: 5
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(global.confirm as jest.Mock).mockReturnValue(true)
  })

  it('renders page title and description', () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue([])

    render(<TeamPage />)

    expect(screen.getByText('Teams')).toBeInTheDocument()
    expect(screen.getByText('Manage your teams and collaborate with members')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    ;(teamsApi.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    render(<TeamPage />)

    expect(screen.getByRole('status')).toBeInTheDocument() // Loader2 has implicit role
  })

  it('loads and displays teams successfully', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue(mockTeams)

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      expect(screen.getByText('Design Team')).toBeInTheDocument()
    })

    expect(teamsApi.getAll).toHaveBeenCalledTimes(1)
  })

  it('displays empty state when no teams exist', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue([])

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('No teams yet')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first team to collaborate with others.')).toBeInTheDocument()
    })
  })

  it('shows error message when loading teams fails', async () => {
    ;(teamsApi.getAll as jest.Mock).mockRejectedValue(new Error('Failed to fetch'))

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load teams. Please try again.')).toBeInTheDocument()
    })
  })

  it('opens create modal when Create Team button is clicked', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue([])

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('No teams yet')).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: /create team/i })
    fireEvent.click(createButton)

    // Modal should open (TeamFormModal would be tested separately)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('creates a new team successfully', async () => {
    const newTeam: Team = {
      id: 'team-3',
      name: 'New Team',
      description: 'New team description',
      creatorId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      memberCount: 1
    }

    ;(teamsApi.getAll as jest.Mock).mockResolvedValue([])
    ;(teamsApi.create as jest.Mock).mockResolvedValue(newTeam)

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('No teams yet')).toBeInTheDocument()
    })

    // Open modal
    const createButton = screen.getByRole('button', { name: /create team/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Fill form
    const nameInput = screen.getByLabelText(/team name/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /create/i })

    fireEvent.change(nameInput, { target: { value: 'New Team' } })
    fireEvent.change(descriptionInput, { target: { value: 'New team description' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(teamsApi.create).toHaveBeenCalledWith({
        name: 'New Team',
        description: 'New team description'
      })
      expect(screen.getByText('New Team')).toBeInTheDocument()
    })
  })

  it('navigates to team detail page when View is clicked', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue(mockTeams)

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByRole('button', { name: /view/i })
    fireEvent.click(viewButtons[0])

    expect(mockPush).toHaveBeenCalledWith('/team/team-1')
  })

  it('deletes team when Delete is clicked and confirmed', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue(mockTeams)
    ;(teamsApi.delete as jest.Mock).mockResolvedValue(undefined)
    ;(global.confirm as jest.Mock).mockReturnValue(true)

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Engineering Team"? This action cannot be undone.'
      )
      expect(teamsApi.delete).toHaveBeenCalledWith('team-1')
      expect(screen.queryByText('Engineering Team')).not.toBeInTheDocument()
    })
  })

  it('does not delete team when Delete is clicked but not confirmed', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue(mockTeams)
    ;(global.confirm as jest.Mock).mockReturnValue(false)

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
    })

    expect(teamsApi.delete).not.toHaveBeenCalled()
    expect(screen.getByText('Engineering Team')).toBeInTheDocument()
  })

  it('shows error alert when delete fails', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue(mockTeams)
    ;(teamsApi.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'))
    ;(global.confirm as jest.Mock).mockReturnValue(true)
    global.alert = jest.fn()

    render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to delete team. Please try again.')
    })
  })

  it('displays Create Your First Team button in empty state', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue([])

    render(<TeamPage />)

    await waitFor(() => {
      const createFirstButton = screen.getByRole('button', { name: /create your first team/i })
      expect(createFirstButton).toBeInTheDocument()
    })
  })

  it('displays teams in a grid layout', async () => {
    ;(teamsApi.getAll as jest.Mock).mockResolvedValue(mockTeams)

    const { container } = render(<TeamPage />)

    await waitFor(() => {
      expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    })

    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })
})
