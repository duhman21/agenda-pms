'use client'

import { useState, useEffect } from 'react'
import { Task, Property, UserProfile } from '@/types'
import { AccessibleFormField, AccessibleSelect, AccessibleTextarea } from '@/components/accessibility/AccessibleForm'
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider'

interface TaskFormProps {
  task?: Task
  properties: Property[]
  users: UserProfile[]
  onSubmit: (taskData: Partial<Task>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function TaskForm({
  task,
  properties,
  users,
  onSubmit,
  onCancel,
  isLoading = false
}: TaskFormProps) {
  const [formData, setFormData] = useState({
    property_id: task?.property_id || '',
    assigned_to: task?.assigned_to || '',
    title: task?.title || '',
    description: task?.description || '',
    due_date: task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
    status: task?.status || 'pending'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const { announceToScreenReader } = useAccessibility()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.property_id) {
      newErrors.property_id = 'Property is required'
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      const errorCount = Object.keys(errors).length
      announceToScreenReader(`Form has ${errorCount} error${errorCount > 1 ? 's' : ''}. Please review and correct.`, 'assertive')
      return
    }

    announceToScreenReader('Saving task...', 'polite')

    try {
      const submitData: Partial<Task> = {
        property_id: formData.property_id,
        assigned_to: formData.assigned_to || null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        due_date: formData.due_date || null,
        status: formData.status as Task['status']
      }

      await onSubmit(submitData)
      announceToScreenReader(`Task ${task ? 'updated' : 'created'} successfully`, 'polite')
    } catch (error) {
      console.error('Error submitting task:', error)
      announceToScreenReader('Failed to save task. Please try again.', 'assertive')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Filter users to only show staff and admin for assignment
  const assignableUsers = users.filter(user => user.role === 'staff' || user.role === 'admin')

  // Prepare options for selects
  const propertyOptions = properties.map(property => ({
    value: property.id,
    label: property.name
  }))

  const userOptions = assignableUsers.map(user => ({
    value: user.id,
    label: user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}` 
      : user.email || 'Unknown User'
  }))

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 
        id="task-form-title"
        className="text-xl font-semibold mb-6 text-gray-900 dark:text-white"
      >
        {task ? 'Edit Task' : 'Create New Task'}
      </h2>

      <form 
        onSubmit={handleSubmit} 
        className="space-y-6"
        aria-labelledby="task-form-title"
        noValidate
      >
        <fieldset disabled={isLoading} className="space-y-6">
          <legend className="sr-only">
            Task {task ? 'editing' : 'creation'} form
          </legend>

          {/* Property Selection */}
          <AccessibleSelect
            label="Property"
            name="property_id"
            value={formData.property_id}
            onChange={(value) => handleInputChange('property_id', value)}
            options={propertyOptions}
            emptyOption="Select a property"
            error={errors.property_id}
            required
            disabled={isLoading}
            help="Choose the property this task is associated with"
          />

          {/* Title */}
          <AccessibleFormField
            label="Task Title"
            name="title"
            value={formData.title}
            onChange={(value) => handleInputChange('title', value)}
            error={errors.title}
            required
            placeholder="Enter a descriptive task title"
            disabled={isLoading}
            help="Provide a clear, concise title for the task (maximum 255 characters)"
          />

          {/* Description */}
          <AccessibleTextarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={(value) => handleInputChange('description', value)}
            rows={4}
            placeholder="Enter detailed task description (optional)"
            disabled={isLoading}
            help="Provide additional details about what needs to be done"
          />

          {/* Assigned To */}
          <AccessibleSelect
            label="Assign To"
            name="assigned_to"
            value={formData.assigned_to}
            onChange={(value) => handleInputChange('assigned_to', value)}
            options={userOptions}
            emptyOption="Unassigned"
            disabled={isLoading}
            help="Choose a team member to assign this task to, or leave unassigned"
          />

          {/* Due Date */}
          <AccessibleFormField
            label="Due Date"
            name="due_date"
            type="datetime-local"
            value={formData.due_date}
            onChange={(value) => handleInputChange('due_date', value)}
            disabled={isLoading}
            help="Set when this task should be completed (optional)"
          />

          {/* Status (only show for existing tasks) */}
          {task && (
            <AccessibleSelect
              label="Status"
              name="status"
              value={formData.status}
              onChange={(value) => handleInputChange('status', value)}
              options={statusOptions}
              disabled={isLoading}
              help="Update the current status of this task"
            />
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="
                px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 
                rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                min-h-[48px] transition-colors
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="
                px-4 py-3 text-white bg-blue-600 dark:bg-blue-700 
                rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                min-h-[48px] transition-colors
              "
              aria-describedby={isLoading ? 'save-status' : undefined}
            >
              {isLoading ? (
                <>
                  <span className="sr-only">Saving task, please wait</span>
                  <span aria-hidden="true">Saving...</span>
                </>
              ) : (
                task ? 'Update Task' : 'Create Task'
              )}
            </button>
          </div>

          {isLoading && (
            <div id="save-status" className="sr-only" aria-live="polite">
              Please wait while we save your task
            </div>
          )}
        </fieldset>
      </form>
    </div>
  )
}