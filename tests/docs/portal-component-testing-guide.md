# Testing Best Practices for Portal-Rendered Components

This guide covers comprehensive testing strategies for components that render in portals, with specific focus on error handling, modal states, and async operations.

## Table of Contents
1. [Portal Component Testing Fundamentals](#portal-component-testing-fundamentals)
2. [Error Handling Test Patterns](#error-handling-test-patterns)
3. [Modal State Management](#modal-state-management)
4. [Async Operation Testing](#async-operation-testing)
5. [Test Utilities and Helpers](#test-utilities-and-helpers)
6. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
7. [React 19 Act() Requirements](#react-19-act-requirements)

## Portal Component Testing Fundamentals

### 1. Portal Setup and Cleanup

Portal components require proper DOM setup and cleanup in tests:

```typescript
describe('Portal Component Tests', () => {
  beforeEach(() => {
    // Create modal root for portals
    const modalRoot = document.createElement('div')
    modalRoot.setAttribute('id', 'modal-root')
    document.body.appendChild(modalRoot)
  })

  afterEach(() => {
    // Cleanup modal root
    const modalRoot = document.getElementById('modal-root')
    if (modalRoot) {
      document.body.removeChild(modalRoot)
    }
    // Restore body scroll
    document.body.style.overflow = ''
  })
})
```

### 2. Reliable Portal Detection

Use the `ModalTestUtils` to reliably check portal rendering:

```typescript
import { ModalTestUtils } from '../test-utilities/error-testing-utils'

it('should render modal in portal', async () => {
  render(<MyModalComponent isOpen={true} />)

  // Wait for modal to appear in portal
  await ModalTestUtils.waitForModalToOpen('Modal Title')

  // Verify it's in the portal, not in the main DOM tree
  expect(ModalTestUtils.isModalInPortal('Modal Title')).toBe(true)
})
```

### 3. Body Scroll Lock Testing

Portal modals typically lock body scroll:

```typescript
it('should lock body scroll when modal opens', () => {
  render(<MyModalComponent isOpen={true} />)

  ModalTestUtils.verifyBodyScrollLock()
})

it('should restore body scroll when modal closes', async () => {
  const { rerender } = render(<MyModalComponent isOpen={true} />)

  rerender(<MyModalComponent isOpen={false} />)

  await ModalTestUtils.waitForModalToClose('Modal Title')
  ModalTestUtils.verifyBodyScrollRestored()
})
```

## Error Handling Test Patterns

### 1. Error Type Differentiation

Test different error types to ensure appropriate user experience:

```typescript
describe('Error Type Handling', () => {
  it('should handle network errors differently from validation errors', async () => {
    // Network error - should suggest checking connection
    const networkError = ErrorTestUtils.createApiError.network()
    mockApi.save.mockRejectedValue(networkError)

    await triggerSaveOperation()

    ErrorTestUtils.verifyErrorMessage(/connection|network/i, true)
    expect(screen.getByRole('dialog')).toBeInTheDocument() // Modal stays open

    // Validation error - should show specific field errors
    const validationError = ErrorTestUtils.createApiError.validation(
      'Validation failed',
      { title: ['Too short'] }
    )
    mockApi.save.mockRejectedValue(validationError)

    await triggerSaveOperation()

    ErrorTestUtils.verifyErrorMessage(/validation|invalid/i, true)
  })
})
```

### 2. Error Recovery Testing

Test that users can recover from errors:

```typescript
it('should allow error recovery', async () => {
  // First attempt fails
  mockApi.save
    .mockRejectedValueOnce(ErrorTestUtils.createApiError.serverError())
    .mockResolvedValueOnce({ success: true })

  await triggerSaveOperation()

  // Modal should stay open with error
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  ErrorTestUtils.verifyErrorMessage(/server|try again/i)

  // Second attempt succeeds
  await triggerSaveOperation()

  // Modal should close
  await ModalTestUtils.waitForModalToClose('Modal Title')
})
```

### 3. Multiple Consecutive Failures

Test resilience to multiple failures:

```typescript
it('should handle multiple consecutive failures gracefully', async () => {
  const error = ErrorTestUtils.createApiError.network()
  mockApi.save
    .mockRejectedValueOnce(error)
    .mockRejectedValueOnce(error)
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce({ success: true })

  for (let i = 0; i < 3; i++) {
    await triggerSaveOperation()

    // Modal should stay open, form data preserved
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Data')).toBeInTheDocument()
  }

  // Fourth attempt succeeds
  await triggerSaveOperation()
  await ModalTestUtils.waitForModalToClose('Modal Title')
})
```

## Modal State Management

### 1. Modal Lifecycle Testing

```typescript
describe('Modal Lifecycle', () => {
  it('should handle complete modal lifecycle', async () => {
    const user = userEvent.setup()

    // Initial state - closed
    render(<ComponentWithModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Open modal
    await user.click(screen.getByText('Open Modal'))
    await ModalTestUtils.waitForModalToOpen('Modal Title')

    // Interact with modal content
    await FormTestUtils.fillForm({
      'Field Name': 'Test Value'
    })

    // Close modal
    await user.click(screen.getByText('Cancel'))
    await ModalTestUtils.waitForModalToClose('Modal Title')

    // Verify cleanup
    expect(document.getElementById('modal-root')?.children.length).toBe(0)
  })
})
```

### 2. Modal Interaction Testing

```typescript
it('should handle all modal interaction methods', async () => {
  const user = userEvent.setup()
  render(<MyModal isOpen={true} onClose={mockOnClose} />)

  await ModalTestUtils.waitForModalToOpen('Modal Title')

  // Test backdrop click
  await ModalTestUtils.verifyBackdropBehavior('Modal Title', true)

  // Test escape key
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
  expect(mockOnClose).toHaveBeenCalled()

  // Test close button
  await user.click(screen.getByLabelText('Close modal'))
  expect(mockOnClose).toHaveBeenCalledTimes(2)
})
```

## Async Operation Testing

### 1. Loading State Management

```typescript
describe('Async Operations', () => {
  it('should manage loading states properly', async () => {
    const user = userEvent.setup()

    // Mock slow operation
    mockApi.save.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<MyComponent />)
    const saveButton = screen.getByText('Save')

    // Test loading state cycle
    await AsyncTestUtils.verifyLoadingStates(
      async () => {
        await user.click(saveButton)
        act(() => jest.advanceTimersByTime(1000))
      },
      /saving|loading/i
    )
  })
})
```

### 2. Button State During Async Operations

```typescript
it('should disable buttons during async operations', async () => {
  const user = userEvent.setup()

  mockApi.save.mockImplementation(() =>
    new Promise(resolve => setTimeout(resolve, 500))
  )

  render(<MyComponent />)
  const saveButton = screen.getByText('Save')

  await AsyncTestUtils.verifyButtonDisabledDuringAsync(
    saveButton,
    async () => {
      await user.click(saveButton)
      act(() => jest.advanceTimersByTime(500))
    }
  )
})
```

## Test Utilities and Helpers

### 1. Using Custom Test Utilities

The test utilities provide standardized patterns:

```typescript
import {
  ModalTestUtils,
  ErrorTestUtils,
  AsyncTestUtils,
  FormTestUtils,
  TestPatterns
} from '../test-utilities/error-testing-utils'

describe('Component Tests', () => {
  it('should follow standard error handling pattern', async () => {
    await TestPatterns.testErrorHandling(
      async () => {
        await triggerErrorScenario()
      },
      'network',
      {
        modalStaysOpen: true,
        showsErrorMessage: true,
        allowsRetry: true,
        showsUserFriendlyMessage: true
      }
    )
  })

  it('should follow standard portal component pattern', async () => {
    await TestPatterns.testPortalComponent(
      'My Modal',
      async () => await openModal(),
      {
        rendering: true,
        accessibility: true,
        interactions: true,
        cleanup: true
      }
    )
  })
})
```

### 2. Form Testing Patterns

```typescript
describe('Form Testing', () => {
  it('should test form submission scenarios', async () => {
    await FormTestUtils.testFormSubmission(
      'Save Changes',
      mockApi.save,
      [
        {
          name: 'Valid submission',
          formData: { title: 'Valid Title', description: 'Valid Description' },
          mockResponse: { id: '123' },
          shouldSucceed: true
        },
        {
          name: 'Invalid submission',
          formData: { title: '', description: 'Valid Description' },
          mockError: ErrorTestUtils.createApiError.validation('Title required'),
          shouldSucceed: false
        }
      ]
    )
  })
})
```

## Common Pitfalls and Solutions

### 1. Portal Element Not Found

**Problem**: Tests fail because portal root doesn't exist.

**Solution**: Always set up portal root in beforeEach:

```typescript
beforeEach(() => {
  if (!document.getElementById('modal-root')) {
    const modalRoot = document.createElement('div')
    modalRoot.setAttribute('id', 'modal-root')
    document.body.appendChild(modalRoot)
  }
})
```

### 2. Timing Issues with Portal Rendering

**Problem**: Tests fail because they don't wait for portal rendering.

**Solution**: Use `waitFor` and proper async patterns:

```typescript
// ❌ Bad - doesn't wait for portal rendering
it('should render modal', () => {
  render(<Modal isOpen={true} />)
  expect(screen.getByRole('dialog')).toBeInTheDocument() // May fail
})

// ✅ Good - waits for portal rendering
it('should render modal', async () => {
  render(<Modal isOpen={true} />)
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
```

### 3. Memory Leaks in Tests

**Problem**: Modals remain in DOM between tests.

**Solution**: Proper cleanup in afterEach:

```typescript
afterEach(() => {
  // Clean up all portals
  const modalRoot = document.getElementById('modal-root')
  if (modalRoot) {
    modalRoot.innerHTML = ''
    document.body.removeChild(modalRoot)
  }

  // Reset body styles
  document.body.style.overflow = ''
  document.body.removeAttribute('style')
})
```

### 4. Event Handling in Portals

**Problem**: Events don't propagate correctly in portal tests.

**Solution**: Use `within` and proper event targeting:

```typescript
it('should handle events in portal', async () => {
  const user = userEvent.setup()
  render(<Modal isOpen={true} />)

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  const modal = screen.getByRole('dialog')
  const button = within(modal).getByText('Save')

  await user.click(button)
})
```

## React 19 Act() Requirements

### 1. Wrapping State Updates

React 19 requires more strict wrapping of state updates:

```typescript
it('should handle state updates properly', async () => {
  const user = userEvent.setup()

  render(<MyComponent />)

  // Wrap user interactions that trigger state updates
  await act(async () => {
    await user.click(screen.getByText('Toggle Modal'))
  })

  // Wrap API calls that update state
  await act(async () => {
    await waitFor(() => {
      expect(mockApi.save).toHaveBeenCalled()
    })
  })
})
```

### 2. Timer Advancement

When using fake timers with state updates:

```typescript
it('should handle async operations with timers', async () => {
  jest.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

  mockApi.save.mockImplementation(() =>
    new Promise(resolve => setTimeout(resolve, 1000))
  )

  render(<MyComponent />)

  await user.click(screen.getByText('Save'))

  // Wrap timer advancement in act()
  await act(async () => {
    jest.advanceTimersByTime(1000)
  })

  await waitFor(() => {
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
  })

  jest.useRealTimers()
})
```

### 3. Error Boundary Testing

```typescript
it('should handle errors with proper act() wrapping', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation()

  await act(async () => {
    render(<ComponentWithErrorBoundary />)
  })

  await act(async () => {
    // Trigger error that causes state update
    fireEvent.click(screen.getByText('Trigger Error'))
  })

  await waitFor(() => {
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  consoleError.mockRestore()
})
```

## Performance Testing

### 1. Render Performance

```typescript
describe('Performance', () => {
  it('should render portal components efficiently', () => {
    const { time } = PerformanceTestUtils.measureRenderTime(() => {
      render(<ComplexModal isOpen={true} />)
    })

    expect(time).toBeLessThan(100) // Should render in under 100ms
  })
})
```

### 2. Memory Usage

```typescript
it('should not leak memory', () => {
  const initialMemory = performance.memory?.usedJSHeapSize || 0

  for (let i = 0; i < 100; i++) {
    const { unmount } = render(<Modal isOpen={true} />)
    unmount()
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }

  const finalMemory = performance.memory?.usedJSHeapSize || 0
  const memoryIncrease = finalMemory - initialMemory

  expect(memoryIncrease).toBeLessThan(1024 * 1024) // Less than 1MB increase
})
```

## Accessibility Testing

### 1. ARIA Attributes

```typescript
it('should have proper accessibility attributes', () => {
  render(<Modal isOpen={true} title="Test Modal" />)

  const modal = screen.getByRole('dialog')
  expect(modal).toHaveAttribute('aria-modal', 'true')
  expect(modal).toHaveAttribute('aria-labelledby')
  expect(modal).toHaveAttribute('role', 'dialog')
})
```

### 2. Focus Management

```typescript
it('should manage focus properly', async () => {
  const user = userEvent.setup()

  render(<ComponentWithModal />)

  // Open modal
  const openButton = screen.getByText('Open Modal')
  await user.click(openButton)

  await waitFor(() => {
    const modal = screen.getByRole('dialog')
    expect(modal).toHaveFocus()
  })

  // Close modal and verify focus returns
  await user.press('Escape')

  await waitFor(() => {
    expect(openButton).toHaveFocus()
  })
})
```

## Best Practices Summary

1. **Always set up and clean up portal DOM elements**
2. **Use waitFor for async portal operations**
3. **Test all interaction methods (backdrop, escape, buttons)**
4. **Verify error handling keeps modals in correct state**
5. **Test form data persistence across errors**
6. **Use act() for all state updates in React 19**
7. **Test loading states and button disabled states**
8. **Verify accessibility attributes and focus management**
9. **Use the provided test utilities for consistency**
10. **Test error recovery scenarios thoroughly**

By following these patterns and using the provided utilities, you can create robust, reliable tests for portal-rendered components that handle errors gracefully and provide excellent user experience.