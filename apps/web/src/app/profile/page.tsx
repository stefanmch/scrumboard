'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/forms/Input'
import { Button } from '@/components/forms/Button'
import { Select } from '@/components/forms/Select'
import { FileUpload } from '@/components/forms/FileUpload'
import { Checkbox } from '@/components/forms/Checkbox'
import { useToast } from '@/components/ui/Toast'
import { usersApi, type User, type UpdateUserDto, type ChangePasswordDto } from '@/lib/users/api'
import { timezones } from '@/lib/data/timezones'
import { User as UserIcon, Mail, Clock, Bell, Lock } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  timezone: z.string().optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  notificationsEmail: z.boolean(),
  notificationsPush: z.boolean(),
  notificationsMentions: z.boolean(),
  notificationsUpdates: z.boolean(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { showError, showSuccess } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      // Get current user ID from auth context or local storage
      const currentUserId = localStorage.getItem('userId')
      if (!currentUserId) {
        showError(new Error('User not authenticated'), 'Error')
        return
      }

      const userData = await usersApi.getUserProfile(currentUserId)
      setUser(userData)

      // Populate form with user data
      resetProfile({
        name: userData.name,
        bio: userData.bio || '',
        timezone: userData.timezone || '',
        workingHoursStart: userData.workingHours?.start || '',
        workingHoursEnd: userData.workingHours?.end || '',
        notificationsEmail: userData.notifications?.email ?? true,
        notificationsPush: userData.notifications?.push ?? true,
        notificationsMentions: userData.notifications?.mentions ?? true,
        notificationsUpdates: userData.notifications?.updates ?? true,
      })
    } catch (error) {
      showError(error as Error, 'Failed to load profile')
    }
  }

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!user) return

    setIsLoadingProfile(true)

    try {
      const updateData: UpdateUserDto = {
        name: data.name,
        bio: data.bio,
        timezone: data.timezone,
        workingHours: data.workingHoursStart && data.workingHoursEnd ? {
          start: data.workingHoursStart,
          end: data.workingHoursEnd,
        } : undefined,
        notifications: {
          email: data.notificationsEmail,
          push: data.notificationsPush,
          mentions: data.notificationsMentions,
          updates: data.notificationsUpdates,
        },
      }

      const updatedUser = await usersApi.updateUserProfile(user.id, updateData)
      setUser(updatedUser)
      showSuccess('Profile updated successfully', 'Success')
    } catch (error) {
      showError(error as Error, 'Failed to update profile')
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const onSubmitPassword = async (data: PasswordFormData) => {
    if (!user) return

    setIsLoadingPassword(true)

    try {
      const passwordData: ChangePasswordDto = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }

      await usersApi.changePassword(user.id, passwordData)
      showSuccess('Password changed successfully', 'Success')
      resetPassword()
    } catch (error) {
      showError(error as Error, 'Failed to change password')
    } finally {
      setIsLoadingPassword(false)
    }
  }

  const handleAvatarUpload = async () => {
    if (!user || !avatarFile) return

    setIsUploadingAvatar(true)

    try {
      const updatedUser = await usersApi.uploadAvatar(user.id, avatarFile)
      setUser(updatedUser)
      setAvatarFile(null)
      showSuccess('Avatar uploaded successfully', 'Success')
    } catch (error) {
      showError(error as Error, 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Avatar Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Picture</h2>
        </div>

        <div className="space-y-4">
          <FileUpload
            label="Upload Avatar"
            accept="image/jpeg,image/png,image/jpg"
            maxSize={5 * 1024 * 1024}
            preview
            currentFile={user.avatar}
            onChange={setAvatarFile}
          />

          {avatarFile && (
            <Button
              onClick={handleAvatarUpload}
              isLoading={isUploadingAvatar}
              disabled={isUploadingAvatar}
            >
              Upload Avatar
            </Button>
          )}
        </div>
      </div>

      {/* Profile Information */}
      <form onSubmit={handleSubmitProfile(onSubmitProfile)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
          </div>

          <Input
            {...registerProfile('name')}
            label="Full Name"
            placeholder="Enter your full name"
            error={profileErrors.name?.message}
            disabled={isLoadingProfile}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              {...registerProfile('bio')}
              id="bio"
              rows={4}
              placeholder="Tell us about yourself"
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              disabled={isLoadingProfile}
            />
            {profileErrors.bio && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileErrors.bio.message}</p>
            )}
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6 mt-8">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Working Hours & Timezone</h2>
          </div>

          <Select
            {...registerProfile('timezone')}
            label="Timezone"
            options={timezones}
            placeholder="Select your timezone"
            error={profileErrors.timezone?.message}
            disabled={isLoadingProfile}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              {...registerProfile('workingHoursStart')}
              type="time"
              label="Working Hours Start"
              error={profileErrors.workingHoursStart?.message}
              disabled={isLoadingProfile}
            />

            <Input
              {...registerProfile('workingHoursEnd')}
              type="time"
              label="Working Hours End"
              error={profileErrors.workingHoursEnd?.message}
              disabled={isLoadingProfile}
            />
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6 mt-8">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
          </div>

          <div className="space-y-4">
            <Checkbox
              {...registerProfile('notificationsEmail')}
              label="Email notifications"
              disabled={isLoadingProfile}
            />

            <Checkbox
              {...registerProfile('notificationsPush')}
              label="Push notifications"
              disabled={isLoadingProfile}
            />

            <Checkbox
              {...registerProfile('notificationsMentions')}
              label="Notify when mentioned"
              disabled={isLoadingProfile}
            />

            <Checkbox
              {...registerProfile('notificationsUpdates')}
              label="Notify on project updates"
              disabled={isLoadingProfile}
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoadingProfile}
            disabled={isLoadingProfile}
          >
            Save Changes
          </Button>
        </div>
      </form>

      {/* Password Change */}
      <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Change Password</h2>
          </div>

          <Input
            {...registerPassword('currentPassword')}
            type="password"
            label="Current Password"
            placeholder="Enter your current password"
            error={passwordErrors.currentPassword?.message}
            disabled={isLoadingPassword}
            showPasswordToggle
            required
          />

          <Input
            {...registerPassword('newPassword')}
            type="password"
            label="New Password"
            placeholder="Enter your new password"
            error={passwordErrors.newPassword?.message}
            disabled={isLoadingPassword}
            showPasswordToggle
            required
          />

          <Input
            {...registerPassword('confirmPassword')}
            type="password"
            label="Confirm New Password"
            placeholder="Confirm your new password"
            error={passwordErrors.confirmPassword?.message}
            disabled={isLoadingPassword}
            showPasswordToggle
            required
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoadingPassword}
              disabled={isLoadingPassword}
            >
              Change Password
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
