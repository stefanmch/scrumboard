'use client'

import React from 'react'

interface PasswordStrengthIndicatorProps {
  password: string
}

interface PasswordStrength {
  score: number
  label: string
  color: string
  suggestions: string[]
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0
  const suggestions: string[] = []

  if (!password) {
    return { score: 0, label: 'Too weak', color: 'bg-gray-300', suggestions: ['Enter a password'] }
  }

  // Length check
  if (password.length >= 8) score += 1
  else suggestions.push('Use at least 8 characters')

  if (password.length >= 12) score += 1

  // Complexity checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1
  } else {
    suggestions.push('Use both uppercase and lowercase letters')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    suggestions.push('Include at least one number')
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1
  } else {
    suggestions.push('Include at least one special character')
  }

  // Determine label and color
  let label: string
  let color: string

  if (score <= 1) {
    label = 'Weak'
    color = 'bg-red-500'
  } else if (score <= 3) {
    label = 'Fair'
    color = 'bg-yellow-500'
  } else if (score <= 4) {
    label = 'Good'
    color = 'bg-blue-500'
  } else {
    label = 'Strong'
    color = 'bg-green-500'
  }

  return { score, label, color, suggestions: suggestions.slice(0, 2) }
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const strength = calculatePasswordStrength(password)
  const widthPercentage = (strength.score / 5) * 100

  if (!password) return null

  return (
    <div className="mt-2 space-y-2" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${widthPercentage}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">
          {strength.label}
        </span>
      </div>
      {strength.suggestions.length > 0 && (
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1" aria-label="Password suggestions">
          {strength.suggestions.map((suggestion, index) => (
            <li key={index}>• {suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
