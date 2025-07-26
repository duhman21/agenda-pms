'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// Hook to detect mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Hook to detect touch device
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  return isTouch
}

// Mobile-optimized swipe actions for list items
interface SwipeableListItemProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: {
    icon: React.ReactNode
    label: string
    color: string
  }
  rightAction?: {
    icon: React.ReactNode
    label: string
    color: string
  }
  className?: string
}

export function SwipeableListItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className
}: SwipeableListItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const currentX = e.touches[0].clientX
    const diff = currentX - startX
    
    // Limit swipe distance
    const maxSwipe = 100
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff))
    setSwipeOffset(limitedDiff)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    
    // Trigger action if swiped far enough
    if (Math.abs(swipeOffset) > 50) {
      if (swipeOffset > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (swipeOffset < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    }
    
    // Reset position
    setSwipeOffset(0)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      {leftAction && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-20 bg-green-500 text-white">
          <div className="text-center">
            {leftAction.icon}
            <div className="text-xs mt-1">{leftAction.label}</div>
          </div>
        </div>
      )}
      
      {rightAction && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-20 bg-red-500 text-white">
          <div className="text-center">
            {rightAction.icon}
            <div className="text-xs mt-1">{rightAction.label}</div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          'transform transition-transform duration-200 bg-white',
          className
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// Pull-to-refresh component
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)
  const [isPulling, setIsPulling] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY)
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 0) {
      e.preventDefault()
      setPullDistance(Math.min(diff * 0.5, 80))
    }
  }

  const handleTouchEnd = async () => {
    setIsPulling(false)

    if (pullDistance > 60) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
  }

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 text-blue-600 transition-all duration-200"
        style={{
          height: `${pullDistance}px`,
          transform: `translateY(-${Math.max(0, 80 - pullDistance)}px)`
        }}
      >
        {isRefreshing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Refreshing...</span>
          </div>
        ) : pullDistance > 60 ? (
          <span className="text-sm">Release to refresh</span>
        ) : pullDistance > 20 ? (
          <span className="text-sm">Pull to refresh</span>
        ) : null}
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  )
}

// Mobile-optimized bottom sheet
interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  height?: 'auto' | 'half' | 'full'
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  height = 'auto' 
}: BottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [startY, setStartY] = useState(0)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 0) {
      setDragY(diff)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    if (dragY > 100) {
      onClose()
    }

    setDragY(0)
  }

  if (!isOpen) return null

  const heightClasses = {
    auto: 'max-h-[80vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]'
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl',
          'transform transition-transform duration-300',
          heightClasses[height]
        )}
        style={{
          transform: `translateY(${dragY}px)`
        }}
      >
        {/* Handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-4 pb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

// Fallback component for rendering issues
interface FallbackLayoutProps {
  error?: Error
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FallbackLayout({ error, children, fallback }: FallbackLayoutProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (error) {
      setHasError(true)
    }
  }, [error])

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-4">
            We&apos;re having trouble displaying this page. Please try refreshing.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
          {fallback && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {fallback}
            </div>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}