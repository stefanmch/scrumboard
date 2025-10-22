'use client'

import type { User } from '@/app/actions/auth'

/**
 * Client-side authentication utilities
 * Note: Uses cookies instead of localStorage for security
 */

/**
 * Get current user from cookies (client-side only)
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null

  // Get user cookie (this is not httpOnly so it's accessible client-side)
  const cookies = document.cookie.split(';')
  const userCookie = cookies.find(cookie => cookie.trim().startsWith('user='))

  if (!userCookie) return null

  try {
    // Remove 'user=' prefix and decode the rest
    const userValue = userCookie.trim().substring('user='.length)
    return JSON.parse(decodeURIComponent(userValue))
  } catch (error) {
    console.error('Error parsing user cookie:', error)
    return null
  }
}

/**
 * Check if user is authenticated (client-side)
 * Note: This checks for the presence of cookies but cannot verify token validity
 * Server-side authentication should always be used for security-critical operations
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false

  const cookies = document.cookie.split(';')
  const hasAccessToken = cookies.some(cookie => cookie.trim().startsWith('accessToken='))
  const hasUser = cookies.some(cookie => cookie.trim().startsWith('user='))

  return hasAccessToken && hasUser
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null

  const cookies = document.cookie.split(';')
  const cookie = cookies.find(c => c.trim().startsWith(`${name}=`))

  if (!cookie) return null

  return decodeURIComponent(cookie.split('=')[1])
}

/**
 * Listen for authentication state changes
 * This is a simple implementation that polls for changes
 * For production, consider using a more sophisticated approach
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  let currentUser = getCurrentUser()
  callback(currentUser)

  const interval = setInterval(() => {
    const newUser = getCurrentUser()
    const hasChanged = JSON.stringify(currentUser) !== JSON.stringify(newUser)

    if (hasChanged) {
      currentUser = newUser
      callback(newUser)
    }
  }, 1000) // Poll every second

  // Return cleanup function
  return () => clearInterval(interval)
}
