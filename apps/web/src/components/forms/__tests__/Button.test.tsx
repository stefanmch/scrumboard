import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from '../Button'

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('applies primary variant by default', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-blue-600')
  })

  it('applies different variants', () => {
    const { rerender } = render(<Button variant="secondary">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600')

    rerender(<Button variant="danger">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })

  it('applies different sizes', () => {
    const { rerender } = render(<Button size="sm">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-sm')

    rerender(<Button size="lg">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-lg')
  })

  it('shows loading state', () => {
    render(<Button isLoading>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Loading...')
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Click me</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})
