import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Input } from '../Input'

describe('Input Component', () => {
  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(<Input label="Email" error="Email is required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required')
  })

  it('displays helper text when no error', () => {
    render(<Input label="Email" helperText="Enter your email address" />)
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(<Input label="Email" required />)
    expect(screen.getByLabelText('required')).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    render(<Input type="password" showPasswordToggle />)
    const input = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement
    const toggleButton = screen.getByLabelText('Show password')

    expect(input.type).toBe('password')

    fireEvent.click(toggleButton)
    expect(input.type).toBe('text')
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument()

    fireEvent.click(toggleButton)
    expect(input.type).toBe('password')
  })

  it('applies error styling', () => {
    render(<Input label="Email" error="Invalid email" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('disables input when disabled prop is true', () => {
    render(<Input label="Email" disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})
