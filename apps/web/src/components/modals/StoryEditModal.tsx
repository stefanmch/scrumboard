'use client'

import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { Story, StoryStatus } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import { withSyncAct } from '@/__tests__/utils/async-test-utils'

// Modal Portal is now imported from ./ModalPortal

// --- Story Edit Modal ---
export function StoryEditModal({
  story,
  isOpen,
  onClose,
  onSave,
}: {
  story: Story | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedStory: Story) => Promise<void>
  isLoading?: boolean
}) {
  const [formData, setFormData] = useState<Partial<Story>>(story || {})
  const [ready, setReady] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastError, setLastError] = useState<ApiError | Error | null>(null)
  const { showError, showSuccess } = useToast()

  const handleClose = useCallback(() => {
    // Prevent closing while saving
    if (isSaving) {
      return
    }

    // Warn about unsaved changes for non-draft stories
    if (hasUnsavedChanges && story && !story.id.startsWith('draft-')) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      )
      if (!shouldClose) {
        return
      }
    }

    // Clear any errors when closing
    setLastError(null)
    onClose()
  }, [isSaving, hasUnsavedChanges, story, onClose])

  useEffect(() => {
    if (story) {
      setFormData(story)
      setHasUnsavedChanges(false)
      setLastError(null)
      setIsSaving(false)
    }
  }, [story])

  // Allow backdrop close only after first paint to avoid open/close race
  useEffect(() => {
    setReady(true)
  }, [])

  // Escape to close + lock body scroll while open + intercept Enter key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'Enter') {
        // Always prevent Enter key from doing anything while modal is open
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()

        // Only handle Enter if we're in a form field
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          // Manually trigger form submission
          const form = target.closest('form')
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
            form.dispatchEvent(submitEvent)
          }
        }
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Use capture phase to intercept events before they reach other handlers
    window.addEventListener('keydown', onKey, { capture: true })
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey, { capture: true })
    }
  }, [isOpen, handleClose])

  if (!story || !isOpen) return null

  const handleInputChange = (field: keyof Story, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    setLastError(null) // Clear error when user makes changes
  }

  // Get current values (use formData if available, fall back to story)
  const currentTitle = formData.title ?? story?.title
  const currentDescription = formData.description ?? story?.description

  // Check if any field still has placeholder content
  const hasPlaceholderContent = (
    currentTitle === 'New Story' ||
    currentDescription === 'Add your story description here...'
  )

  // Check if form is valid for saving
  const isValidForSave = currentTitle && currentDescription && !hasPlaceholderContent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Don't save if form is not valid or if already saving
    if (!isValidForSave || isSaving) {
      return
    }

    withSyncAct(() => {
      setIsSaving(true)
      setLastError(null)
    })

    try {
      await onSave({
        ...story,
        ...formData,
        updatedAt: new Date(),
      } as Story)

      // Only close if save was successful
      withSyncAct(() => {
        setHasUnsavedChanges(false)
        setIsSaving(false)
      })

      // Show success message
      showSuccess(
        story?.id.startsWith('draft-')
          ? 'Story created successfully'
          : 'Story updated successfully'
      )

      // onClose() is called from parent after successful save
    } catch (err) {
      // Store the error for potential retry
      const error = err instanceof Error ? err : new Error('Failed to save story')

      withSyncAct(() => {
        setIsSaving(false)
        setLastError(error)
      })

      // Show user-friendly error message via toast
      showError(error, 'Save Failed')

      // Keep modal open so user doesn't lose their changes
      console.error('Failed to save story:', error)
    }
  }

  const handleRetry = async () => {
    if (!lastError || isSaving) return

    // Clear error and retry
    setLastError(null)
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent
    await handleSubmit(submitEvent)
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm pointer-events-auto"
          onClick={() => {
            if (!isSaving && ready) {
              handleClose()
            }
          }}
        />

        {/* Modal Content */}
        <div className="relative z-10 w-full max-w-2xl mx-4 pointer-events-auto">
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-modal-title"
            aria-describedby="story-modal-description"
            data-testid="story-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 id="story-modal-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {story?.id.startsWith('draft-') ? 'Create Story' : 'Edit Story'}
                </h2>
                {hasUnsavedChanges && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">You have unsaved changes</p>
                )}
              </div>
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form id="story-modal-description" onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Error Message with Retry */}
              {lastError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" data-testid="save-error-message">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Save Failed</h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        {lastError instanceof ApiError
                          ? lastError.getUserFriendlyMessage()
                          : lastError.message || 'An unexpected error occurred'}
                      </p>
                      {lastError instanceof ApiError && lastError.isRetryable && (
                        <button
                          onClick={handleRetry}
                          disabled={isSaving}
                          className="mt-3 text-sm font-medium text-red-800 dark:text-red-300 underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'Retrying...' : 'Try Again'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Story Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={currentTitle || ''}
                  onChange={e => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  placeholder="As a user, I want to..."
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={currentDescription || ''}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  placeholder="Describe the user story in detail..."
                  required
                />
              </div>

              {/* Points + Assignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="storyPoints" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Story Points
                  </label>
                  <select
                    id="storyPoints"
                    value={String(formData.storyPoints ?? story?.storyPoints ?? 1)}
                    onChange={e => handleInputChange('storyPoints', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  >
                    <option value="1">1 point</option>
                    <option value="2">2 points</option>
                    <option value="3">3 points</option>
                    <option value="5">5 points</option>
                    <option value="8">8 points</option>
                    <option value="13">13 points</option>
                    <option value="21">21 points</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="assigneeId" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Assignee
                  </label>
                  <input
                    id="assigneeId"
                    type="text"
                    value={formData.assigneeId || ''}
                    onChange={e => handleInputChange('assigneeId', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                    placeholder="Enter assignee name..."
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status || story?.status || 'TODO'}
                  onChange={e => handleInputChange('status', e.target.value as StoryStatus)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValidForSave || isSaving}
                  data-testid="save-button"
                  className={`px-6 py-3 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors flex items-center gap-2 ${
                    isValidForSave && !isSaving
                      ? 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-blue-500'
                      : 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  {isSaving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSaving ? 'Saving...' : story?.id.startsWith('draft-') ? 'Create Story' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
