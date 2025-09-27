'use client'

import React, { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from 'react'
import { ApiError } from '@/lib/api'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearAllToasts: () => void
  showError: (error: Error | ApiError | string, title?: string) => string
  showSuccess: (message: string, title?: string) => string
  showWarning: (message: string, title?: string) => string
  showInfo: (message: string, title?: string) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
  maxToasts?: number
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const removeToast = useCallback((id: string) => {
    // Clear associated timer
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = crypto.randomUUID()
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    }

    setToasts(prev => {
      const updated = [...prev, newToast].slice(-maxToasts)
      return updated
    })

    // Auto-remove toast after duration with proper timer tracking
    if (newToast.duration && newToast.duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id)
      }, newToast.duration)

      // Track timer for cleanup
      timersRef.current.set(id, timer)
    }

    return id
  }, [maxToasts, removeToast])

  const clearAllToasts = useCallback(() => {
    // Clear all active timers
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current.clear()

    setToasts([])
  }, [])

  const showError = useCallback((error: Error | ApiError | string, title?: string): string => {
    let message: string
    let actionTitle = title || 'Error'

    if (typeof error === 'string') {
      message = error
    } else if (error instanceof ApiError) {
      message = error.getUserFriendlyMessage()
      actionTitle = title || 'API Error'
    } else {
      message = error.message || 'An unexpected error occurred'
    }

    return addToast({
      type: 'error',
      title: actionTitle,
      message,
      duration: 8000, // Longer duration for errors
    })
  }, [addToast])

  const showSuccess = useCallback((message: string, title?: string): string => {
    return addToast({
      type: 'success',
      title: title || 'Success',
      message,
      duration: 4000,
    })
  }, [addToast])

  const showWarning = useCallback((message: string, title?: string): string => {
    return addToast({
      type: 'warning',
      title: title || 'Warning',
      message,
      duration: 6000,
    })
  }, [addToast])

  const showInfo = useCallback((message: string, title?: string): string => {
    return addToast({
      type: 'info',
      title: title || 'Info',
      message,
      duration: 5000,
    })
  }, [addToast])

  const value: ToastContextType = React.useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  }), [toasts, addToast, removeToast, clearAllToasts, showError, showSuccess, showWarning, showInfo])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Trigger entrance animation
    animationTimerRef.current = setTimeout(() => setIsVisible(true), 10)
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current)
      }
    }
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current)
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current)
      }
    }
  }, [])

  const handleRemove = useCallback(() => {
    setIsLeaving(true)
    exitTimerRef.current = setTimeout(() => onRemove(toast.id), 300)
  }, [toast.id, onRemove])

  const getToastStyles = useCallback(() => {
    const baseClasses = 'p-4 rounded-lg shadow-lg border transition-all duration-300 transform'
    const visibilityClasses = isLeaving
      ? 'opacity-0 translate-x-full scale-95'
      : isVisible
      ? 'opacity-100 translate-x-0 scale-100'
      : 'opacity-0 translate-x-full scale-95'

    switch (toast.type) {
      case 'success':
        return `${baseClasses} ${visibilityClasses} bg-green-50 border-green-200 text-green-800`
      case 'error':
        return `${baseClasses} ${visibilityClasses} bg-red-50 border-red-200 text-red-800`
      case 'warning':
        return `${baseClasses} ${visibilityClasses} bg-yellow-50 border-yellow-200 text-yellow-800`
      case 'info':
        return `${baseClasses} ${visibilityClasses} bg-blue-50 border-blue-200 text-blue-800`
      default:
        return `${baseClasses} ${visibilityClasses} bg-gray-50 border-gray-200 text-gray-800`
    }
  }, [isLeaving, isVisible, toast.type])

  const getIcon = useCallback(() => {
    const iconClasses = 'w-5 h-5 flex-shrink-0'

    switch (toast.type) {
      case 'success':
        return (
          <svg className={`${iconClasses} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className={`${iconClasses} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={`${iconClasses} text-yellow-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className={`${iconClasses} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }, [toast.type])

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={getToastStyles()}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{toast.title}</p>
          {toast.message && (
            <p className="mt-1 text-sm opacity-90">{toast.message}</p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-xs font-medium underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}