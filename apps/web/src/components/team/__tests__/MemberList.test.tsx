import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemberList } from '../MemberList'
import type { TeamMember } from '@/lib/teams/api'

describe('MemberList Component', () => {
  const mockMembers: TeamMember[] = [
    {
      id: 'member-1',
      userId: 'user-1',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      userAvatar: 'https://example.com/avatar1.jpg',
      teamId: 'team-1',
      role: 'ADMIN',
      joinedAt: new Date('2024-01-10')
    },
    {
      id: 'member-2',
      userId: 'user-2',
      userName: 'Jane Smith',
      userEmail: 'jane@example.com',
      teamId: 'team-1',
      role: 'MEMBER',
      joinedAt: new Date('2024-01-15')
    },
    {
      id: 'member-3',
      userId: 'user-3',
      userName: 'Bob Johnson',
      userEmail: 'bob@example.com',
      teamId: 'team-1',
      role: 'MEMBER',
      joinedAt: new Date('2024-01-20')
    }
  ]

  it('renders member list with correct count', () => {
    render(<MemberList members={mockMembers} />)
    expect(screen.getByText('Team Members (3)')).toBeInTheDocument()
  })

  it('renders all member information', () => {
    render(<MemberList members={mockMembers} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('displays empty state when no members', () => {
    render(<MemberList members={[]} />)
    expect(screen.getByText('Team Members (0)')).toBeInTheDocument()
    expect(screen.getByText('No members yet')).toBeInTheDocument()
  })

  it('displays role badges for each member', () => {
    render(<MemberList members={mockMembers} />)

    // Check that RoleBadge components are rendered (they would show ADMIN/MEMBER)
    const memberElements = screen.getAllByText(/John Doe|Jane Smith|Bob Johnson/)
    expect(memberElements).toHaveLength(3)
  })

  it('shows (You) indicator for current user', () => {
    render(<MemberList members={mockMembers} currentUserId="user-2" />)
    expect(screen.getByText('(You)')).toBeInTheDocument()
  })

  it('does not show (You) indicator for other users', () => {
    render(<MemberList members={mockMembers} currentUserId="user-1" />)
    const youIndicators = screen.getAllByText('(You)')
    expect(youIndicators).toHaveLength(1) // Only one "(You)" should appear
  })

  it('renders avatar image when userAvatar is provided', () => {
    render(<MemberList members={mockMembers} />)
    const avatar = screen.getByAltText('John Doe')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar1.jpg')
  })

  it('renders avatar placeholder when userAvatar is not provided', () => {
    render(<MemberList members={mockMembers} />)

    // Jane and Bob don't have avatars, so check for initials
    const janeInitial = screen.getByText('J')
    expect(janeInitial).toBeInTheDocument()
  })

  it('displays unknown user for members without names', () => {
    const memberWithoutName: TeamMember = {
      id: 'member-4',
      userId: 'user-4',
      userEmail: 'unknown@example.com',
      teamId: 'team-1',
      role: 'MEMBER',
      joinedAt: new Date()
    }

    render(<MemberList members={[memberWithoutName]} />)
    expect(screen.getByText('Unknown User')).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked (admin)', () => {
    const onRemove = jest.fn()
    render(
      <MemberList
        members={mockMembers}
        currentUserId="user-1"
        onRemove={onRemove}
        isAdmin={true}
      />
    )

    // Should have remove buttons for user-2 and user-3, but not for user-1 (current user)
    const removeButtons = screen.getAllByTitle('Remove member')
    expect(removeButtons).toHaveLength(2)

    fireEvent.click(removeButtons[0])
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(mockMembers[1])
  })

  it('calls onChangeRole when change role button is clicked (admin)', () => {
    const onChangeRole = jest.fn()
    render(
      <MemberList
        members={mockMembers}
        currentUserId="user-1"
        onChangeRole={onChangeRole}
        isAdmin={true}
      />
    )

    const changeRoleButtons = screen.getAllByTitle('Change role')
    expect(changeRoleButtons).toHaveLength(2)

    fireEvent.click(changeRoleButtons[0])
    expect(onChangeRole).toHaveBeenCalledTimes(1)
    expect(onChangeRole).toHaveBeenCalledWith(mockMembers[1])
  })

  it('does not show action buttons when not admin', () => {
    render(
      <MemberList
        members={mockMembers}
        currentUserId="user-2"
        onRemove={jest.fn()}
        onChangeRole={jest.fn()}
        isAdmin={false}
      />
    )

    expect(screen.queryByTitle('Remove member')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Change role')).not.toBeInTheDocument()
  })

  it('does not show action buttons for current user even if admin', () => {
    render(
      <MemberList
        members={mockMembers}
        currentUserId="user-1"
        onRemove={jest.fn()}
        onChangeRole={jest.fn()}
        isAdmin={true}
      />
    )

    // There should be 2 sets of action buttons (for user-2 and user-3), not 3
    const removeButtons = screen.queryAllByTitle('Remove member')
    expect(removeButtons).toHaveLength(2)
  })

  it('disables action buttons when isLoading is true', () => {
    render(
      <MemberList
        members={mockMembers}
        currentUserId="user-1"
        onRemove={jest.fn()}
        onChangeRole={jest.fn()}
        isAdmin={true}
        isLoading={true}
      />
    )

    const removeButtons = screen.getAllByTitle('Remove member')
    const changeRoleButtons = screen.getAllByTitle('Change role')

    removeButtons.forEach(button => {
      expect(button).toBeDisabled()
    })

    changeRoleButtons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('formats join date correctly', () => {
    render(<MemberList members={mockMembers} />)

    // Check that "Joined" text appears with dates
    expect(screen.getByText(/Joined 1\/10\/2024/)).toBeInTheDocument()
    expect(screen.getByText(/Joined 1\/15\/2024/)).toBeInTheDocument()
    expect(screen.getByText(/Joined 1\/20\/2024/)).toBeInTheDocument()
  })

  it('renders with hover effect on member rows', () => {
    const { container } = render(<MemberList members={mockMembers} />)

    const memberRows = container.querySelectorAll('.hover\\:bg-gray-50')
    expect(memberRows.length).toBeGreaterThan(0)
  })
})
