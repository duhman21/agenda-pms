'use client'

import React from 'react'
import { FallbackLayout } from './MobileOptimizations'

interface MobileErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface MobileErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class MobileErrorBoundary extends React.Component<
  MobileErrorBoundaryProps,
  MobileErrorBoundaryState
> {
  constructor(props: MobileErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): MobileErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Mobile Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <FallbackLayout error={this.state.error} fallback={this.props.fallback}>
          {this.props.children}
        </FallbackLayout>
      )
    }

    return this.props.children
  }
}

// Hook-based error boundary for functional components
export function useMobileErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = () => setError(null)

  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  return { error, resetError, handleError }
}