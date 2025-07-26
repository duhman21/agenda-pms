'use client'

import { useEffect, useRef } from 'react'

interface KeyboardNavigationProps {
  children: React.ReactNode
  className?: string
  role?: string
  ariaLabel?: string
}

export function KeyboardNavigation({ 
  children, 
  className = '', 
  role,
  ariaLabel 
}: KeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      const focusableArray = Array.from(focusableElements) as HTMLElement[]
      const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement)

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          const nextIndex = (currentIndex + 1) % focusableArray.length
          focusableArray[nextIndex]?.focus()
          break
          
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          const prevIndex = currentIndex <= 0 ? focusableArray.length - 1 : currentIndex - 1
          focusableArray[prevIndex]?.focus()
          break
          
        case 'Home':
          e.preventDefault()
          focusableArray[0]?.focus()
          break
          
        case 'End':
          e.preventDefault()
          focusableArray[focusableArray.length - 1]?.focus()
          break
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

// Hook for managing focus trap
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Let parent component handle escape
        const escapeEvent = new CustomEvent('focustrap:escape')
        container.dispatchEvent(escapeEvent)
      }
    }

    document.addEventListener('keydown', handleTabKey)
    document.addEventListener('keydown', handleEscapeKey)
    
    // Focus first element when trap becomes active
    firstElement?.focus()

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isActive])

  return containerRef
}

// Hook for managing roving tabindex
export function useRovingTabIndex(items: HTMLElement[], activeIndex: number) {
  useEffect(() => {
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.setAttribute('tabindex', '0')
      } else {
        item.setAttribute('tabindex', '-1')
      }
    })
  }, [items, activeIndex])
}