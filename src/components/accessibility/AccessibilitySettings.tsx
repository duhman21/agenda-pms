'use client'

import { useState } from 'react'
import { Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAccessibility } from './AccessibilityProvider'
import { AccessibleFormField, AccessibleSelect, AccessibleCheckbox } from './AccessibleForm'
import { useFocusTrap } from './KeyboardNavigation'

interface AccessibilitySettingsProps {
  className?: string
}

export function AccessibilitySettings({ className = '' }: AccessibilitySettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    isHighContrast,
    toggleHighContrast,
    fontSize,
    setFontSize,
    isReducedMotion,
    announceToScreenReader
  } = useAccessibility()

  const focusTrapRef = useFocusTrap(isOpen)

  const handleOpen = () => {
    setIsOpen(true)
    announceToScreenReader('Accessibility settings opened')
  }

  const handleClose = () => {
    setIsOpen(false)
    announceToScreenReader('Accessibility settings closed')
  }

  const fontSizeOptions = [
    { value: 'normal', label: 'Normal (16px)' },
    { value: 'large', label: 'Large (18px)' },
    { value: 'extra-large', label: 'Extra Large (20px)' }
  ]

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className={`
          fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg
          hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors ${className}
        `}
        aria-label="Open accessibility settings"
        title="Accessibility Settings"
      >
        <Cog6ToothIcon className="w-6 h-6" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={focusTrapRef}
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accessibility-settings-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClose()
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 
              id="accessibility-settings-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              Accessibility Settings
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
              aria-label="Close accessibility settings"
            >
              <XMarkIcon className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          {/* Settings */}
          <div className="space-y-6">
            {/* Font Size */}
            <AccessibleSelect
              label="Font Size"
              name="fontSize"
              value={fontSize}
              onChange={setFontSize}
              options={fontSizeOptions}
              help="Adjust the base font size for better readability"
            />

            {/* High Contrast */}
            <AccessibleCheckbox
              label="High Contrast Mode"
              name="highContrast"
              checked={isHighContrast}
              onChange={toggleHighContrast}
              help="Increase color contrast for better visibility"
            />

            {/* Reduced Motion Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Reduced Motion
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                {isReducedMotion 
                  ? 'Animations are reduced based on your system preferences.'
                  : 'Animations are enabled. You can disable them in your system accessibility settings.'
                }
              </p>
            </div>

            {/* Keyboard Navigation Help */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Keyboard Navigation
              </h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Tab</kbd> - Navigate forward</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Shift+Tab</kbd> - Navigate backward</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Enter/Space</kbd> - Activate buttons</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Esc</kbd> - Close dialogs</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Arrow keys</kbd> - Navigate lists</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Close Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Floating accessibility button component
export function AccessibilityButton() {
  return <AccessibilitySettings />
}