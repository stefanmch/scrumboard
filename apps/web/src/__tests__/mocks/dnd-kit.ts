// Mock @dnd-kit modules for testing
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragOver, onDragEnd }: any) => {
    // Store callbacks for testing
    ;(global as any).dndCallbacks = { onDragStart, onDragOver, onDragEnd }
    return children
  },
  DragOverlay: ({ children }: any) => children,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (array: any[], oldIndex: number, newIndex: number) => {
    const result = [...array]
    const item = result.splice(oldIndex, 1)[0]
    result.splice(newIndex, 0, item)
    return result
  },
  verticalListSortingStrategy: 'vertical',
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}))

import { act } from '@testing-library/react'

// Helper functions for testing drag and drop
export const simulateDragStart = (activeId: string) => {
  const callbacks = (global as any).dndCallbacks
  if (callbacks?.onDragStart) {
    act(() => {
      callbacks.onDragStart({ active: { id: activeId } })
    })
  }
}

export const simulateDragOver = (activeId: string, overId: string) => {
  const callbacks = (global as any).dndCallbacks
  if (callbacks?.onDragOver) {
    act(() => {
      callbacks.onDragOver({
        active: { id: activeId },
        over: { id: overId }
      })
    })
  }
}

export const simulateDragEnd = () => {
  const callbacks = (global as any).dndCallbacks
  if (callbacks?.onDragEnd) {
    act(() => {
      callbacks.onDragEnd({})
    })
  }
}