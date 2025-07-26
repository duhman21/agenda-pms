'use client'

import { useEffect } from 'react'
import { useTenant } from '@/components/auth/TenantProvider'

// Smart defaults hook for forms
export function useSmartDefaults() {
  const { profile, tenant } = useTenant()

  const getPropertyDefaults = () => ({
    // Default property settings based on tenant
    ical_import_url: '',
    description: '',
    // Smart defaults could include common property types, etc.
  })

  const getTaskDefaults = () => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(14, 0, 0, 0) // Default to 2 PM tomorrow

    return {
      status: 'pending' as const,
      due_date: tomorrow.toISOString().slice(0, 16), // Format for datetime-local input
      assigned_to: profile?.role === 'staff' ? profile.id : '', // Auto-assign to self if staff
      auto_generated: false
    }
  }

  const getExpenseDefaults = () => {
    const today = new Date().toISOString().split('T')[0]
    
    return {
      expense_date: today,
      category: 'maintenance', // Most common category
      amount: '',
      description: ''
    }
  }

  const getRevenueDefaults = () => {
    const today = new Date().toISOString().split('T')[0]
    
    return {
      check_in: today,
      check_out: today,
      revenue: '',
      source: 'direct', // Default to direct booking
      guest_name: ''
    }
  }

  const getUserDefaults = () => ({
    role: 'staff' as const, // Default new users to staff
    first_name: '',
    last_name: '',
    email: ''
  })

  return {
    getPropertyDefaults,
    getTaskDefaults,
    getExpenseDefaults,
    getRevenueDefaults,
    getUserDefaults
  }
}

// Smart input component that provides suggestions
interface SmartInputProps {
  type: 'category' | 'source' | 'description'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const suggestions = {
  category: [
    'maintenance',
    'cleaning',
    'utilities',
    'supplies',
    'marketing',
    'insurance',
    'repairs',
    'landscaping',
    'professional services',
    'other'
  ],
  source: [
    'airbnb',
    'booking.com',
    'vrbo',
    'expedia',
    'direct',
    'other'
  ],
  description: {
    maintenance: [
      'HVAC maintenance',
      'Plumbing repair',
      'Electrical work',
      'Appliance repair',
      'General maintenance'
    ],
    cleaning: [
      'Deep cleaning',
      'Regular cleaning',
      'Carpet cleaning',
      'Window cleaning',
      'Post-checkout cleaning'
    ],
    supplies: [
      'Cleaning supplies',
      'Toiletries',
      'Linens and towels',
      'Kitchen supplies',
      'Bathroom supplies'
    ]
  }
}

export function SmartInput({ type, value, onChange, placeholder, className = '' }: SmartInputProps) {
  const getSuggestions = () => {
    if (type === 'description') {
      // Return suggestions based on common patterns
      return [
        'Regular maintenance check',
        'Post-checkout cleaning',
        'Guest supplies restock',
        'Repair and maintenance',
        'Utility payment'
      ]
    }
    return suggestions[type] || []
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
  }

  const filteredSuggestions = getSuggestions().filter(suggestion =>
    suggestion.toLowerCase().includes(value.toLowerCase()) && suggestion !== value
  )

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] ${className}`}
        list={`${type}-suggestions`}
      />
      
      {/* Suggestions dropdown */}
      {filteredSuggestions.length > 0 && value.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Auto-save hook for forms
export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  delay: number = 2000
) {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (data && Object.keys(data as any).length > 0) {
        saveFunction(data).catch(console.error)
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [data, saveFunction, delay])
}

// Smart date picker that suggests common dates
interface SmartDatePickerProps {
  value: string
  onChange: (value: string) => void
  type?: 'date' | 'datetime-local'
  label?: string
  className?: string
}

export function SmartDatePicker({ 
  value, 
  onChange, 
  type = 'date', 
  label,
  className = '' 
}: SmartDatePickerProps) {
  const getQuickOptions = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const formatDate = (date: Date) => {
      if (type === 'datetime-local') {
        return date.toISOString().slice(0, 16)
      }
      return date.toISOString().split('T')[0]
    }

    return [
      { label: 'Today', value: formatDate(today) },
      { label: 'Tomorrow', value: formatDate(tomorrow) },
      { label: 'Next Week', value: formatDate(nextWeek) }
    ]
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="space-y-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
        />
        
        {/* Quick options */}
        <div className="flex flex-wrap gap-2">
          {getQuickOptions().map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(option.value)}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Smart form wrapper that provides common functionality
interface SmartFormProps {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  className?: string
  autoSave?: boolean
}

export function SmartForm({ children, onSubmit, className = '', autoSave = false }: SmartFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {children}
      {autoSave && (
        <div className="text-xs text-gray-500 text-center">
          Changes are automatically saved
        </div>
      )}
    </form>
  )
}