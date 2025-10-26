'use client'

import { Search, Bell, ChevronDown, Menu, FolderOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import { UserMenu } from './UserMenu'
import { useProject } from '@/contexts/ProjectContext'
import { useRouter } from 'next/navigation'

interface User {
  name: string
  email: string
  avatar?: string
  role?: string
}

export function TopNav() {
  const router = useRouter()
  const { selectedProject } = useProject()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | undefined>(undefined)

  // Function to read user from cookies
  const getUserFromCookies = () => {
    const cookies = document.cookie.split(';')
    const userCookie = cookies.find((cookie) => cookie.trim().startsWith('user='))

    if (userCookie) {
      try {
        const userValue = userCookie.trim().substring('user='.length)
        const userData = JSON.parse(decodeURIComponent(userValue))
        return userData
      } catch (error) {
        console.error('Failed to parse user cookie:', error)
        return undefined
      }
    }
    return undefined
  }

  // Get user from cookies on mount and set up listener for auth changes
  useEffect(() => {
    // Initial load
    setUser(getUserFromCookies())

    // Listen for auth state changes (login/logout)
    const handleAuthChange = () => {
      setUser(getUserFromCookies())
    }

    window.addEventListener('auth-change', handleAuthChange)

    return () => {
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [])

  const handleProjectClick = () => {
    router.push('/projects')
  }

  return (
    <header className="top-nav">
      <div className="top-nav-container">
        {/* Left Section - Logo and Mobile Menu */}
        <div className="top-nav-left">
          <button
            className="mobile-menu-btn md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <a href="/" className="logo">
            <span className="logo-icon">🏠</span>
            <span className="logo-text">ScrumBoard</span>
          </a>
        </div>

        {/* Center Section - Search (hidden on mobile) */}
        <div className="top-nav-center hidden md:flex">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search stories, tasks, people..."
              className="search-input"
            />
          </div>
        </div>

        {/* Right Section - Project selector, Notifications, User */}
        <div className="top-nav-right">
          {/* Project Selector (hidden on mobile) */}
          <button
            onClick={handleProjectClick}
            className="sprint-selector hidden lg:flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Select project"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="sprint-label">
              {selectedProject ? selectedProject.name : 'Select Project'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button className="notification-btn" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="notification-badge">3</span>
          </button>

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}