'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, User, Settings, LogOut, Shield, LogIn, UserPlus } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

interface UserMenuProps {
  user?: {
    name: string
    email: string
    avatar?: string
    role?: string
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    try {
      await logoutAction()

      // Trigger auth change event to update UI components
      window.dispatchEvent(new Event('auth-change'))

      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getInitials = (name: string) => {
    if (!name || name.trim().length === 0) {
      console.log('UserMenu: Empty name, returning ?')
      return '?'
    }

    console.log('UserMenu: Getting initials for name:', name)
    const parts = name.trim().split(/\s+/) // Split by any whitespace
    console.log('UserMenu: Name parts:', parts)

    if (parts.length === 1) {
      // Single word name - take first 2 characters
      const initials = parts[0].slice(0, 2).toUpperCase()
      console.log('UserMenu: Single word, initials:', initials)
      return initials
    }

    // Multiple words - take first letter of first 2 words
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
    console.log('UserMenu: Multiple words, initials:', initials)
    return initials
  }

  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    return user.name || user.email
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Menu Button */}
      <button
        className="user-menu-btn flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {/* Avatar */}
        <div className="user-avatar w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium overflow-hidden">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                console.error('UserMenu: Failed to load avatar image:', user.avatar)
                // Hide the broken image by removing src
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <span className="text-xs">{user ? getInitials(user.name) : '?'}</span>
          )}
        </div>

        {/* User Name (hidden on mobile) */}
        <span className="user-name hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-200">
          {getUserDisplayName()}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 hidden md:inline text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {user ? (
            <>
              {/* Authenticated User Menu */}
              {/* User Info Section */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
                {user.role && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {user.role}
                  </p>
                )}
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/profile')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-3"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/settings')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-3"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Unauthenticated User Menu */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/login')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-3"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/register')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors flex items-center gap-3 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Create account
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
