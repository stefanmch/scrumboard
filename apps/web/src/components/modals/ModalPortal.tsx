'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

// Singleton pattern for modal root caching
class ModalRootManager {
  private static instance: ModalRootManager
  private modalRoot: HTMLElement | null = null
  private isInitialized: boolean = false

  static getInstance(): ModalRootManager {
    if (!ModalRootManager.instance) {
      ModalRootManager.instance = new ModalRootManager()
    }
    return ModalRootManager.instance
  }

  getModalRoot(): HTMLElement {
    if (!this.isInitialized && typeof window !== 'undefined') {
      // In test environment, always use document.body
      if (process.env.NODE_ENV === 'test') {
        this.modalRoot = document.body
        this.isInitialized = true
        return this.modalRoot
      }

      // Try to use existing modal-root, create if it doesn't exist
      this.modalRoot = document.getElementById('modal-root')
      if (!this.modalRoot) {
        this.modalRoot = document.createElement('div')
        this.modalRoot.id = 'modal-root'
        // Don't use pointer-events-none on the root - let children handle it
        this.modalRoot.className = 'fixed inset-0 z-50'
        this.modalRoot.style.pointerEvents = 'none'
        document.body.appendChild(this.modalRoot)
      }
      this.isInitialized = true
    }

    return this.modalRoot || document.body
  }
}

// Optimized Modal Portal component
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const modalRootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Cache modal root reference on mount
    if (typeof window !== 'undefined') {
      modalRootRef.current = ModalRootManager.getInstance().getModalRoot()
      setMounted(true)
    }
  }, [])

  // Test environment detection
  if (typeof window === 'undefined') return null
  if (!mounted && process.env.NODE_ENV !== 'test') return null

  // Use cached modal root reference
  const modalRoot = modalRootRef.current || document.body
  return createPortal(children, modalRoot)
}