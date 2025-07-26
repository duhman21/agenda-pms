'use client'

import { withLazyLoading, ComponentLoader } from '@/lib/lazy-loading'

// Lazy load report components
export const LazyReportGenerator = withLazyLoading(
  () => import('@/components/reports/ReportGenerator'),
  <ComponentLoader height="h-96" />
)

export const LazyReportSharing = withLazyLoading(
  () => import('@/components/reports/ReportSharing'),
  <ComponentLoader height="h-64" />
)

// Lazy load revenue analytics
export const LazyRevenueAnalytics = withLazyLoading(
  () => import('@/components/revenue/RevenueAnalytics'),
  <ComponentLoader height="h-80" />
)

export const LazyRevenueAuditTrail = withLazyLoading(
  () => import('@/components/revenue/RevenueAuditTrail'),
  <ComponentLoader height="h-64" />
)

export const LazyRevenueDashboard = withLazyLoading(
  () => import('@/components/revenue/RevenueDashboard'),
  <ComponentLoader height="h-96" />
)