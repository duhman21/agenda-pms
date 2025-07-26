'use client'

import { cn } from '@/lib/utils'

interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function ResponsiveCard({ 
  children, 
  className, 
  padding = 'md',
  hover = false 
}: ResponsiveCardProps) {
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  return (
    <div className={cn(
      'bg-white rounded-lg shadow-sm border border-gray-200',
      paddingClasses[padding],
      hover && 'hover:shadow-md transition-shadow duration-200',
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveCardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function ResponsiveCardHeader({ 
  title, 
  subtitle, 
  action, 
  className 
}: ResponsiveCardHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 sm:mb-6',
      className
    )}>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

interface ResponsiveCardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function ResponsiveCardGrid({ 
  children, 
  columns = 3, 
  className 
}: ResponsiveCardGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
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

// Responsive list item for mobile-optimized lists
interface ResponsiveListItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  interactive?: boolean
}

export function ResponsiveListItem({ 
  children, 
  onClick, 
  className,
  interactive = false 
}: ResponsiveListItemProps) {
  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 border-b border-gray-200 last:border-b-0',
        interactive && 'hover:bg-gray-50 active:bg-gray-100 transition-colors',
        onClick && 'cursor-pointer focus:outline-none focus:bg-gray-50',
        'min-h-[60px] flex items-center', // Touch-friendly height
        className
      )}
    >
      {children}
    </Component>
  )
}

// Responsive table wrapper for mobile
interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn(
      'overflow-x-auto -mx-4 sm:mx-0',
      'sm:rounded-lg sm:border sm:border-gray-200',
      className
    )}>
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-gray-200">
          {children}
        </table>
      </div>
    </div>
  )
}