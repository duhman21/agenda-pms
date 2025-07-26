'use client'

import { useState, useEffect } from 'react'
import { Task, Property, UserProfile } from '@/types'
import { useTenant } from '@/components/auth/TenantProvider'

interface OverdueTask extends Task {
  properties: Property
  user_profiles?: UserProfile
  hours_overdue: number
  days_overdue: number
  overdue_severity: 'low' | 'medium' | 'high' | 'critical'
}

interface OverdueTaskNotificationsProps {
  refreshTrigger?: number
  showAll?: boolean
  maxItems?: number
}

export default function OverdueTaskNotifications({ 
  refreshTrigger, 
  showAll = false, 
  maxItems = 5 
}: OverdueTaskNotificationsProps) {
  const { user } = useTenant()
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  })
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchOverdueTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/tasks/overdue')
      
      if (!response.ok) {
        throw new Error('Failed to fetch overdue tasks')
      }

      const data = await response.json()
      setOverdueTasks(data.data || [])
      setSummary(data.summary || { critical: 0, high: 0, medium: 0, low: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverdueTasks()
  }, [refreshTrigger])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'high':
        return '⚠️'
      case 'medium':
        return '⏰'
      case 'low':
        return '📋'
      default:
        return '📋'
    }
  }

  const formatOverdueTime = (task: OverdueTask) => {
    if (task.days_overdue >= 1) {
      return `${task.days_overdue} day${task.days_overdue > 1 ? 's' : ''} overdue`
    } else {
      return `${task.hours_overdue} hour${task.hours_overdue > 1 ? 's' : ''} overdue`
    }
  }

  const formatDueDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="text-red-600 text-sm">
          Error loading overdue tasks: {error}
        </div>
      </div>
    )
  }

  if (overdueTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center space-x-2 text-green-600">
          <span>✅</span>
          <span className="font-medium">No overdue tasks</span>
        </div>
      </div>
    )
  }

  const displayTasks = showAll || isExpanded ? overdueTasks : overdueTasks.slice(0, maxItems)
  const totalOverdue = overdueTasks.length

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <h3 className="font-semibold text-gray-900">
              Overdue Tasks ({totalOverdue})
            </h3>
          </div>
          {!showAll && totalOverdue > maxItems && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Show Less' : `Show All (${totalOverdue})`}
            </button>
          )}
        </div>
        
        {/* Summary */}
        <div className="flex space-x-4 mt-2 text-sm">
          {summary.critical > 0 && (
            <span className="text-red-600">🚨 {summary.critical} Critical</span>
          )}
          {summary.high > 0 && (
            <span className="text-orange-600">⚠️ {summary.high} High</span>
          )}
          {summary.medium > 0 && (
            <span className="text-yellow-600">⏰ {summary.medium} Medium</span>
          )}
          {summary.low > 0 && (
            <span className="text-blue-600">📋 {summary.low} Low</span>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="p-4">
        <div className="space-y-3">
          {displayTasks.map((task) => (
            <div
              key={task.id}
              className={`p-3 rounded-lg border ${getSeverityColor(task.overdue_severity)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span>{getSeverityIcon(task.overdue_severity)}</span>
                    <h4 className="font-medium">{task.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(task.overdue_severity)}`}>
                      {task.overdue_severity.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div>Property: {task.properties.name}</div>
                    {task.user_profiles && (
                      <div>
                        Assigned to: {task.user_profiles.first_name && task.user_profiles.last_name 
                          ? `${task.user_profiles.first_name} ${task.user_profiles.last_name}` 
                          : task.user_profiles.email}
                      </div>
                    )}
                    <div>Due: {formatDueDate(task.due_date!)}</div>
                    <div className="font-medium text-red-600">
                      {formatOverdueTime(task)}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => {
                      // Navigate to task or open edit modal
                      window.location.href = `/tasks?edit=${task.id}`
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}