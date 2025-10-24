'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { ModalPortal } from '@/components/modals/ModalPortal'
import { Sprint } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'

interface SprintFormModalProps {
  sprint: Sprint | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Sprint>) => Promise<void>
}

export function SprintFormModal({
  sprint,
  isOpen,
  onClose,
  onSave,
}: SprintFormModalProps) {
  const [formData, setFormData] = useState<Partial<Sprint>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastError, setLastError] = useState<ApiError | Error | null>(null)
  const toast = useToast()

  const handleClose = useCallback(() => {
    if (isSaving) return

    if (hasUnsavedChanges && sprint) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      )
      if (!shouldClose) return
    }

    setLastError(null)
    onClose()
  }, [isSaving, hasUnsavedChanges, sprint, onClose])

  useEffect(() => {
    if (sprint) {
      setFormData({
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        capacity: sprint.capacity,
      })
      setHasUnsavedChanges(false)
      setLastError(null)
      setIsSaving(false)
    } else if (isOpen) {
      // New sprint defaults
      const today = new Date()
      const twoWeeksLater = new Date(today)
      twoWeeksLater.setDate(today.getDate() + 14)

      setFormData({
        name: '',
        goal: '',
        startDate: today.toISOString().split('T')[0],
        endDate: twoWeeksLater.toISOString().split('T')[0],
        capacity: 40,
      })
      setHasUnsavedChanges(false)
    }
  }, [sprint, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, handleClose])

  if (!isOpen) return null

  const handleInputChange = (field: keyof Sprint, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    setLastError(null)
  }

  const isValidForSave =
    formData.name &&
    formData.startDate &&
    formData.endDate &&
    new Date(formData.startDate) <= new Date(formData.endDate)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidForSave || isSaving) return

    setIsSaving(true)
    setLastError(null)

    try {
      await onSave(formData)
      setHasUnsavedChanges(false)
      setIsSaving(false)
      toast.showSuccess(sprint ? 'Sprint updated successfully' : 'Sprint created successfully')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save sprint')
      setIsSaving(false)
      setLastError(error)
      toast.showError(error, 'Save Failed')
      console.error('Failed to save sprint:', error)
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
        onClick={e => {
          if (e.target === e.currentTarget && !isSaving) {
            handleClose()
          }
        }}
      >
        <div className="absolute inset-0 bg-slate-800/60 dark:bg-black/70 backdrop-blur-sm pointer-events-none" />

        <div className="relative z-10 w-full max-w-2xl mx-4 pointer-events-auto">
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {sprint ? 'Edit Sprint' : 'Create Sprint'}
                </h2>
                {hasUnsavedChanges && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">You have unsaved changes</p>
                )}
              </div>
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {lastError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {lastError instanceof ApiError
                      ? lastError.getUserFriendlyMessage()
                      : lastError.message}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Sprint Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name || ''}
                  onChange={e => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sprint 1"
                  required
                />
              </div>

              <div>
                <label htmlFor="goal" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Sprint Goal
                </label>
                <textarea
                  id="goal"
                  rows={3}
                  value={formData.goal || ''}
                  onChange={e => handleInputChange('goal', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="What do you want to achieve in this sprint?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Start Date *
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={
                      formData.startDate
                        ? new Date(formData.startDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={e => handleInputChange('startDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    End Date *
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={
                      formData.endDate
                        ? new Date(formData.endDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={e => handleInputChange('endDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="capacity" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Team Capacity (Story Points)
                </label>
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity || ''}
                  onChange={e => handleInputChange('capacity', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="40"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValidForSave || isSaving}
                  className={`px-6 py-3 text-sm font-medium border rounded-lg flex items-center gap-2 ${
                    isValidForSave && !isSaving
                      ? 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 border-transparent'
                      : 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isSaving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSaving ? 'Saving...' : sprint ? 'Save Changes' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
