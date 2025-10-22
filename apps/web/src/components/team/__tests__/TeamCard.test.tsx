import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TeamCard } from '../TeamCard'
import type { Team } from '@/lib/teams/api'

describe('TeamCard Component', () => {
  const mockTeam: Team = {
    id: 'team-1',
    name: 'Engineering Team',
    description: 'Core engineering team working on the main product',
    creatorId: 'user-1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    memberCount: 8
  }

  it('renders team information correctly', () => {
    render(<TeamCard team={mockTeam} />)

    expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    expect(screen.getByText('Core engineering team working on the main product')).toBeInTheDocument()
    expect(screen.getByText('8 members')).toBeInTheDocument()
    expect(screen.getByText('1/15/2024')).toBeInTheDocument()
  })

  it('renders without description', () => {
    const teamWithoutDescription: Team = {
      ...mockTeam,
      description: undefined
    }

    render(<TeamCard team={teamWithoutDescription} />)

    expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    expect(screen.queryByText('Core engineering team')).not.toBeInTheDocument()
  })

  it('displays correct member count', () => {
    render(<TeamCard team={mockTeam} />)
    expect(screen.getByText('8 members')).toBeInTheDocument()
  })

  it('displays zero when no members', () => {
    const teamWithNoMembers: Team = {
      ...mockTeam,
      memberCount: 0
    }

    render(<TeamCard team={teamWithNoMembers} />)
    expect(screen.getByText('0 members')).toBeInTheDocument()
  })

  it('calls onView when View button is clicked', () => {
    const onView = jest.fn()
    render(<TeamCard team={mockTeam} onView={onView} />)

    const viewButton = screen.getByRole('button', { name: /view/i })
    fireEvent.click(viewButton)

    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledWith(mockTeam)
  })

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = jest.fn()
    render(<TeamCard team={mockTeam} onEdit={onEdit} />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(mockTeam)
  })

  it('calls onDelete when Delete button is clicked', () => {
    const onDelete = jest.fn()
    render(<TeamCard team={mockTeam} onDelete={onDelete} />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(mockTeam)
  })

  it('does not render View button when onView is not provided', () => {
    render(<TeamCard team={mockTeam} onEdit={jest.fn()} onDelete={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument()
  })

  it('does not render Edit button when onEdit is not provided', () => {
    render(<TeamCard team={mockTeam} onView={jest.fn()} onDelete={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('does not render Delete button when onDelete is not provided', () => {
    render(<TeamCard team={mockTeam} onView={jest.fn()} onEdit={jest.fn()} />)
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('disables all buttons when isLoading is true', () => {
    render(
      <TeamCard
        team={mockTeam}
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
    const { container } = render(<TeamCard team={mockTeam} />)
    const card = container.firstChild

    expect(card).toHaveClass('hover:shadow-lg')
    expect(card).toHaveClass('shadow-md')
  })

  it('formats date correctly', () => {
    const teamWithSpecificDate: Team = {
      ...mockTeam,
      createdAt: new Date('2024-06-15T10:30:00')
    }

    render(<TeamCard team={teamWithSpecificDate} />)

    // Date formatting may vary by locale, so check for the formatted date
    const formattedDate = new Date('2024-06-15T10:30:00').toLocaleDateString()
    expect(screen.getByText(formattedDate)).toBeInTheDocument()
  })
})
