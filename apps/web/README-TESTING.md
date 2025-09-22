# Testing Documentation

This document provides a comprehensive overview of the testing setup for the Scrumboard application.

## Testing Framework

The application uses the following testing stack:

- **Jest**: Testing framework
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Additional DOM matchers
- **@testing-library/user-event**: User interaction simulation

## Test Structure

```
src/
├── __tests__/
│   ├── utils/
│   │   └── test-utils.tsx           # Testing utilities and helpers
│   ├── mocks/
│   │   ├── api.ts                   # API mocking utilities
│   │   └── dnd-kit.ts              # Drag & drop mocking utilities
│   └── integration/
│       ├── story-workflows.test.tsx  # End-to-end workflow tests
│       ├── drag-and-drop.test.tsx   # Drag & drop integration tests
│       └── form-validation.test.tsx # Form validation tests
└── components/
    ├── modals/__tests__/
    │   ├── StoryEditModal.test.tsx
    │   └── DeleteConfirmationModal.test.tsx
    ├── story/__tests__/
    │   └── StoryCard.test.tsx
    └── board/__tests__/
        └── Board.test.tsx
```

## Running Tests

### Available Scripts

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Categories

#### Unit Tests

**StoryEditModal** (`src/components/modals/__tests__/StoryEditModal.test.tsx`)
- Modal rendering and visibility
- Form field validation
- Enter key handling
- Keyboard interactions (Escape, Enter)
- Form submission and error handling
- Backdrop and close button interactions

**DeleteConfirmationModal** (`src/components/modals/__tests__/DeleteConfirmationModal.test.tsx`)
- Modal rendering and content display
- Story preview rendering
- Confirmation and cancellation flows
- Keyboard interactions
- Accessibility features

**StoryCard** (`src/components/story/__tests__/StoryCard.test.tsx`)
- Story content rendering
- Story points display and styling
- Assignee display handling
- Action button interactions
- Drag and drop integration
- Content truncation

**Board** (`src/components/board/__tests__/Board.test.tsx`)
- Initial loading and API integration
- Error handling and retry functionality
- Story CRUD operations
- Drag and drop state management
- Modal interactions

#### Integration Tests

**Story Workflows** (`src/__tests__/integration/story-workflows.test.tsx`)
- Complete story creation flow (add → edit → save)
- Complete story editing flow (click edit → modify → save)
- Complete story deletion flow (click delete → confirm → remove)
- Cancellation scenarios
- Error handling during workflows

**Drag and Drop** (`src/__tests__/integration/drag-and-drop.test.tsx`)
- Cross-column story movement
- Within-column reordering
- Cross-column positioning
- Drag state management
- Error recovery during drag operations
- Empty column handling

**Form Validation** (`src/__tests__/integration/form-validation.test.tsx`)
- Real-time validation during input
- Keyboard interaction validation
- API error handling
- Complex validation scenarios
- Special character handling

## Test Utilities

### Mock Factories

```typescript
// Create mock story with custom properties
const mockStory = createMockStory({
  title: 'Custom Title',
  status: 'IN_PROGRESS',
  storyPoints: 5
})

// Create mock column
const mockColumn = createMockColumn('TODO', [story1, story2])
```

### API Mocking

```typescript
// Mock successful API response
mockStoriesApi.create.mockResolvedValue(newStory)

// Mock API error
mockStoriesApi.update.mockRejectedValue(new Error('Update failed'))

// Reset all mocks
resetApiMocks()
```

### Drag and Drop Testing

```typescript
// Simulate drag operations
simulateDragStart('story-1')
simulateDragOver('story-1', 'in-progress')
simulateDragEnd()
```

## Testing Patterns

### Component Testing

1. **Rendering Tests**: Verify components render correctly with different props
2. **Interaction Tests**: Test user interactions like clicks, typing, keyboard events
3. **State Tests**: Verify component state changes correctly
4. **Props Tests**: Ensure props are handled and passed correctly

### Integration Testing

1. **Workflow Tests**: Test complete user workflows from start to finish
2. **Error Boundary Tests**: Verify error handling and recovery
3. **API Integration Tests**: Test component behavior with real API calls (mocked)
4. **Cross-Component Tests**: Test interaction between multiple components

### Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Descriptive Test Names**: Test names should clearly describe the scenario
3. **Arrange-Act-Assert Pattern**: Structure tests with clear setup, action, and verification
4. **Mock External Dependencies**: Mock APIs, external libraries, and complex dependencies
5. **Test Edge Cases**: Include tests for error conditions, empty states, and boundary values

## Coverage Goals

The test suite aims for:
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

## Key Test Scenarios Covered

### Form Validation
- ✅ Default placeholder content validation
- ✅ Required field validation (title, description)
- ✅ Real-time validation feedback
- ✅ Enter key form submission
- ✅ Escape key cancellation

### Story Management
- ✅ Story creation with draft handling
- ✅ Story editing with field updates
- ✅ Story deletion with confirmation
- ✅ API error handling and recovery

### Drag and Drop
- ✅ Cross-column movement with status updates
- ✅ Within-column reordering
- ✅ Drag state management
- ✅ Error handling during drag operations

### User Experience
- ✅ Modal interactions (backdrop, close buttons)
- ✅ Keyboard navigation and shortcuts
- ✅ Loading states and error messages
- ✅ Hover effects and visual feedback

## Running Specific Tests

```bash
# Run tests for a specific component
npm test StoryEditModal

# Run tests matching a pattern
npm test --testNamePattern="form validation"

# Run integration tests only
npm test src/__tests__/integration

# Run with verbose output
npm test --verbose
```

## Debugging Tests

```bash
# Run a single test file in debug mode
npm test -- --runInBand StoryEditModal.test.tsx

# Run with detailed error information
npm test --verbose --no-coverage
```

## Future Test Enhancements

1. **Visual Regression Tests**: Add screenshot testing for UI consistency
2. **Performance Tests**: Add tests for component rendering performance
3. **Accessibility Tests**: Expand a11y testing with specialized tools
4. **E2E Tests**: Add Playwright or Cypress for full browser testing
5. **API Contract Tests**: Add tests to verify API contract compliance