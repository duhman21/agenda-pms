'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface AccessibilityContextType {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  focusElement: (elementId: string) => void
  skipToContent: () => void
  isHighContrast: boolean
  toggleHighContrast: () => void
  isReducedMotion: boolean
  fontSize: 'normal' | 'large' | 'extra-large'
  setFontSize: (size: 'normal' | 'large' | 'extra-large') => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'extra-large'>('normal')

  // Detect user preferences
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    // Load saved preferences
    const savedHighContrast = localStorage.getItem('accessibility-high-contrast') === 'true'
    const savedFontSize = localStorage.getItem('accessibility-font-size') as 'normal' | 'large' | 'extra-large' || 'normal'
    
    setIsHighContrast(savedHighContrast)
    setFontSize(savedFontSize)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement
    
    // High contrast mode
    if (isHighContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
    
    // Font size
    root.classList.remove('font-large', 'font-extra-large')
    if (fontSize === 'large') {
      root.classList.add('font-large')
    } else if (fontSize === 'extra-large') {
      root.classList.add('font-extra-large')
    }
    
    // Reduced motion
    if (isReducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }
  }, [isHighContrast, fontSize, isReducedMotion])

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  const focusElement = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.focus()
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const skipToContent = () => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.focus()
      mainContent.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const toggleHighContrast = () => {
    const newValue = !isHighContrast
    setIsHighContrast(newValue)
    localStorage.setItem('accessibility-high-contrast', newValue.toString())
    announceToScreenReader(`High contrast mode ${newValue ? 'enabled' : 'disabled'}`)
  }

  const handleSetFontSize = (size: 'normal' | 'large' | 'extra-large') => {
    setFontSize(size)
    localStorage.setItem('accessibility-font-size', size)
    announceToScreenReader(`Font size changed to ${size}`)
  }

  return (
    <AccessibilityContext.Provider
      value={{
        announceToScreenReader,
        focusElement,
        skipToContent,
        isHighContrast,
        toggleHighContrast,
        isReducedMotion,
        fontSize,
        setFontSize: handleSetFontSize
      }}
    >
      {children}
      {/* Screen reader announcements container */}
      <div id="sr-announcements" aria-live="polite" aria-atomic="true" className="sr-only" />
    </AccessibilityContext.Provider>
  )
}