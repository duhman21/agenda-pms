'use client'

import { withLazyLoading, ComponentLoader } from '@/lib/lazy-loading'

// Lazy load calendar components
export const LazyUnifiedCalendarView = withLazyLoading(
  () => import('@/components/calendar/UnifiedCalendarView'),
  <ComponentLoader height="h-96" />
)

export const LazyICalSyncSettings = withLazyLoading(
  () => import('@/components/calendar/ICalSyncSettings'),
  <ComponentLoader height="h-64" />
)

export const LazySyncStatusMonitor = withLazyLoading(
  () => import('@/components/calendar/SyncStatusMonitor'),
  <ComponentLoader height="h-48" />
)

// Lazy load task calendar
export const LazyTaskCalendar = withLazyLoading(
  () => import('@/components/tasks/TaskCalendar'),
  <ComponentLoader height="h-80" />
)