/**
 * Test utilities for comprehensive error handling and modal testing
 * Designed specifically for portal-rendered components and error scenarios
 */

import { screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api'

// ================================
// Modal State Testing Utilities
// ================================

export const ModalTestUtils = {
  /**
   * Reliably waits for modal to appear in portal
   */
  async waitForModalToOpen(modalTitle: string, timeout = 5000): Promise<HTMLElement> {
    return await waitFor(
      () => {
        const modal = screen.getByRole('heading', { name: modalTitle })
        expect(modal).toBeInTheDocument()
        return modal
      },
      { timeout }
    )
  },

  /**
   * Reliably waits for modal to close
   */
  async waitForModalToClose(modalTitle: string, timeout = 5000): Promise<void> {
    await waitFor(
      () => {
        expect(screen.queryByRole('heading', { name: modalTitle })).not.toBeInTheDocument()
      },
      { timeout }
    )
  },

  /**
   * Checks if modal is properly rendered in portal
   */
  isModalInPortal(modalTitle: string): boolean {
    const modalRoot = document.getElementById('modal-root')
    if (!modalRoot) return false

    const modal = within(modalRoot).queryByRole('heading', { name: modalTitle })
    return modal !== null
  },

  /**
   * Verifies modal backdrop behavior
   */
  async verifyBackdropBehavior(modalTitle: string, shouldCloseOnBackdrop = true): Promise<void> {
    const modal = await this.waitForModalToOpen(modalTitle)
    const backdrop = modal.closest('[class*="fixed inset-0"]')

    expect(backdrop).toBeInTheDocument()

    if (shouldCloseOnBackdrop) {
      const user = userEvent.setup()
      await user.click(backdrop!)
      await this.waitForModalToClose(modalTitle)
    }
  },

  /**
   * Checks if body scroll is locked when modal is open
   */
  verifyBodyScrollLock(): void {
    expect(document.body.style.overflow).toBe('hidden')
  },

  /**
   * Verifies body scroll is restored when modal closes
   */
  verifyBodyScrollRestored(): void {
    expect(document.body.style.overflow).toBe('')
  }
}

// ================================
// Error Testing Utilities
// ================================

export const ErrorTestUtils = {
  /**
   * Creates different types of API errors for testing
   */
  createApiError: {
    network: (message = 'Network error occurred') =>
      new ApiError(0, message, new Error('fetch failed'), true),

    validation: (message = 'Validation failed', details?: Record<string, string[]>) => {
      const error = new ApiError(422, message)
      if (details) {
        ;(error as any).validationErrors = details
      }
      return error
    },

    unauthorized: (message = 'Unauthorized access') =>
      new ApiError(401, message),

    forbidden: (message = 'Insufficient permissions') =>
      new ApiError(403, message),

    notFound: (message = 'Resource not found') =>
      new ApiError(404, message),

    rateLimit: (message = 'Too many requests', retryAfter = 60) => {
      const error = new ApiError(429, message)
      ;(error as any).retryAfter = retryAfter
      return error
    },

    serverError: (message = 'Internal server error') =>
      new ApiError(500, message),

    badGateway: (message = 'Bad gateway') =>
      new ApiError(502, message),

    serviceUnavailable: (message = 'Service temporarily unavailable') =>
      new ApiError(503, message),

    timeout: (message = 'Request timeout') =>
      new ApiError(408, message)
  },

  /**
   * Waits for error state to be displayed (implementation dependent)
   */
  async waitForErrorDisplay(timeout = 3000): Promise<void> {
    // This depends on how errors are displayed in your app
    // Could be toast notifications, inline messages, etc.
    await waitFor(() => {
      // Look for common error indicators
      const errorElements = screen.queryAllByText(/error|failed|unable|try again/i)
      const ariaAlerts = screen.queryAllByRole('alert')
      const errorStates = [...errorElements, ...ariaAlerts]

      expect(errorStates.length).toBeGreaterThan(0)
    }, { timeout })
  },

  /**
   * Verifies error message content and user-friendliness
   */
  verifyErrorMessage(expectedPattern: RegExp | string, shouldBeUserFriendly = true): void {
    const errorElements = screen.queryAllByText(
      typeof expectedPattern === 'string'
        ? new RegExp(expectedPattern, 'i')
        : expectedPattern
    )

    expect(errorElements.length).toBeGreaterThan(0)

    if (shouldBeUserFriendly) {
      errorElements.forEach(element => {
        const text = element.textContent || ''
        // User-friendly errors should avoid technical jargon
        expect(text).not.toMatch(/stack trace|internal error|500|xhr|fetch|promise/i)
        // Should provide actionable guidance
        expect(text.length).toBeGreaterThan(10) // Not just "Error"
      })
    }
  },

  /**
   * Checks error accessibility features
   */
  verifyErrorAccessibility(): void {
    // Check for ARIA live regions
    const liveRegions = screen.queryAllByRole('status') || screen.queryAllByRole('alert')
    expect(liveRegions.length).toBeGreaterThan(0)

    // Check for proper labeling
    liveRegions.forEach(region => {
      expect(region).toHaveAttribute('aria-live')
    })
  },

  /**
   * Simulates and verifies retry functionality
   */
  async testRetryFunctionality(
    retryButtonSelector: string | RegExp,
    mockApiMethod: jest.Mock,
    successResponse: any
  ): Promise<void> {
    const user = userEvent.setup()

    // Find retry button
    const retryButton = typeof retryButtonSelector === 'string'
      ? screen.getByText(retryButtonSelector)
      : screen.getByText(retryButtonSelector)

    expect(retryButton).toBeInTheDocument()
    expect(retryButton).toBeEnabled()

    // Setup success response for retry
    mockApiMethod.mockResolvedValueOnce(successResponse)

    // Click retry
    await user.click(retryButton)

    // Verify API was called again
    expect(mockApiMethod).toHaveBeenCalledTimes(2)
  }
}

// ================================
// Async Operation Testing Utilities
// ================================

export const AsyncTestUtils = {
  /**
   * Waits for loading state to appear and disappear
   */
  async waitForLoadingCycle(
    loadingIndicator: string | RegExp = /loading|saving|updating/i,
    timeout = 5000
  ): Promise<void> {
    // Wait for loading to start
    await waitFor(() => {
      expect(screen.getByText(loadingIndicator)).toBeInTheDocument()
    }, { timeout: timeout / 2 })

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(loadingIndicator)).not.toBeInTheDocument()
    }, { timeout: timeout / 2 })
  },

  /**
   * Verifies loading states are properly managed
   */
  async verifyLoadingStates(
    triggerAction: () => Promise<void>,
    loadingIndicator: string | RegExp = /loading|saving/i
  ): Promise<void> {
    // Execute action that should trigger loading
    await triggerAction()

    // Verify loading appears and disappears
    await this.waitForLoadingCycle(loadingIndicator)
  },

  /**
   * Tests button disabled states during async operations
   */
  async verifyButtonDisabledDuringAsync(
    button: HTMLElement,
    asyncAction: () => Promise<void>
  ): Promise<void> {
    expect(button).toBeEnabled()

    // Start async action
    const actionPromise = asyncAction()

    // Button should be disabled during operation
    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    // Wait for completion
    await actionPromise

    // Button should be enabled again (unless there's an error)
    await waitFor(() => {
      expect(button).toBeEnabled()
    })
  }
}

// ================================
// Form Testing Utilities
// ================================

export const FormTestUtils = {
  /**
   * Fills form fields with test data
   */
  async fillForm(fields: Record<string, string>): Promise<void> {
    const user = userEvent.setup()

    for (const [fieldName, value] of Object.entries(fields)) {
      const field = screen.getByDisplayValue(new RegExp(fieldName, 'i')) ||
                   screen.getByLabelText(new RegExp(fieldName, 'i'))

      await user.clear(field)
      await user.type(field, value)
    }
  },

  /**
   * Verifies form validation states
   */
  verifyFormValidation(
    fields: Array<{ name: string; isValid: boolean; errorMessage?: string }>
  ): void {
    fields.forEach(({ name, isValid, errorMessage }) => {
      const field = screen.getByLabelText(new RegExp(name, 'i'))

      if (isValid) {
        expect(field).toBeValid()
      } else {
        expect(field).toBeInvalid()
        if (errorMessage) {
          expect(screen.getByText(errorMessage)).toBeInTheDocument()
        }
      }
    })
  },

  /**
   * Tests form submission with various scenarios
   */
  async testFormSubmission(
    submitButtonText: string,
    mockApiMethod: jest.Mock,
    scenarios: Array<{
      name: string
      formData: Record<string, string>
      mockResponse?: any
      mockError?: Error
      shouldSucceed: boolean
    }>
  ): Promise<void> {
    const user = userEvent.setup()

    for (const scenario of scenarios) {
      // Setup mock response
      if (scenario.mockError) {
        mockApiMethod.mockRejectedValueOnce(scenario.mockError)
      } else if (scenario.mockResponse) {
        mockApiMethod.mockResolvedValueOnce(scenario.mockResponse)
      }

      // Fill form
      await this.fillForm(scenario.formData)

      // Submit form
      const submitButton = screen.getByText(submitButtonText)
      await user.click(submitButton)

      // Verify outcome
      if (scenario.shouldSucceed) {
        await waitFor(() => {
          expect(mockApiMethod).toHaveBeenCalled()
        })
      } else {
        await ErrorTestUtils.waitForErrorDisplay()
      }

      // Reset for next scenario
      mockApiMethod.mockReset()
    }
  }
}

// ================================
// Performance Testing Utilities
// ================================

export const PerformanceTestUtils = {
  /**
   * Measures rendering performance
   */
  measureRenderTime<T>(renderFn: () => T): { result: T; time: number } {
    const start = performance.now()
    const result = renderFn()
    const end = performance.now()

    return { result, time: end - start }
  },

  /**
   * Verifies operation completes within time limit
   */
  async verifyPerformance(
    operation: () => Promise<void>,
    maxTime: number,
    description: string
  ): Promise<void> {
    const start = performance.now()
    await operation()
    const duration = performance.now() - start

    expect(duration).toBeLessThan(maxTime)
    console.log(`${description} completed in ${duration.toFixed(2)}ms (limit: ${maxTime}ms)`)
  }
}

// ================================
// Test Patterns and Helpers
// ================================

export const TestPatterns = {
  /**
   * Standard error handling test pattern
   */
  async testErrorHandling(
    triggerError: () => Promise<void>,
    errorType: 'network' | 'validation' | 'server' | 'permission',
    expectedBehavior: {
      modalStaysOpen?: boolean
      showsErrorMessage?: boolean
      allowsRetry?: boolean
      showsUserFriendlyMessage?: boolean
    }
  ): Promise<void> {
    // Trigger the error
    await triggerError()

    // Verify expected behavior
    if (expectedBehavior.modalStaysOpen) {
      // Modal should remain open for user to fix or retry
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }

    if (expectedBehavior.showsErrorMessage) {
      await ErrorTestUtils.waitForErrorDisplay()
    }

    if (expectedBehavior.showsUserFriendlyMessage) {
      ErrorTestUtils.verifyErrorMessage(/.*/, true)
    }

    if (expectedBehavior.allowsRetry) {
      expect(screen.getByText(/try again|retry/i)).toBeInTheDocument()
    }
  },

  /**
   * Standard portal component test pattern
   */
  async testPortalComponent(
    componentName: string,
    openTrigger: () => Promise<void>,
    tests: {
      rendering?: boolean
      accessibility?: boolean
      interactions?: boolean
      cleanup?: boolean
    }
  ): Promise<void> {
    if (tests.rendering) {
      // Test rendering in portal
      await openTrigger()
      expect(ModalTestUtils.isModalInPortal(componentName)).toBe(true)
      ModalTestUtils.verifyBodyScrollLock()
    }

    if (tests.accessibility) {
      // Test accessibility features
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('role', 'dialog')
    }

    if (tests.interactions) {
      // Test keyboard and mouse interactions
      await ModalTestUtils.verifyBackdropBehavior(componentName)
    }

    if (tests.cleanup) {
      // Test cleanup when component unmounts
      await ModalTestUtils.waitForModalToClose(componentName)
      ModalTestUtils.verifyBodyScrollRestored()

      const modalRoot = document.getElementById('modal-root')
      expect(modalRoot?.children.length).toBe(0)
    }
  }
}

// Export all utilities
export default {
  ModalTestUtils,
  ErrorTestUtils,
  AsyncTestUtils,
  FormTestUtils,
  PerformanceTestUtils,
  TestPatterns
}