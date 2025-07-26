'use client'

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { APIClientError, getErrorMessage, isAPIError, ErrorCodes } from '@/lib/api-client'

// Toast notification system
export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  success: (title: string, message?: string, options?: Partial<Toast>) => void
  error: (title: string, message?: string, options?: Partial<Toast>) => void
  warning: (title: string, message?: string, options?: Partial<Toast>) => void
  info: (title: string, message?: string, options?: Partial<Toast>) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
  maxToasts?: number
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    }

    setToasts(prev => {
      const updated = [newToast, ...prev]
      return updated.slice(0, maxToasts)
    })

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [maxToasts, removeToast])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  const success = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ ...options, type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ ...options, type: 'error', title, message, duration: options?.duration ?? 7000 })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ ...options, type: 'warning', title, message })
  }, [addToast])

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ ...options, type: 'info', title, message })
  }, [addToast])

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      clearToasts,
      success,
      error,
      warning,
      info,
    }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastNotificationProps {
  toast: Toast
  onClose: () => void
}

function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" aria-hidden="true" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" aria-hidden="true" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" aria-hidden="true" />
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
      case 'error':
        return 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700'
      case 'warning':
        return 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
      case 'info':
        return 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
    }
  }

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800 dark:text-green-200'
      case 'error':
        return 'text-red-800 dark:text-red-200'
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200'
      case 'info':
        return 'text-blue-800 dark:text-blue-200'
    }
  }

  const getRole = () => {
    return toast.type === 'error' ? 'alert' : 'status'
  }

  const getAriaLive = () => {
    return toast.type === 'error' ? 'assertive' : 'polite'
  }

  return (
    <div
      role={getRole()}
      aria-live={getAriaLive()}
      aria-atomic="true"
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getBackgroundColor()}
        border rounded-lg shadow-lg p-4 max-w-sm
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${getTextColor()}`}>
            {toast.title}
          </h3>
          {toast.message && (
            <p className={`mt-1 text-sm ${getTextColor()}`}>
              {toast.message}
            </p>
          )}
          {toast.action && (
            <div className="mt-2">
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-1 py-0.5"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-md p-1"
            aria-label={`Close ${toast.type} notification: ${toast.title}`}
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Form validation helpers
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationErrors {
  [key: string]: string
}

export function validateField(value: any, rules: ValidationRule): string | null {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return 'This field is required'
  }

  if (value && typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format'
    }
  }

  if (rules.custom) {
    return rules.custom(value)
  }

  return null
}

export function validateForm(data: any, rules: Record<string, ValidationRule>): ValidationErrors {
  const errors: ValidationErrors = {}

  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[field], fieldRules)
    if (error) {
      errors[field] = error
    }
  }

  return errors
}

// Enhanced form field component with validation
interface FormFieldProps {
  label: string
  name: string
  type?: string
  value: any
  onChange: (value: any) => void
  error?: string
  help?: string
  required?: boolean
  placeholder?: string
  className?: string
  children?: React.ReactNode
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  help,
  required,
  placeholder,
  className = '',
  children
}: FormFieldProps) {
  const hasError = !!error

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {children || (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 min-h-[48px]
            ${hasError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
          `}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}

      {help && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {help}
        </p>
      )}
    </div>
  )
}

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Enhanced API error handler with support for new API client
export function handleApiError(error: any, toast: ToastContextType, retryAction?: () => void) {
  console.error('API Error:', error)

  if (isAPIError(error)) {
    const toastOptions = {
      action: retryAction ? {
        label: 'Retry',
        onClick: retryAction,
      } : undefined,
    }

    switch (error.code) {
      case ErrorCodes.UNAUTHORIZED:
        toast.error('Authentication Required', getErrorMessage(error), toastOptions)
        break
      case ErrorCodes.FORBIDDEN:
        toast.error('Access Denied', getErrorMessage(error), toastOptions)
        break
      case ErrorCodes.NOT_FOUND:
        toast.error('Not Found', getErrorMessage(error), toastOptions)
        break
      case ErrorCodes.VALIDATION_ERROR:
        toast.warning('Validation Error', getErrorMessage(error), toastOptions)
        break
      case ErrorCodes.TENANT_ISOLATION_VIOLATION:
        toast.error('Security Error', getErrorMessage(error))
        break
      case ErrorCodes.ICAL_SYNC_FAILED:
        toast.error('Calendar Sync Failed', getErrorMessage(error), toastOptions)
        break
      case ErrorCodes.RATE_LIMITED:
        toast.warning('Rate Limited', getErrorMessage(error))
        break
      case ErrorCodes.NETWORK_ERROR:
        toast.error('Network Error', getErrorMessage(error), toastOptions)
        break
      case ErrorCodes.DATABASE_ERROR:
        toast.error('Database Error', getErrorMessage(error), toastOptions)
        break
      default:
        toast.error('Error', getErrorMessage(error), toastOptions)
    }
  } else {
    // Legacy error handling for backwards compatibility
    let title = 'Error'
    let message = 'An unexpected error occurred'

    if (error.response) {
      title = `Error ${error.response.status}`
      message = error.response.data?.message || error.response.data?.error || message
    } else if (error.message) {
      message = error.message
    }

    toast.error(title, message, {
      action: retryAction ? {
        label: 'Retry',
        onClick: retryAction,
      } : undefined,
    })
  }
}

// Success handler
export function handleSuccess(message: string, toast: ToastContextType, title = 'Success') {
  toast.success(title, message)
}

// Hook for error handling with toast integration
export function useErrorHandler() {
  const toast = useToast()

  const handleError = useCallback((
    error: unknown,
    options: {
      showToast?: boolean
      customMessage?: string
      onError?: (error: unknown) => void
      retryAction?: () => void
    } = {}
  ) => {
    const {
      showToast = true,
      customMessage,
      onError,
      retryAction,
    } = options

    console.error('Error handled:', error)
    onError?.(error)

    if (showToast) {
      if (customMessage) {
        toast.error('Error', customMessage, {
          action: retryAction ? { label: 'Retry', onClick: retryAction } : undefined,
        })
      } else {
        handleApiError(error, toast, retryAction)
      }
    }
  }, [toast])

  const handleSuccess = useCallback((message: string, title = 'Success') => {
    toast.success(title, message)
  }, [toast])

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      showToast?: boolean
      customMessage?: string
      onError?: (error: unknown) => void
      retryAction?: () => void
    } = {}
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args)
      } catch (error) {
        handleError(error, options)
        return undefined
      }
    }
  }, [handleError])

  return {
    handleError,
    handleSuccess,
    withErrorHandling,
  }
}