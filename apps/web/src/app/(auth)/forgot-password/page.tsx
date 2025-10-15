'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Input } from '@/components/forms/Input'
import { Button } from '@/components/forms/Button'
import { authApi } from '@/lib/auth/api'
import { useToast } from '@/components/ui/Toast'
import { ArrowLeft } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const { showError, showSuccess } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)

    try {
      const response = await authApi.forgotPassword(data.email)
      showSuccess(
        response.message || 'If an account exists, you will receive a password reset email.',
        'Email Sent'
      )
      setEmailSent(true)
    } catch (error) {
      showError(error as Error, 'Request Failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 mb-4 focus:outline-none focus:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to login
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {emailSent
              ? 'Check your email for a reset link'
              : 'Enter your email address and we\'ll send you a link to reset your password'}
          </p>
        </div>

        {!emailSent ? (
          <form
            className="mt-8 space-y-6"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-label="Forgot password form"
          >
            <div>
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
                Send reset link
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Check your email
                  </h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <p>
                      We've sent password reset instructions to your email address.
                      If you don't receive an email within a few minutes, please check
                      your spam folder.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Link href="/login">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth
                >
                  Return to login
                </Button>
              </Link>
            </div>

            <div className="text-center">
              <button
                onClick={() => setEmailSent(false)}
                className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Try a different email
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">
                Don't have an account?
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
