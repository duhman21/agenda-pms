'use client'

import { useState, useEffect } from 'react'
import { Task, Property, UserProfile, PaginatedResponse } from '@/types'
import { useTenant } from '@/components/auth/TenantProvider'
import { TasksEmptyState } from '@/components/onboarding/EmptyState'

interface TaskWithRelations extends Task {
  properties: Property
  user_profiles?: UserProfile
}

interface TaskListProps {
  onEditTask: (task: TaskWithRelations) => void
  onDeleteTask: (taskId: string) => void
  onCreateTask: () => void
  refreshTrigger?: number
}

export default function TaskList({ onEditTask, onDeleteTask, onCreateTask, refreshTrigger }: TaskListProps) {
  const { user, profile } = useTenant()
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    assigned_to: '',
    property_id: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.status) params.append('status', filters.status)
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters.property_id) params.append('property_id', filters.property_id)

      const response = await fetch(`/api/tasks?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data: PaginatedResponse<TaskWithRelations> = await response.json()
      setTasks(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterData = async () => {
    try {
      // Fetch properties for filter
      const propertiesResponse = await fetch('/api/properties')
      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json()
        setProperties(propertiesData.data || propertiesData)
      }

      // Fetch users for filter (only if admin)
      if (user?.role === 'admin') {
        const usersResponse = await fetch('/api/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData.data || usersData)
        }
      }
    } catch (err) {
      console.error('Error fetching filter data:', err)
    }
  }

  useEffect(() => {
    fetchFilterData()
  }, [user])

  useEffect(() => {
    fetchTasks()
  }, [pagination.page, filters, refreshTrigger])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = (task: TaskWithRelations) => {
    if (!task.due_date || task.status === 'completed') return false
    return new Date(task.due_date) < new Date()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <p>Error loading tasks: {error}</p>
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
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Filter Tasks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Property Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property
            </label>
            <select
              value={filters.property_id}
              onChange={(e) => handleFilterChange('property_id', e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
            >
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To Filter (only for admins) */}
          {user?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                value={filters.assigned_to}
                onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
              >
                <option value="">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {users.filter(u => u.role === 'staff' || u.role === 'admin').map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : user.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {tasks.length === 0 ? (
          <TasksEmptyState 
            onCreateTask={onCreateTask} 
            userRole={profile?.role || 'staff'} 
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${
                  isOverdue(task) ? 'bg-red-50 border-l-4 border-red-400' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 text-base sm:text-lg truncate">
                        {task.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {isOverdue(task) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 whitespace-nowrap">
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="space-y-1 text-sm text-gray-500">
                      <div>Property: <span className="font-medium">{task.properties.name}</span></div>
                      {task.user_profiles && (
                        <div>
                          Assigned to: <span className="font-medium">
                            {task.user_profiles.first_name && task.user_profiles.last_name 
                              ? `${task.user_profiles.first_name} ${task.user_profiles.last_name}` 
                              : task.user_profiles.email}
                          </span>
                        </div>
                      )}
                      {task.due_date && (
                        <div>Due: <span className="font-medium">{formatDate(task.due_date)}</span></div>
                      )}
                      {task.completed_at && (
                        <div>Completed: <span className="font-medium">{formatDate(task.completed_at)}</span></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 flex-shrink-0">
                    <button
                      onClick={() => onEditTask(task)}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors min-h-[40px] border border-blue-200"
                    >
                      Edit
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors min-h-[40px] border border-red-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-500 text-center sm:text-left">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} tasks
              </div>
              <div className="flex justify-center sm:justify-end space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm flex items-center">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}