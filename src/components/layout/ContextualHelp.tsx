'use client'

import { useState, useRef, useEffect } from 'react'
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface HelpItem {
  id: string
  title: string
  content: string
  category?: string
}

interface ContextualHelpProps {
  topic: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// Help content database
const helpContent: Record<string, HelpItem[]> = {
  properties: [
    {
      id: 'add-property',
      title: 'Adding Properties',
      content: 'Properties are the foundation of your management system. Add basic details like name and address, then connect calendar sync to import bookings from OTAs.',
      category: 'Getting Started'
    },
    {
      id: 'calendar-sync',
      title: 'Calendar Synchronization',
      content: 'Connect your OTA calendars using iCal URLs. The system syncs every 15 minutes to prevent double bookings and keeps all platforms updated.',
      category: 'Calendar'
    },
    {
      id: 'property-owners',
      title: 'Property Ownership',
      content: 'Link properties to their owners to automatically attribute revenue and expenses. Owners can access reports for their properties only.',
      category: 'Management'
    }
  ],
  tasks: [
    {
      id: 'task-automation',
      title: 'Automatic Task Creation',
      content: 'Tasks are automatically generated when bookings end, creating cleaning and maintenance reminders. You can also create custom tasks manually.',
      category: 'Automation'
    },
    {
      id: 'task-assignment',
      title: 'Assigning Tasks',
      content: 'Assign tasks to specific team members. Staff members will only see tasks assigned to them, while admins can see all tasks.',
      category: 'Management'
    },
    {
      id: 'overdue-tasks',
      title: 'Overdue Notifications',
      content: 'Tasks past their due date are highlighted in red and appear in the dashboard notifications. Complete tasks on time to maintain service quality.',
      category: 'Notifications'
    }
  ],
  revenue: [
    {
      id: 'revenue-tracking',
      title: 'Revenue Attribution',
      content: 'Revenue is automatically attributed to property owners based on their ownership percentage. This ensures accurate profit calculations.',
      category: 'Financial'
    },
    {
      id: 'revenue-sources',
      title: 'Revenue Sources',
      content: 'Track revenue from different OTAs and direct bookings. This helps you understand which channels are most profitable.',
      category: 'Analytics'
    }
  ],
  expenses: [
    {
      id: 'expense-categories',
      title: 'Expense Categories',
      content: 'Categorize expenses for better reporting. Common categories include cleaning supplies, maintenance, utilities, and marketing.',
      category: 'Organization'
    },
    {
      id: 'receipt-uploads',
      title: 'Receipt Management',
      content: 'Upload receipt images to maintain detailed records. This helps with tax preparation and owner reporting.',
      category: 'Documentation'
    }
  ],
  reports: [
    {
      id: 'financial-reports',
      title: 'Financial Reports',
      content: 'Generate comprehensive reports showing revenue, expenses, and net profit. Reports can be filtered by date range and property.',
      category: 'Reporting'
    },
    {
      id: 'report-sharing',
      title: 'Sharing Reports',
      content: 'Share reports securely with property owners using time-limited links. Set up automatic monthly email reports for regular updates.',
      category: 'Communication'
    }
  ],
  dashboard: [
    {
      id: 'dashboard-overview',
      title: 'Dashboard Overview',
      content: 'Your dashboard shows key metrics, overdue tasks, and quick actions. Use it as your daily starting point to stay on top of operations.',
      category: 'Navigation'
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      content: 'Access common tasks directly from the dashboard. These shortcuts help you navigate efficiently without deep menu diving.',
      category: 'Efficiency'
    }
  ]
}

export default function ContextualHelp({ topic, className = '', size = 'md' }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const helpRef = useRef<HTMLDivElement>(null)

  const helpItems = helpContent[topic] || []
  const categories = [...new Set(helpItems.map(item => item.category).filter(Boolean))]
  
  const filteredItems = selectedCategory 
    ? helpItems.filter(item => item.category === selectedCategory)
    : helpItems

  // Close help when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const panelSizeClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[28rem]'
  }

  if (helpItems.length === 0) {
    return null
  }

  return (
    <div className={`relative ${className}`} ref={helpRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Get help"
      >
        <QuestionMarkCircleIcon className={sizeClasses[size]} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-8 ${panelSizeClasses[size]} bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Help & Tips</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedCategory === null
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Help Items */}
          <div className="max-h-64 overflow-y-auto">
            {filteredItems.map(item => (
              <div key={item.id} className="p-4 border-b border-gray-100 last:border-b-0">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">
                  {item.title}
                </h4>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {item.content}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Need more help? Contact support for assistance.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Quick help tooltip component
interface QuickHelpProps {
  content: string
  className?: string
}

export function QuickHelp({ content, className = '' }: QuickHelpProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <QuestionMarkCircleIcon className="w-4 h-4" />
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-50">
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          {content}
        </div>
      )}
    </div>
  )
}

// Help section component for forms
interface HelpSectionProps {
  title: string
  items: Array<{
    question: string
    answer: string
  }>
  className?: string
}

export function HelpSection({ title, items, className = '' }: HelpSectionProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  return (
    <div className={`bg-blue-50 rounded-lg p-4 ${className}`}>
      <h3 className="font-medium text-blue-900 mb-3 flex items-center">
        <QuestionMarkCircleIcon className="w-5 h-5 mr-2" />
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index}>
            <button
              onClick={() => toggleItem(index)}
              className="w-full text-left text-sm text-blue-800 hover:text-blue-900 font-medium"
            >
              {item.question}
            </button>
            {openItems.has(index) && (
              <p className="text-sm text-blue-700 mt-1 pl-4">
                {item.answer}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}