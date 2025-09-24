export interface ErrorState {
  message: string
  type: 'load' | 'save' | 'delete' | 'drag' | 'network'
  isRetryable: boolean
  originalError?: Error
}

export interface LoadingState {
  isLoading: boolean
  operations: Set<string>
}

export interface ApiErrorOptions {
  status: number
  message: string
  originalError?: Error
  isNetworkError?: boolean
}

export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  backoffFactor: number
  maxDelay: number
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorContext {
  operation: string
  component: string
  userId?: string
  timestamp: Date
  severity: ErrorSeverity
}