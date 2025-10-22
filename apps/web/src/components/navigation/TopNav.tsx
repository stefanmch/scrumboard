'use client'

import { Search, Bell, ChevronDown, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { UserMenu } from './UserMenu'

interface User {
  name: string
  email: string
  avatar?: string
  role?: string
}

export function TopNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | undefined>(undefined)

  // Get user from cookies on mount
  useEffect(() => {
    const cookies = document.cookie.split(';')
    const userCookie = cookies.find((cookie) => cookie.trim().startsWith('user='))

    if (userCookie) {
      try {
        const userValue = userCookie.trim().substring('user='.length)
        const userData = JSON.parse(decodeURIComponent(userValue))
        setUser(userData)
      } catch (error) {
        console.error('Failed to parse user cookie:', error)
      }
    }
  }, [])

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

        {/* Right Section - Sprint selector, Notifications, User */}
        <div className="top-nav-right">
          {/* Sprint Selector (hidden on mobile) */}
          <div className="sprint-selector hidden lg:flex">
            <span className="sprint-label">Sprint 23</span>
            <ChevronDown className="w-4 h-4" />
          </div>

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