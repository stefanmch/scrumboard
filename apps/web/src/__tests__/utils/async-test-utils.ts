import { act } from '@testing-library/react'

/**
 * Test utility to safely wrap async operations with act() in test environment
 * This ensures React state updates are properly handled during testing
 */

// Type for async functions that may or may not return a value
type AsyncFunction<T = any> = () => Promise<T>

/**
 * Wraps async operations with act() in test environment, passes through in production
 * @param asyncFn - The async function to execute
 * @returns Promise that resolves with the result of asyncFn
 */
export const withAsyncAct = async <T>(asyncFn: AsyncFunction<T>): Promise<T> => {
  // In test environment, wrap with act()
  if (process.env.NODE_ENV === 'test') {
    let result: T
    await act(async () => {
      result = await asyncFn()
    })
    return result!
  }

  // In production, execute normally
  return asyncFn()
}

/**
 * Wraps state updates with act() in test environment only
 * @param updateFn - Function that performs state updates
 */
export const withSyncAct = (updateFn: () => void): void => {
  if (process.env.NODE_ENV === 'test') {
    act(updateFn)
  } else {
    updateFn()
  }
}

/**
 * Utility for test delays that are properly wrapped
 * @param ms - Milliseconds to delay
 */
export const testDelay = async (ms: number): Promise<void> => {
  await withAsyncAct(async () => {
    await new Promise(resolve => setTimeout(resolve, ms))
  })
}

/**
 * Higher-order function to wrap async functions for test safety
 * @param asyncFn - The async function to wrap
 * @returns Wrapped function that's test-safe
 */
export const makeTestSafe = <T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    return withAsyncAct(() => asyncFn(...args))
  }
}