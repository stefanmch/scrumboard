'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { ModalPortal } from '@/components/modals/ModalPortal'
import { Input } from '@/components/forms/Input'
import { Button } from '@/components/forms/Button'
import type { Team, CreateTeamData, UpdateTeamData } from '@/lib/teams/api'

export interface TeamFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTeamData | UpdateTeamData) => Promise<void>
  team?: Team
  title?: string
}

export const TeamFormModal: React.FC<TeamFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  team,
  title
}) => {
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Team name must be at least 3 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Failed to submit team:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto z-10">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {title || (team ? 'Edit Team' : 'Create New Team')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Team Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Enter team name"
              required
              autoFocus
            />

            <div className="w-full">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter team description (optional)"
                rows={4}
                className="w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 border-gray-300 dark:border-gray-600 transition-colors duration-200"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                fullWidth
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmitting}
              >
                {team ? 'Update Team' : 'Create Team'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
