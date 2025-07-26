'use client'

import React, { lazy, Suspense, ComponentType } from 'react'

// Loading fallback component
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
)

// Generic loading fallback for different component types
export const ComponentLoader = ({ height = 'h-32' }: { height?: string }) => (
  <div className={`flex items-center justify-center ${height} bg-gray-50 rounded-lg animate-pulse`}>
    <LoadingSpinner />
  </div>
)

// Higher-order component for lazy loading with suspense
export function withLazyLoading<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingSpinner />
) {
  const LazyComponent = lazy(importFn)
  
  return function LazyLoadedComponent(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

// Preload function for critical components
export function preloadComponent(importFn: () => Promise<{ default: ComponentType<any> }>) {
  // Preload the component
  importFn()
}

// Intersection Observer hook for lazy loading on scroll
export function useLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}