'use client'

import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Touch-friendly input component
interface TouchFriendlyInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const TouchFriendlyInput = forwardRef<HTMLInputElement, TouchFriendlyInputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'min-h-[48px]', // Touch-friendly height
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 mt-1">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

TouchFriendlyInput.displayName = 'TouchFriendlyInput'

// Touch-friendly select component
interface TouchFriendlySelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: { value: string; label: string }[]
}

export const TouchFriendlySelect = forwardRef<HTMLSelectElement, TouchFriendlySelectProps>(
  ({ className, label, error, helperText, options, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'min-h-[48px]', // Touch-friendly height
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 mt-1">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

TouchFriendlySelect.displayName = 'TouchFriendlySelect'

// Touch-friendly textarea component
interface TouchFriendlyTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const TouchFriendlyTextarea = forwardRef<HTMLTextAreaElement, TouchFriendlyTextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'block w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'min-h-[96px]', // Minimum height for textarea
            'resize-y', // Allow vertical resize only
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 mt-1">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

TouchFriendlyTextarea.displayName = 'TouchFriendlyTextarea'

// Responsive form container
interface ResponsiveFormProps {
  children: React.ReactNode
  className?: string
  onSubmit?: (e: React.FormEvent) => void
}

export function ResponsiveForm({ children, className, onSubmit }: ResponsiveFormProps) {
  return (
    <form 
      onSubmit={onSubmit}
      className={cn(
        'space-y-4 sm:space-y-6',
        'p-4 sm:p-6',
        className
      )}
    >
      {children}
    </form>
  )
}

// Form grid for responsive layouts
interface FormGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}

export function FormGrid({ children, columns = 1, className }: FormGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }

  return (
    <div className={cn(
      'grid gap-4 sm:gap-6',
      gridClasses[columns],
      className
    )}>
      {children}
    </div>
  )
}