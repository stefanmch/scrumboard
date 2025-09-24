'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Story, StoryStatus } from '@/types'

// --- Modal Portal ---
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || typeof document === 'undefined') return null

  // Try to use modal-root element, fallback to document.body
  const modalRoot = document.getElementById('modal-root') || document.body
  return createPortal(children, modalRoot)
}

// --- Story Edit Modal ---
export function StoryEditModal({
  story,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
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
  const [lastSaveError, setLastSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (story) {
      setFormData(story)
      setHasUnsavedChanges(false)
      setLastSaveError(null)
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
        onClose()
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
  }, [isOpen, onClose])

  if (!story || !isOpen) return null

  const handleInputChange = (field: keyof Story, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    setLastSaveError(null) // Clear error when user makes changes
  }

  // Get current values (use formData if available, fall back to story)
  const currentTitle = formData.title ?? story?.title
  const currentDescription = formData.description ?? story?.description

  // Check if content is still default placeholder content
  const isDefaultContent = (
    currentTitle === 'New Story' &&
    currentDescription === 'Add your story description here...'
  )

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

    // Don't save if form is not valid or if already loading
    if (!isValidForSave || isLoading) {
      return
    }

    try {
      setLastSaveError(null)
      await onSave({
        ...story,
        ...formData,
        updatedAt: new Date(),
      } as Story)

      // Only close if save was successful
      setHasUnsavedChanges(false)
      // onClose() is called from parent after successful save
    } catch (err) {
      // Keep modal open if save failed and show error
      const errorMessage = err instanceof Error ? err.message : 'Failed to save story'
      setLastSaveError(errorMessage)
    }
  }

  const handleClose = () => {
    // Prevent closing while saving
    if (isLoading) {
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

    onClose()
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={e => {
          if (!ready) return
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-800/60 backdrop-blur-sm" />
        
        {/* Modal Content */}
        <div className="relative z-10 w-full max-w-2xl mx-4">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {story?.id.startsWith('draft-') ? 'Create Story' : 'Edit Story'}
                </h2>
                {hasUnsavedChanges && (
                  <p className="text-sm text-amber-600 mt-1">You have unsaved changes</p>
                )}
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="text-slate-500 hover:text-slate-700 transition-colors p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Error Message */}
              {lastSaveError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Save Failed</h3>
                      <p className="text-sm text-red-700 mt-1">{lastSaveError}</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-800 mb-2">
                  Story Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={currentTitle || ''}
                  onChange={e => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-slate-900 bg-white"
                  placeholder="As a user, I want to..."
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-800 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={currentDescription || ''}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-slate-900 bg-white"
                  placeholder="Describe the user story in detail..."
                  required
                />
              </div>

              {/* Points + Assignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="storyPoints" className="block text-sm font-semibold text-slate-800 mb-2">
                    Story Points
                  </label>
                  <select
                    id="storyPoints"
                    value={formData.storyPoints || story?.storyPoints || 1}
                    onChange={e => handleInputChange('storyPoints', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                  >
                    <option value={1}>1 point</option>
                    <option value={2}>2 points</option>
                    <option value={3}>3 points</option>
                    <option value={5}>5 points</option>
                    <option value={8}>8 points</option>
                    <option value={13}>13 points</option>
                    <option value={21}>21 points</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="assigneeId" className="block text-sm font-semibold text-slate-800 mb-2">
                    Assignee
                  </label>
                  <input
                    id="assigneeId"
                    type="text"
                    value={formData.assigneeId || ''}
                    onChange={e => handleInputChange('assigneeId', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                    placeholder="Enter assignee name..."
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-slate-800 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status || story?.status || 'TODO'}
                  onChange={e => handleInputChange('status', e.target.value as StoryStatus)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Actions */}
              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValidForSave || isLoading}
                  className={`px-6 py-3 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors flex items-center gap-2 ${
                    isValidForSave && !isLoading
                      ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  }`}
                >
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isLoading ? 'Saving...' : story?.id.startsWith('draft-') ? 'Create Story' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
