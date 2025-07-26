'use client'

import React, { useId, useState } from 'react'
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useAccessibility } from './AccessibilityProvider'

interface AccessibleFormFieldProps {
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
  disabled?: boolean
  autoComplete?: string
  'aria-describedby'?: string
}

export function AccessibleFormField({
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
  children,
  disabled,
  autoComplete,
  'aria-describedby': ariaDescribedBy,
  ...props
}: AccessibleFormFieldProps) {
  const fieldId = useId()
  const errorId = useId()
  const helpId = useId()
  const { announceToScreenReader } = useAccessibility()

  const hasError = !!error
  const hasHelp = !!help

  // Build aria-describedby
  const describedByIds = [
    hasError ? errorId : null,
    hasHelp ? helpId : null,
    ariaDescribedBy
  ].filter(Boolean).join(' ')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(e.target.value)
    
    // Clear error announcement when user starts typing
    if (hasError) {
      announceToScreenReader('Error cleared', 'polite')
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={fieldId} 
        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
      >
        {label}
        {required && (
          <span 
            className="text-red-600 ml-1" 
            aria-label="required"
            role="img"
          >
            *
          </span>
        )}
      </label>

      {children || (
        <input
          id={fieldId}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={describedByIds || undefined}
          className={`
            w-full px-4 py-3 text-base border rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-offset-2
            min-h-[48px] transition-colors
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
            }
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
            dark:focus:ring-blue-400 dark:focus:border-blue-400
          `}
          {...props}
        />
      )}

      {hasError && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-start space-x-2 text-sm text-red-700 dark:text-red-400"
        >
          <ExclamationTriangleIcon 
            className="w-4 h-4 mt-0.5 flex-shrink-0" 
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}

      {hasHelp && !hasError && (
        <div 
          id={helpId}
          className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <InformationCircleIcon 
            className="w-4 h-4 mt-0.5 flex-shrink-0" 
            aria-hidden="true"
          />
          <span>{help}</span>
        </div>
      )}
    </div>
  )
}

interface AccessibleSelectProps extends Omit<AccessibleFormFieldProps, 'type' | 'children'> {
  options: Array<{ value: string; label: string; disabled?: boolean }>
  emptyOption?: string
}

export function AccessibleSelect({
  options,
  emptyOption,
  ...props
}: AccessibleSelectProps) {
  const fieldId = useId()
  const errorId = useId()
  const helpId = useId()

  const hasError = !!props.error
  const hasHelp = !!props.help

  const describedByIds = [
    hasError ? errorId : null,
    hasHelp ? helpId : null,
    props['aria-describedby']
  ].filter(Boolean).join(' ')

  return (
    <div className={`space-y-2 ${props.className || ''}`}>
      <label 
        htmlFor={fieldId} 
        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
      >
        {props.label}
        {props.required && (
          <span 
            className="text-red-600 ml-1" 
            aria-label="required"
            role="img"
          >
            *
          </span>
        )}
      </label>

      <select
        id={fieldId}
        name={props.name}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        required={props.required}
        aria-invalid={hasError}
        aria-describedby={describedByIds || undefined}
        className={`
          w-full px-4 py-3 text-base border rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-offset-2
          min-h-[48px] transition-colors cursor-pointer
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          ${hasError 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50' 
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
          }
          dark:bg-gray-800 dark:border-gray-600 dark:text-white
          dark:focus:ring-blue-400 dark:focus:border-blue-400
        `}
      >
        {emptyOption && (
          <option value="">{emptyOption}</option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {hasError && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-start space-x-2 text-sm text-red-700 dark:text-red-400"
        >
          <ExclamationTriangleIcon 
            className="w-4 h-4 mt-0.5 flex-shrink-0" 
            aria-hidden="true"
          />
          <span>{props.error}</span>
        </div>
      )}

      {hasHelp && !hasError && (
        <div 
          id={helpId}
          className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <InformationCircleIcon 
            className="w-4 h-4 mt-0.5 flex-shrink-0" 
            aria-hidden="true"
          />
          <span>{props.help}</span>
        </div>
      )}
    </div>
  )
}

interface AccessibleTextareaProps extends Omit<AccessibleFormFieldProps, 'type' | 'children'> {
  rows?: number
  maxLength?: number
}

export function AccessibleTextarea({
  rows = 3,
  maxLength,
  ...props
}: AccessibleTextareaProps) {
  const fieldId = useId()
  const errorId = useId()
  const helpId = useId()
  const [charCount, setCharCount] = useState(props.value?.length || 0)

  const hasError = !!props.error
  const hasHelp = !!props.help

  const describedByIds = [
    hasError ? errorId : null,
    hasHelp ? helpId : null,
    maxLength ? `${fieldId}-count` : null,
    props['aria-describedby']
  ].filter(Boolean).join(' ')

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setCharCount(newValue.length)
    props.onChange(newValue)
  }

  return (
    <div className={`space-y-2 ${props.className || ''}`}>
      <label 
        htmlFor={fieldId} 
        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
      >
        {props.label}
        {props.required && (
          <span 
            className="text-red-600 ml-1" 
            aria-label="required"
            role="img"
          >
            *
          </span>
        )}
      </label>

      <div className="relative">
        <textarea
          id={fieldId}
          name={props.name}
          value={props.value}
          onChange={handleChange}
          placeholder={props.placeholder}
          disabled={props.disabled}
          required={props.required}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={hasError}
          aria-describedby={describedByIds || undefined}
          className={`
            w-full px-4 py-3 text-base border rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-offset-2
            transition-colors resize-vertical
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
            }
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
            dark:focus:ring-blue-400 dark:focus:border-blue-400
          `}
        />
        {maxLength && (
          <div 
            id={`${fieldId}-count`}
            className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400"
            aria-live="polite"
          >
            {charCount}/{maxLength}
          </div>
        )}
      </div>

      {hasError && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-start space-x-2 text-sm text-red-700 dark:text-red-400"
        >
          <ExclamationTriangleIcon 
            className="w-4 h-4 mt-0.5 flex-shrink-0" 
            aria-hidden="true"
          />
          <span>{props.error}</span>
        </div>
      )}

      {hasHelp && !hasError && (
        <div 
          id={helpId}
          className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <InformationCircleIcon 
            className="w-4 h-4 mt-0.5 flex-shrink-0" 
            aria-hidden="true"
          />
          <span>{props.help}</span>
        </div>
      )}
    </div>
  )
}

interface AccessibleCheckboxProps {
  label: string
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
  help?: string
  disabled?: boolean
  className?: string
}

export function AccessibleCheckbox({
  label,
  name,
  checked,
  onChange,
  error,
  help,
  disabled,
  className = ''
}: AccessibleCheckboxProps) {
  const fieldId = useId()
  const errorId = useId()
  const helpId = useId()

  const hasError = !!error
  const hasHelp = !!help

  const describedByIds = [
    hasError ? errorId : null,
    hasHelp ? helpId : null
  ].filter(Boolean).join(' ')

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-start space-x-3">
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={describedByIds || undefined}
          className={`
            w-5 h-5 mt-0.5 rounded border-2 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            transition-colors cursor-pointer
            disabled:cursor-not-allowed disabled:opacity-50
            ${hasError 
              ? 'border-red-500 text-red-600' 
              : 'border-gray-300 text-blue-600'
            }
          `}
        />
        <label 
          htmlFor={fieldId}
          className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
        >
          {label}
        </label>
      </div>

      {hasError && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-start space-x-2 text-sm text-red-700 dark:text-red-400 ml-8"
        >
          <ExclamationTriangleIcon 
            className="w-4 h-4 mt-0.5 flex-shrink-0" 
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}

      {hasHelp && !hasError && (
        <div 
          id={helpId}
          className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400 ml-8"
        >
          <InformationCircleIcon 
            className="w-4 h-4 mt-0.5 flex-shrink-0" 
            aria-hidden="true"
          />
          <span>{help}</span>
        </div>
      )}
    </div>
  )
}