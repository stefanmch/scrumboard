/**
 * Performance tests for Toast system optimizations
 * Validates memory leak fixes and timer cleanup
 */

import { render, screen, act, waitFor } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { useState, useEffect } from 'react'

// Mock component to test toast performance
function TestToastComponent({ onMount }: { onMount: (toast: ReturnType<typeof useToast>) => void }) {
  const toast = useToast()

  useEffect(() => {
    onMount(toast)
  }, [toast, onMount])

  return <div data-testid="test-component">Test Component</div>
}

describe('Toast Performance Optimizations', () => {
  let originalTimeout: number

  beforeEach(() => {
    // Store original timeout for restoration
    originalTimeout = window.setTimeout as any
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Memory Leak Prevention', () => {
    it('should properly clean up timers when provider unmounts', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      let toastRef: ReturnType<typeof useToast> | null = null

      const { unmount } = render(
        <ToastProvider>
          <TestToastComponent onMount={(toast) => { toastRef = toast }} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(toastRef).not.toBeNull()
      })

      // Add multiple toasts to create timers
      act(() => {
        toastRef!.addToast({ type: 'success', title: 'Test 1', duration: 5000 })
        toastRef!.addToast({ type: 'error', title: 'Test 2', duration: 3000 })
        toastRef!.addToast({ type: 'warning', title: 'Test 3', duration: 4000 })
      })

      // Verify timers were created
      expect(setTimeoutSpy).toHaveBeenCalledTimes(3)

      // Unmount component
      unmount()

      // Fast-forward to ensure cleanup happens
      act(() => {
        jest.runAllTimers()
      })

      // Verify timers were cleaned up
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(3)

      setTimeoutSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
    })

    it('should clean up individual toast timers when manually removed', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      let toastRef: ReturnType<typeof useToast> | null = null

      render(
        <ToastProvider>
          <TestToastComponent onMount={(toast) => { toastRef = toast }} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(toastRef).not.toBeNull()
      })

      // Add a toast and get its ID
      let toastId: string = ''
      act(() => {
        toastId = toastRef!.addToast({ type: 'success', title: 'Test Toast', duration: 5000 })
      })

      // Remove the toast manually
      act(() => {
        toastRef!.removeToast(toastId)
      })

      // Verify timer was cleaned up
      expect(clearTimeoutSpy).toHaveBeenCalledWith(expect.any(Number))

      clearTimeoutSpy.mockRestore()
    })

    it('should handle rapid toast creation and removal without memory leaks', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      let toastRef: ReturnType<typeof useToast> | null = null

      render(
        <ToastProvider maxToasts={3}>
          <TestToastComponent onMount={(toast) => { toastRef = toast }} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(toastRef).not.toBeNull()
      })

      // Rapidly create and remove toasts
      const toastIds: string[] = []

      act(() => {
        // Create more toasts than maxToasts to test overflow handling
        for (let i = 0; i < 10; i++) {
          const id = toastRef!.addToast({
            type: 'info',
            title: `Test ${i}`,
            duration: 1000 + i * 100
          })
          toastIds.push(id)
        }
      })

      // Only maxToasts (3) should be visible
      expect(screen.getAllByRole('alert')).toHaveLength(3)

      // Remove all toasts
      act(() => {
        toastIds.forEach(id => {
          try {
            toastRef!.removeToast(id)
          } catch (e) {
            // Some toasts may not exist due to maxToasts limit
          }
        })
      })

      // Verify no toasts remain
      expect(screen.queryAllByRole('alert')).toHaveLength(0)

      // Verify timers were properly managed
      expect(clearTimeoutSpy).toHaveBeenCalled()

      setTimeoutSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle error toasts efficiently under 50ms', async () => {
      let toastRef: ReturnType<typeof useToast> | null = null

      render(
        <ToastProvider>
          <TestToastComponent onMount={(toast) => { toastRef = toast }} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(toastRef).not.toBeNull()
      })

      // Measure error toast creation time
      const startTime = performance.now()

      act(() => {
        toastRef!.showError('Test error message', 'Error Title')
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in under 50ms
      expect(duration).toBeLessThan(50)

      // Verify error toast was created
      expect(screen.getByText('Error Title')).toBeInTheDocument()
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should handle multiple simultaneous error toasts efficiently', async () => {
      let toastRef: ReturnType<typeof useToast> | null = null

      render(
        <ToastProvider>
          <TestToastComponent onMount={(toast) => { toastRef = toast }} />
        </ToastProvider>
      )

      await waitFor(() => {
        expect(toastRef).not.toBeNull()
      })

      // Measure time for multiple error toasts
      const startTime = performance.now()

      act(() => {
        // Create multiple error toasts simultaneously
        for (let i = 0; i < 5; i++) {
          toastRef!.showError(`Error ${i}`, `Error Title ${i}`)
        }
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete all operations in under 50ms
      expect(duration).toBeLessThan(50)

      // Should only show maxToasts (default 5)
      const errorToasts = screen.getAllByRole('alert')
      expect(errorToasts).toHaveLength(5)
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should not leak memory with memoized callback functions', async () => {
      // Track function recreations
      const callbackRefs = new Set()

      function TestCallbackComponent() {
        const toast = useToast()

        // Store reference to track if callbacks are being recreated
        callbackRefs.add(toast.addToast)
        callbackRefs.add(toast.removeToast)
        callbackRefs.add(toast.showError)

        return <div data-testid="callback-test">Callback Test</div>
      }

      const { rerender } = render(
        <ToastProvider>
          <TestCallbackComponent />
        </ToastProvider>
      )

      // Initial render should create callbacks
      expect(callbackRefs.size).toBe(3)

      // Multiple re-renders should not create new callbacks
      rerender(
        <ToastProvider>
          <TestCallbackComponent />
        </ToastProvider>
      )

      rerender(
        <ToastProvider>
          <TestCallbackComponent />
        </ToastProvider>
      )

      // Should still have the same callback references (memoized)
      expect(callbackRefs.size).toBe(3)
    })
  })
})