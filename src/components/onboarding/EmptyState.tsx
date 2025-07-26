'use client'

import { ReactNode } from 'react'
import { TouchFriendlyButton } from '@/components/layout/TouchFriendlyButton'
import { PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  children?: ReactNode
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {/* Icon */}
      {icon && (
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 mb-6">
          {description}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          {primaryAction && (
            <TouchFriendlyButton
              variant="primary"
              onClick={primaryAction.onClick}
              className="w-full sm:w-auto flex items-center justify-center space-x-2"
            >
              {primaryAction.icon || <PlusIcon className="w-5 h-5" />}
              <span>{primaryAction.label}</span>
            </TouchFriendlyButton>
          )}

          {secondaryAction && (
            <TouchFriendlyButton
              variant="ghost"
              onClick={secondaryAction.onClick}
              className="w-full sm:w-auto flex items-center justify-center space-x-2"
            >
              {secondaryAction.icon || <ArrowRightIcon className="w-5 h-5" />}
              <span>{secondaryAction.label}</span>
            </TouchFriendlyButton>
          )}
        </div>

        {/* Custom content */}
        {children && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

// Predefined empty states for common scenarios
export function PropertiesEmptyState({ onAddProperty }: { onAddProperty: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      }
      title="No properties yet"
      description="Start by adding your first property to begin managing bookings, tasks, and revenue."
      primaryAction={{
        label: "Add Property",
        onClick: onAddProperty
      }}
    >
      <div className="text-sm text-gray-500 space-y-2">
        <p>💡 <strong>Tip:</strong> You can sync with OTA calendars after adding a property</p>
        <p>📊 Revenue and expense tracking will be available once you have properties</p>
      </div>
    </EmptyState>
  )
}

export function TasksEmptyState({ onCreateTask, userRole }: { onCreateTask: () => void, userRole: string }) {
  const isStaff = userRole === 'staff'
  
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      }
      title={isStaff ? "No tasks assigned to you" : "No tasks created yet"}
      description={
        isStaff 
          ? "Tasks will appear here when they're assigned to you by your admin."
          : "Create tasks to manage cleaning, maintenance, and other property operations."
      }
      primaryAction={!isStaff ? {
        label: "Create Task",
        onClick: onCreateTask
      } : undefined}
    >
      <div className="text-sm text-gray-500 space-y-2">
        {isStaff ? (
          <>
            <p>📋 Tasks are automatically created from booking events</p>
            <p>🔔 You'll get notifications when new tasks are assigned</p>
          </>
        ) : (
          <>
            <p>🤖 <strong>Auto-generated:</strong> Tasks are created automatically from bookings</p>
            <p>👥 Assign tasks to team members for better organization</p>
          </>
        )}
      </div>
    </EmptyState>
  )
}

export function RevenueEmptyState({ onAddRevenue }: { onAddRevenue: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      }
      title="No revenue recorded yet"
      description="Start tracking your property income by recording bookings and their revenue."
      primaryAction={{
        label: "Record Revenue",
        onClick: onAddRevenue
      }}
    >
      <div className="text-sm text-gray-500 space-y-2">
        <p>💰 Revenue is automatically attributed to property owners</p>
        <p>📈 Analytics and trends will appear as you add more data</p>
      </div>
    </EmptyState>
  )
}

export function ExpensesEmptyState({ onAddExpense }: { onAddExpense: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      }
      title="No expenses logged yet"
      description="Track property expenses like maintenance, cleaning supplies, and repairs to calculate accurate profits."
      primaryAction={{
        label: "Log Expense",
        onClick: onAddExpense
      }}
    >
      <div className="text-sm text-gray-500 space-y-2">
        <p>🧾 Upload receipts to keep detailed records</p>
        <p>📊 Expenses are categorized and attributed to property owners</p>
      </div>
    </EmptyState>
  )
}

export function CalendarEmptyState({ onSetupSync }: { onSetupSync: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      }
      title="No bookings to display"
      description="Connect your OTA calendars to see all bookings in one unified view and prevent double bookings."
      primaryAction={{
        label: "Setup Calendar Sync",
        onClick: onSetupSync
      }}
    >
      <div className="text-sm text-gray-500 space-y-2">
        <p>🔄 Syncs automatically every 15 minutes</p>
        <p>🚫 Prevents double bookings across platforms</p>
        <p>📤 Export calendars back to OTAs</p>
      </div>
    </EmptyState>
  )
}