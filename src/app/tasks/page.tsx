'use client'

import { useState, useEffect } from 'react'
import { Task, Property, UserProfile } from '@/types'
import { useTenant } from '@/components/auth/TenantProvider'
import TaskForm from '@/components/tasks/TaskForm'
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout'
import { ResponsiveCard, ResponsiveCardHeader } from '@/components/layout/ResponsiveCard'
import { TouchFriendlyButton } from '@/components/layout/TouchFriendlyButton'
import { ResponsiveModal, ModalContent } from '@/components/layout/ResponsiveModal'

// Lazy load heavy components
import { LazyTaskList } from '@/components/lazy/LazyManagement'
import { LazyTaskCalendar } from '@/components/lazy/LazyCalendar'

interface TaskWithRelations extends Task {
  properties: Property
  user_profiles?: UserProfile
}

export default function TasksPage() {
  const { user } = useTenant()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    fetchFormData()
  }, [])

  const fetchFormData = async () => {
    try {
      // Fetch properties
      const propertiesResponse = await fetch('/api/properties')
      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json()
        setProperties(propertiesData.data || propertiesData)
      }

      // Fetch users (for assignment)
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.data || usersData)
      }
    } catch (error) {
      console.error('Error fetching form data:', error)
    }
  }

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      setLoading(true)
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create task')
      }

      setShowForm(false)
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error creating task:', error)
      alert(error instanceof Error ? error.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTask = async (taskData: Partial<Task>) => {
    if (!editingTask) return

    try {
      setLoading(true)
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update task')
      }

      setEditingTask(null)
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error updating task:', error)
      alert(error instanceof Error ? error.message : 'Failed to update task')
    } finally {
      setLoading(false)
    }
  }

  const handleEditTask = (task: TaskWithRelations) => {
    setEditingTask(task)
    setShowForm(false)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete task')
      }

      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error deleting task:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete task')
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingTask(null)
  }

  // Check if user can create tasks
  const canCreateTasks = user?.role === 'admin' || user?.role === 'staff'

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <ResponsiveCard>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Task Management
              </h1>
              
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 mt-2 sm:mt-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'calendar' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>
            
            {canCreateTasks && !showForm && !editingTask && (
              <TouchFriendlyButton
                onClick={() => setShowForm(true)}
                size="md"
                className="w-full sm:w-auto"
              >
                Create Task
              </TouchFriendlyButton>
            )}
          </div>
        </ResponsiveCard>

        {/* Task Form Modal */}
        <ResponsiveModal
          isOpen={showForm || !!editingTask}
          onClose={handleCancelForm}
          title={editingTask ? 'Edit Task' : 'Create New Task'}
          size="lg"
        >
          <ModalContent>
            <TaskForm
              task={editingTask || undefined}
              properties={properties}
              users={users}
              onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
              onCancel={handleCancelForm}
              isLoading={loading}
            />
          </ModalContent>
        </ResponsiveModal>

        {/* Task Views */}
        {viewMode === 'list' ? (
          <LazyTaskList
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onCreateTask={() => setShowForm(true)}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <LazyTaskCalendar
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </ResponsiveLayout>
  )
}