import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import LoginPage from '../page'
import { authApi } from '@/lib/auth/api'
import { useToast } from '@/components/ui/Toast'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/auth/api', () => ({
  authApi: {
    login: jest.fn(),
  },
}))

jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}))

describe('LoginPage', () => {
  const mockPush = jest.fn()
  const mockShowError = jest.fn()
  const mockShowSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useToast as jest.Mock).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    })
  })

  it('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<LoginPage />)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    render(<LoginPage />)
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'MEMBER' },
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresIn: 900,
      tokenType: 'Bearer',
    }
    ;(authApi.login as jest.Mock).mockResolvedValue(mockResponse)

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      })
      expect(mockShowSuccess).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('handles login error', async () => {
    const mockError = new Error('Invalid credentials')
    ;(authApi.login as jest.Mock).mockRejectedValue(mockError)

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'WrongPassword' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(mockError, 'Login Failed')
    })
  })

  it('has accessible form labels and ARIA attributes', () => {
    render(<LoginPage />)
    const form = screen.getByRole('form', { name: /login form/i })
    expect(form).toBeInTheDocument()

    const emailInput = screen.getByLabelText(/email address/i)
    expect(emailInput).toHaveAttribute('aria-required', 'true')

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('aria-required', 'true')
  })

  it('contains links to register and forgot password', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /create a new account/i })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute('href', '/forgot-password')
  })
})
