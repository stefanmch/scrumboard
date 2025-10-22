'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Input } from '@/components/forms/Input'
import { Button } from '@/components/forms/Button'
import { PasswordStrengthIndicator } from '@/components/forms/PasswordStrengthIndicator'
import { registerAction } from '@/app/actions/auth'
import { useToast } from '@/components/ui/Toast'

const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { showError, showSuccess } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const redirectTimeoutRef = React.useRef<NodeJS.Timeout>()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  })

  const password = watch('password')

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)

    try {
      const result = await registerAction({
        name: data.name,
        email: data.email,
        password: data.password,
      })

      if (!result.success) {
        showError(new Error(result.error), 'Registration Failed')
        return
      }

      showSuccess(
        result.message || 'Please check your email to verify your account.',
        'Registration Successful'
      )

      // Redirect to login page after a short delay
      redirectTimeoutRef.current = setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error) {
      console.error('Unexpected registration error:', error)
      showError(
        error instanceof Error ? error : new Error('An unexpected error occurred'),
        'Registration Failed'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Registration form"
        >
          <div className="space-y-4">
            <Input
              {...register('name')}
              type="text"
              label="Full name"
              placeholder="John Doe"
              error={errors.name?.message}
              autoComplete="name"
              required
              aria-required="true"
              disabled={isLoading}
            />

            <Input
              {...register('email')}
              type="email"
              label="Email address"
              placeholder="you@example.com"
              error={errors.email?.message}
              autoComplete="email"
              required
              aria-required="true"
              disabled={isLoading}
            />

            <div>
              <Input
                {...register('password')}
                type="password"
                label="Password"
                placeholder="Create a strong password"
                error={errors.password?.message}
                autoComplete="new-password"
                required
                aria-required="true"
                showPasswordToggle
                disabled={isLoading}
                helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <Input
              {...register('confirmPassword')}
              type="password"
              label="Confirm password"
              placeholder="Re-enter your password"
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              required
              aria-required="true"
              showPasswordToggle
              disabled={isLoading}
            />
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400">
            By creating an account, you agree to our{' '}
            <Link
              href="/terms"
              className="text-blue-600 hover:text-blue-500 underline"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-blue-600 hover:text-blue-500 underline"
            >
              Privacy Policy
            </Link>
            .
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              Create account
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">
                Already registered?
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/login">
              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
              >
                Sign in instead
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
