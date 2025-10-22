import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfilePage from '../page'
import { usersApi } from '@/lib/users/api'
import { useToast } from '@/components/ui/Toast'

// Mock dependencies
jest.mock('@/lib/users/api', () => ({
  usersApi: {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    changePassword: jest.fn(),
    uploadAvatar: jest.fn(),
  },
}))

jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('ProfilePage - Authentication Integration', () => {
  const mockShowError = jest.fn()
  const mockShowSuccess = jest.fn()

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'MEMBER',
    bio: 'Test bio',
    avatar: null,
    timezone: 'UTC',
    workingHours: {
      start: '09:00',
      end: '17:00',
    },
    notifications: {
      email: true,
      push: true,
      mentions: true,
      updates: true,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    ;(useToast as jest.Mock).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    })
  })

  describe('Authentication Requirements', () => {
    it('should show error when user is not authenticated', async () => {
      // No userId in localStorage
      render(<ProfilePage />)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'User not authenticated' }),
          'Error'
        )
      })
    })

    it('should load profile when user is authenticated', async () => {
      localStorageMock.setItem('userId', '123')
      ;(usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockUser)

      render(<ProfilePage />)

      await waitFor(() => {
        expect(usersApi.getUserProfile).toHaveBeenCalledWith('123')
        expect(screen.getByText('Profile Settings')).toBeInTheDocument()
      })
    })

    it('should display loading state while fetching profile', () => {
      localStorageMock.setItem('userId', '123')
      ;(usersApi.getUserProfile as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockUser), 100))
      )

      render(<ProfilePage />)

      expect(screen.getByText('Loading profile...')).toBeInTheDocument()
    })
  })

  describe('Profile Updates', () => {
    beforeEach(() => {
      localStorageMock.setItem('userId', '123')
      ;(usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockUser)
    })

    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' }
      ;(usersApi.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser)

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/full name/i)
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } })

      const saveButton = screen.getAllByRole('button', { name: /save changes/i })[0]
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(usersApi.updateUserProfile).toHaveBeenCalledWith(
          '123',
          expect.objectContaining({
            name: 'Updated Name',
          })
        )
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Profile updated successfully',
          'Success'
        )
      })
    })

    it('should handle profile update errors', async () => {
      const error = new Error('Failed to update profile')
      ;(usersApi.updateUserProfile as jest.Mock).mockRejectedValue(error)

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      const saveButton = screen.getAllByRole('button', { name: /save changes/i })[0]
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          error,
          'Failed to update profile'
        )
      })
    })
  })

  describe('Password Change', () => {
    beforeEach(() => {
      localStorageMock.setItem('userId', '123')
      ;(usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockUser)
    })

    it('should change password successfully', async () => {
      ;(usersApi.changePassword as jest.Mock).mockResolvedValue({})

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Change Password')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'OldPass123!' },
      })
      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'NewPass123!' },
      })
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'NewPass123!' },
      })

      const changeButton = screen.getByRole('button', { name: /change password/i })
      fireEvent.click(changeButton)

      await waitFor(() => {
        expect(usersApi.changePassword).toHaveBeenCalledWith('123', {
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
        })
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Password changed successfully',
          'Success'
        )
      })
    })

    it('should show validation error for password mismatch', async () => {
      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Change Password')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'OldPass123!' },
      })
      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'NewPass123!' },
      })
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'DifferentPass123!' },
      })

      const changeButton = screen.getByRole('button', { name: /change password/i })
      fireEvent.click(changeButton)

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
      })
    })

    it('should validate password strength', async () => {
      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Change Password')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'OldPass123!' },
      })
      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'weak' },
      })
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'weak' },
      })

      const changeButton = screen.getByRole('button', { name: /change password/i })
      fireEvent.click(changeButton)

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Avatar Upload', () => {
    beforeEach(() => {
      localStorageMock.setItem('userId', '123')
      ;(usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockUser)
    })

    it('should upload avatar successfully', async () => {
      const updatedUser = { ...mockUser, avatar: 'https://example.com/avatar.jpg' }
      ;(usersApi.uploadAvatar as jest.Mock).mockResolvedValue(updatedUser)

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Profile Picture')).toBeInTheDocument()
      })

      // Simulate file selection
      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByLabelText(/upload avatar/i)

      Object.defineProperty(fileInput, 'files', {
        value: [file],
      })

      fireEvent.change(fileInput)

      // Wait for upload button and click it
      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /upload avatar/i })
        expect(uploadButton).toBeInTheDocument()
        fireEvent.click(uploadButton)
      })

      await waitFor(() => {
        expect(usersApi.uploadAvatar).toHaveBeenCalledWith('123', file)
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Avatar uploaded successfully',
          'Success'
        )
      })
    })
  })

  describe('Session Persistence', () => {
    it('should maintain authentication state across component re-renders', async () => {
      localStorageMock.setItem('userId', '123')
      localStorageMock.setItem('accessToken', 'valid-token')
      ;(usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockUser)

      const { rerender } = render(<ProfilePage />)

      await waitFor(() => {
        expect(usersApi.getUserProfile).toHaveBeenCalledWith('123')
      })

      // Re-render component
      rerender(<ProfilePage />)

      // Should still have access to profile
      await waitFor(() => {
        expect(screen.getByText('Profile Settings')).toBeInTheDocument()
      })
    })

    it('should handle expired session gracefully', async () => {
      localStorageMock.setItem('userId', '123')
      const error = new Error('Unauthorized')
      ;(usersApi.getUserProfile as jest.Mock).mockRejectedValue(error)

      render(<ProfilePage />)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          error,
          'Failed to load profile'
        )
      })
    })
  })

  describe('Notification Preferences', () => {
    beforeEach(() => {
      localStorageMock.setItem('userId', '123')
      ;(usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockUser)
    })

    it('should update notification preferences', async () => {
      const updatedUser = {
        ...mockUser,
        notifications: {
          email: false,
          push: true,
          mentions: true,
          updates: false,
        },
      }
      ;(usersApi.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser)

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByLabelText(/email notifications/i)).toBeChecked()
      })

      // Toggle email notifications
      const emailCheckbox = screen.getByLabelText(/email notifications/i)
      fireEvent.click(emailCheckbox)

      const saveButton = screen.getAllByRole('button', { name: /save changes/i })[0]
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(usersApi.updateUserProfile).toHaveBeenCalledWith(
          '123',
          expect.objectContaining({
            notifications: expect.objectContaining({
              email: false,
            }),
          })
        )
      })
    })
  })
})
