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
  return createPortal(children, document.body)
}

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
  onSave: (updatedStory: Story) => void
}) {
  const [formData, setFormData] = useState<Partial<Story>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (story) setFormData(story)
  }, [story])

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

  const handleInputChange = (field: keyof Story, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.title && formData.description) {
      onSave({
        ...story,
        ...formData,
        updatedAt: new Date(),
      } as Story)
      onClose()
    }
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
              <h2 className="text-2xl font-bold text-slate-900">Edit Story</h2>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-slate-800 mb-2">
                  Story Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title || ''}
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
                  value={formData.description || ''}
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
                    value={formData.storyPoints || 1}
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
                  value={formData.status || 'TODO'}
                  onChange={e => handleInputChange('status', e.target.value as StoryStatus)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
