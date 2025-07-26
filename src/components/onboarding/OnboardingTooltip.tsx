'use client'

import { useState, useEffect, useRef } from 'react'
import { TouchFriendlyButton } from '@/components/layout/TouchFriendlyButton'
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

interface OnboardingTooltipProps {
  isVisible: boolean
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  onNext?: () => void
  onSkip?: () => void
  onClose?: () => void
  nextLabel?: string
  showSkip?: boolean
  className?: string
}

export default function OnboardingTooltip({
  isVisible,
  title,
  content,
  position = 'bottom',
  onNext,
  onSkip,
  onClose,
  nextLabel = 'Next',
  showSkip = true,
  className = ''
}: OnboardingTooltipProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
    }
  }, [isVisible])

  if (!isVisible) return null

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900'
  }

  return (
    <div className={`absolute z-50 ${positionClasses[position]} ${className}`}>
      <div
        ref={tooltipRef}
        className={`
          bg-gray-900 text-white rounded-lg shadow-lg p-4 max-w-xs sm:max-w-sm
          transform transition-all duration-300 ease-out
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Arrow */}
        <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-sm pr-2">{title}</h4>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-gray-200 mb-4 leading-relaxed">
          {content}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between space-x-2">
          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Skip tour
            </button>
          )}

          {onNext && (
            <TouchFriendlyButton
              variant="primary"
              size="sm"
              onClick={onNext}
              className="ml-auto flex items-center space-x-1 bg-white text-gray-900 hover:bg-gray-100"
            >
              <span className="text-xs">{nextLabel}</span>
              <ArrowRightIcon className="w-3 h-3" />
            </TouchFriendlyButton>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook for managing tooltip sequences
export function useOnboardingTooltips() {
  const [currentTooltip, setCurrentTooltip] = useState<string | null>(null)
  const [completedTooltips, setCompletedTooltips] = useState<Set<string>>(new Set())

  const showTooltip = (id: string) => {
    setCurrentTooltip(id)
  }

  const hideTooltip = () => {
    setCurrentTooltip(null)
  }

  const completeTooltip = (id: string) => {
    setCompletedTooltips(prev => new Set([...prev, id]))
    hideTooltip()
  }

  const nextTooltip = (currentId: string, nextId?: string) => {
    completeTooltip(currentId)
    if (nextId) {
      setTimeout(() => showTooltip(nextId), 300)
    }
  }

  const skipAllTooltips = () => {
    setCurrentTooltip(null)
    setCompletedTooltips(new Set())
  }

  const isTooltipVisible = (id: string) => currentTooltip === id
  const isTooltipCompleted = (id: string) => completedTooltips.has(id)

  return {
    currentTooltip,
    showTooltip,
    hideTooltip,
    completeTooltip,
    nextTooltip,
    skipAllTooltips,
    isTooltipVisible,
    isTooltipCompleted
  }
}