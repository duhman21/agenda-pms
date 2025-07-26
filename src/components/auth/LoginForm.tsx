'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AccessibleFormField } from '@/components/accessibility/AccessibleForm'
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider'

interface LoginFormProps {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { announceToScreenReader } = useAccessibility()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    announceToScreenReader('Signing in...', 'polite')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      announceToScreenReader('Login successful, redirecting to dashboard', 'polite')

      // Redirect to dashboard on successful login
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
      announceToScreenReader(`Login failed: ${errorMessage}`, 'assertive')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <fieldset disabled={isLoading} className="space-y-6">
        <legend className="sr-only">Login credentials</legend>
        
        <AccessibleFormField
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          placeholder="Enter your email"
          help="Enter the email address associated with your account"
        />

        <AccessibleFormField
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          help="Enter your account password"
        />

        {error && (
          <div 
            role="alert"
            aria-live="assertive"
            className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800"
          >
            <div className="text-sm text-red-700 dark:text-red-400 font-medium">
              Login Error: {error}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="
            group relative w-full flex justify-center py-3 px-4 
            border border-transparent text-base font-medium rounded-lg 
            text-white bg-blue-600 hover:bg-blue-700 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
            disabled:opacity-50 disabled:cursor-not-allowed
            min-h-[48px] transition-colors
            dark:bg-blue-700 dark:hover:bg-blue-800
          "
          aria-describedby={isLoading ? 'login-status' : undefined}
        >
          {isLoading ? (
            <>
              <span className="sr-only">Signing in, please wait</span>
              <span aria-hidden="true">Signing in...</span>
            </>
          ) : (
            'Sign in'
          )}
        </button>

        {isLoading && (
          <div id="login-status" className="sr-only" aria-live="polite">
            Please wait while we sign you in
          </div>
        )}
      </fieldset>
    </form>
  )
}