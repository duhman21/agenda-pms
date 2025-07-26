'use client'

import { withLazyLoading, ComponentLoader } from '@/lib/lazy-loading'

// Lazy load property management components
export const LazyPropertyList = withLazyLoading(
  () => import('@/components/properties/PropertyList'),
  <ComponentLoader height="h-64" />
)

export const LazyPropertyForm = withLazyLoading(
  () => import('@/components/properties/PropertyForm'),
  <ComponentLoader height="h-96" />
)

// Lazy load task management
export const LazyTaskList = withLazyLoading(
  () => import('@/components/tasks/TaskList'),
  <ComponentLoader height="h-64" />
)

export const LazyTaskForm = withLazyLoading(
  () => import('@/components/tasks/TaskForm'),
  <ComponentLoader height="h-80" />
)

// Lazy load expense management
export const LazyExpenseList = withLazyLoading(
  () => import('@/components/expenses/ExpenseList'),
  <ComponentLoader height="h-64" />
)

export const LazyExpenseForm = withLazyLoading(
  () => import('@/components/expenses/ExpenseForm'),
  <ComponentLoader height="h-80" />
)

// Lazy load user management
export const LazyUserManagement = withLazyLoading(
  () => import('@/components/auth/UserManagement'),
  <ComponentLoader height="h-96" />
)