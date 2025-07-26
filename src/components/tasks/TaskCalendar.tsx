'use client'

import { useState, useEffect } from 'react'
import { Task, Property, UserProfile } from '@/types'
import { useTenant } from '@/components/auth/TenantProvider'

interface TaskWithRelations extends Task {
  properties: Property
  user_profiles?: UserProfile
}

interface TaskCalendarProps {
  refreshTrigger?: number
}

export default function TaskCalendar({ refreshTrigger }: TaskCalendarProps) {
  const { user } = useTenant()
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get tasks for the current view period
      const startDate = getViewStartDate()
      const endDate = getViewEndDate()

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        limit: '100' // Get more tasks for calendar view
      })

      const response = await fetch(`/api/tasks/calendar?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data = await response.json()
      setTasks(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [currentDate, viewMode, refreshTrigger])

  const getViewStartDate = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate)
      start.setDate(currentDate.getDate() - currentDate.getDay()) // Start of week (Sunday)
      return start
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      return start
    }
  }

  const getViewEndDate = () => {
    if (viewMode === 'week') {
      const end = new Date(currentDate)
      end.setDate(currentDate.getDate() - currentDate.getDay() + 6) // End of week (Saturday)
      return end
    } else {
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      return end
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date)
      return taskDate.toDateString() === date.toDateString()
    })
  }

  const isOverdue = (task: TaskWithRelations) => {
    if (!task.due_date || task.status === 'completed') return false
    return new Date(task.due_date) < new Date()
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const renderWeekView = () => {
    const startDate = getViewStartDate()
    const days = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }

    return (
      <div className="grid grid-cols-7 gap-1 h-96">
        {/* Day headers */}
        {days.map((date, index) => (
          <div key={index} className="p-2 text-center font-medium bg-gray-50 border-b">
            <div className="text-sm text-gray-600">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-lg">
              {date.getDate()}
            </div>
          </div>
        ))}
        
        {/* Day content */}
        {days.map((date, index) => {
          const dayTasks = getTasksForDate(date)
          return (
            <div key={index} className="p-1 border-r border-gray-200 overflow-y-auto">
              <div className="space-y-1">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-1 rounded text-xs border ${getStatusColor(task.status)} ${
                      isOverdue(task) ? 'ring-2 ring-red-400' : ''
                    }`}
                  >
                    <div className="font-medium truncate" title={task.title}>
                      {task.title}
                    </div>
                    {task.due_date && (
                      <div className="text-xs opacity-75">
                        {formatTime(task.due_date)}
                      </div>
                    )}
                    {task.user_profiles && (
                      <div className="text-xs opacity-75 truncate">
                        {task.user_profiles.first_name && task.user_profiles.last_name 
                          ? `${task.user_profiles.first_name} ${task.user_profiles.last_name}` 
                          : task.user_profiles.email}
                      </div>
                    )}
                    {isOverdue(task) && (
                      <div className="text-xs text-red-600 font-medium">
                        OVERDUE
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderMonthView = () => {
    const startDate = getViewStartDate()
    const endDate = getViewEndDate()
    const firstDayOfWeek = startDate.getDay()
    const daysInMonth = endDate.getDate()
    
    // Create calendar grid
    const calendarDays = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      calendarDays.push(date)
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center font-medium bg-gray-50 border-b">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={index} className="h-24 border border-gray-200"></div>
          }
          
          const dayTasks = getTasksForDate(date)
          const overdueTasks = dayTasks.filter(isOverdue)
          
          return (
            <div key={index} className="h-24 border border-gray-200 p-1 overflow-y-auto">
              <div className="text-sm font-medium mb-1">{date.getDate()}</div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className={`text-xs p-1 rounded truncate ${getStatusColor(task.status)} ${
                      isOverdue(task) ? 'ring-1 ring-red-400' : ''
                    }`}
                    title={`${task.title} - ${task.properties.name}${task.user_profiles ? ` (${task.user_profiles.first_name} ${task.user_profiles.last_name})` : ''}`}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayTasks.length - 3} more
                  </div>
                )}
                {overdueTasks.length > 0 && (
                  <div className="text-xs text-red-600 font-medium">
                    {overdueTasks.length} overdue
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <p>Error loading calendar: {error}</p>
          <button
            onClick={fetchTasks}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Task Calendar</h2>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-md">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded-l-md ${
                  viewMode === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded-r-md ${
                  viewMode === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                ←
              </button>
              <span className="font-medium min-w-32 text-center">
                {viewMode === 'week' 
                  ? `${getViewStartDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${getViewEndDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                }
              </span>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                →
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-6">
        {viewMode === 'week' ? renderWeekView() : renderMonthView()}
      </div>

      {/* Legend */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
            <span>Overdue</span>
          </div>
        </div>
      </div>
    </div>
  )
}