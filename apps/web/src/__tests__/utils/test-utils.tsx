import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Story, StoryStatus } from '@/types'

// Custom render function that includes any providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockStory = (overrides: Partial<Story> = {}): Story => ({
  id: 'story-1',
  title: 'Test Story',
  description: 'Test Description',
  storyPoints: 3,
  status: 'TODO' as StoryStatus,
  priority: 'MEDIUM',
  type: 'FEATURE',
  refinementStatus: 'NOT_REFINED',
  tags: [],
  rank: 1,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  projectId: 'project-1',
  creatorId: 'user-1',
  sprintId: null,
  assigneeId: null,
  parentId: null,
  businessValue: null,
  acceptanceCriteria: null,
  assignee: null,
  creator: null,
  parent: null,
  children: [],
  project: null,
  sprint: null,
  tasks: [],
  comments: [],
  ...overrides,
})

export const createMockColumn = (status: StoryStatus, stories: Story[] = []) => ({
  id: status.toLowerCase().replace('_', '-'),
  title: status === 'TODO' ? 'To Do' : status === 'IN_PROGRESS' ? 'In Progress' : 'Done',
  status,
  stories,
})

// Mock functions for common scenarios
export const mockApiResponse = <T>(data: T, delay = 0): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}

export const mockApiError = (message = 'API Error', status = 500, delay = 0): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message)
      ;(error as any).status = status
      reject(error)
    }, delay)
  })
}

// Event helpers
export const createKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}) => {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
}

export const createMouseEvent = (type: string, options: Partial<MouseEvent> = {}) => {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  })
}

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock portal container for modal tests
export const setupModalContainer = () => {
  const modalRoot = document.createElement('div')
  modalRoot.setAttribute('id', 'modal-root')
  document.body.appendChild(modalRoot)
  return modalRoot
}

export const cleanupModalContainer = () => {
  const modalRoot = document.getElementById('modal-root')
  if (modalRoot) {
    document.body.removeChild(modalRoot)
  }
}