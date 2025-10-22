'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Input } from '@/components/forms/Input'
import { Button } from '@/components/forms/Button'
import { Checkbox } from '@/components/forms/Checkbox'
import { loginAction } from '@/app/actions/auth'
import { authApi } from '@/lib/auth/api'
import { useToast } from '@/components/ui/Toast'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showError, showSuccess } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    try {
      // Call both server action (for httpOnly cookies) and client API (for localStorage)
      const [serverResult, clientResult] = await Promise.all([
        loginAction({
          email: data.email,
          password: data.password,
        }),
        authApi.login({
          email: data.email,
          password: data.password,
        })
      ])

      if (!serverResult.success) {
        // Handle specific error cases
        if (serverResult.statusCode === 403 && serverResult.error.includes('verify')) {
          showError(
            new Error('Please verify your email address before logging in. Check your inbox for the verification link.'),
            'Email Verification Required'
          )
        } else {
          showError(new Error(serverResult.error), 'Login Failed')
        }
        return
      }

      showSuccess(`Welcome back, ${serverResult.user.name}!`, 'Login Successful')

      // Trigger auth change event to update UI components
      window.dispatchEvent(new Event('auth-change'))

      // Get redirect URL from query params or default to home
      const redirect = searchParams.get('redirect') || '/'
      router.push(redirect)
    } catch (error) {
      console.error('Unexpected login error:', error)
      showError(
        error instanceof Error ? error : new Error('An unexpected error occurred'),
        'Login Failed'
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
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Login form"
        >
          <div className="rounded-md shadow-sm space-y-4">
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

            <Input
              {...register('password')}
              type="password"
              label="Password"
              placeholder="Enter your password"
              error={errors.password?.message}
              autoComplete="current-password"
              required
              aria-required="true"
              showPasswordToggle
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              {...register('rememberMe')}
              label="Remember me"
              disabled={isLoading}
            />

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition"
              >
                Forgot your password?
              </Link>
            </div>
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
              Sign in
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
                New to Scrumboard?
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/register">
              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
              >
                Create an account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
