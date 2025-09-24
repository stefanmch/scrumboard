'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { Story } from '@/types'

// --- Modal Portal ---
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || typeof document === 'undefined') return null

  // Try to use modal-root element, fallback to document.body
  const modalRoot = document.getElementById('modal-root') || document.body
  return createPortal(children, modalRoot)
}

// --- Delete Confirmation Modal ---
export function DeleteConfirmationModal({
  story,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: {
  story: Story | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}) {
  const [ready, setReady] = useState(false)

  // Allow backdrop close only after first paint to avoid open/close race
  useEffect(() => {
    setReady(true)
  }, [])

  // Escape to close + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!story || !isOpen) return null

  const handleConfirm = () => {
    if (isLoading) return
    onConfirm()
    // Don't automatically close - let parent handle closing after API call
  }

  const handleClose = () => {
    if (isLoading) return
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
        <div className="relative z-10 w-full max-w-md mx-4">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 id="delete-modal-title" className="text-xl font-bold text-slate-900">Delete Story</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="text-slate-500 hover:text-slate-700 transition-colors p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4">
                <p id="delete-modal-description" className="text-slate-700 mb-3">
                  Are you sure you want to delete this story? This action cannot be undone.
                </p>

                {/* Story Preview */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                      {story.title}
                    </h3>
                    {story.storyPoints && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex-shrink-0">
                        {story.storyPoints} pts
                      </span>
                    )}
                  </div>
                  {story.description && (
                    <p className="text-slate-600 text-sm line-clamp-2">
                      {story.description}
                    </p>
                  )}
                  <div className="flex items-center mt-3 text-xs text-slate-500">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      story.status === 'TODO' ? 'bg-blue-100 text-blue-800' :
                      story.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {story.status === 'TODO' ? 'To Do' :
                       story.status === 'IN_PROGRESS' ? 'In Progress' : 'Done'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-red-800 text-sm">
                    <strong>Warning:</strong> This will permanently delete the story and all associated data.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Story
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}