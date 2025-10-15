import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import RegisterPage from '../page'
import { authApi } from '@/lib/auth/api'
import { useToast } from '@/components/ui/Toast'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/auth/api', () => ({
  authApi: {
    register: jest.fn(),
  },
}))

jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}))

describe('RegisterPage', () => {
  const mockPush = jest.fn()
  const mockShowError = jest.fn()
  const mockShowSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useToast as jest.Mock).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders registration form', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^password$/i)[0]).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<RegisterPage />)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('shows password strength indicator', async () => {
    render(<RegisterPage />)
    const passwordInput = screen.getAllByLabelText(/^password$/i)[0]

    fireEvent.change(passwordInput, { target: { value: 'weak' } })
    await waitFor(() => {
      expect(screen.getByText(/weak/i)).toBeInTheDocument()
    })

    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    await waitFor(() => {
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })

  it('validates password requirements', async () => {
    render(<RegisterPage />)
    const passwordInput = screen.getAllByLabelText(/^password$/i)[0]
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(passwordInput, { target: { value: 'short' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('validates password confirmation match', async () => {
    render(<RegisterPage />)
    const passwordInput = screen.getAllByLabelText(/^password$/i)[0]
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'MEMBER' },
      message: 'Registration successful',
    }
    ;(authApi.register as jest.Mock).mockResolvedValue(mockResponse)

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Test User' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getAllByLabelText(/^password$/i)[0], {
      target: { value: 'Password123!' },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      })
      expect(mockShowSuccess).toHaveBeenCalled()
    })

    jest.advanceTimersByTime(2000)
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('handles registration error', async () => {
    const mockError = new Error('Email already exists')
    ;(authApi.register as jest.Mock).mockRejectedValue(mockError)

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Test User' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getAllByLabelText(/^password$/i)[0], {
      target: { value: 'Password123!' },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(mockError, 'Registration Failed')
    })
  })

  it('has accessible form labels and ARIA attributes', () => {
    render(<RegisterPage />)
    const form = screen.getByRole('form', { name: /registration form/i })
    expect(form).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/full name/i)
    expect(nameInput).toHaveAttribute('aria-required', 'true')
  })

  it('contains link to sign in', () => {
    render(<RegisterPage />)
    const links = screen.getAllByRole('link', { name: /sign in/i })
    expect(links[0]).toHaveAttribute('href', '/login')
  })
})
