// Core types for the Property Management System

export interface Tenant {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  tenant_id: string
  role: 'admin' | 'staff' | 'owner'
  first_name?: string
  last_name?: string
  email?: string
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  tenant_id: string
  name: string
  address?: string
  description?: string
  ical_import_url?: string
  ical_export_token: string
  created_at: string
  updated_at: string
}

export interface PropertyOwner {
  id: string
  tenant_id: string
  property_id: string
  owner_id: string
  ownership_percentage: number
  created_at: string
}

export interface Booking {
  id: string
  tenant_id: string
  property_id: string
  guest_name?: string
  check_in: string
  check_out: string
  revenue?: number
  source?: string
  ical_uid?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  tenant_id: string
  property_id: string
  assigned_to?: string
  title: string
  description?: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'completed'
  auto_generated: boolean
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface Expense {
  id: string
  tenant_id: string
  property_id: string
  amount: number
  category: string
  description?: string
  receipt_url?: string
  expense_date: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  tenant_id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  user_id?: string
  created_at: string
}

export interface ICalSyncStatus {
  id: string
  tenant_id: string
  property_id: string
  last_sync: string | null
  last_sync_status: 'success' | 'error' | 'in_progress'
  last_error?: string
  next_sync?: string
  created_at: string
  updated_at: string
}

export interface TenantStats {
  properties_count: number
  active_bookings: number
  pending_tasks: number
  total_revenue_this_month: number
  total_expenses_this_month: number
}

// Extended types for API responses
export interface PropertyWithOwners extends Property {
  property_owners: (PropertyOwner & {
    user_profiles: UserProfile
  })[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Revenue tracking types
export interface RevenueRecord {
  id: string
  property_id: string
  property_name: string
  guest_name?: string
  check_in: string
  check_out: string
  total_revenue: number
  source?: string
  created_at: string
  owner_revenue: OwnerRevenueAttribution[]
}

export interface OwnerRevenueAttribution {
  owner_id: string
  owner_name: string
  owner_email?: string
  ownership_percentage: number
  attributed_revenue: number
}

export interface RevenueSummary {
  total_revenue: number
  average_revenue: number
  booking_count: number
  revenue_by_property: PropertyRevenue[]
  revenue_by_owner: OwnerRevenue[]
  revenue_trends: RevenueTrend[]
}

export interface PropertyRevenue {
  property_id: string
  property_name: string
  total_revenue: number
  booking_count: number
}

export interface OwnerRevenue {
  owner_id: string
  owner_name: string
  total_revenue: number
  booking_count: number
}

export interface RevenueTrend {
  period: string
  total_revenue: number
  booking_count: number
}

// Expense tracking types
export interface ExpenseRecord {
  id: string
  property_id: string
  property_name: string
  amount: number
  category: string
  description?: string
  receipt_url?: string
  expense_date: string
  created_at: string
  updated_at: string
  owner_expenses: OwnerExpenseAttribution[]
}

export interface OwnerExpenseAttribution {
  owner_id: string
  owner_name: string
  owner_email?: string
  ownership_percentage: number
  attributed_expense: number
}

export interface ExpenseSummary {
  total_expenses: number
  average_expense: number
  expense_count: number
  expenses_by_property: PropertyExpense[]
  expenses_by_owner: OwnerExpense[]
  expenses_by_category: CategoryExpense[]
  expense_trends: ExpenseTrend[]
}

export interface PropertyExpense {
  property_id: string
  property_name: string
  total_expenses: number
  expense_count: number
}

export interface OwnerExpense {
  owner_id: string
  owner_name: string
  total_expenses: number
  expense_count: number
}

export interface CategoryExpense {
  category: string
  total_expenses: number
  expense_count: number
}

export interface ExpenseTrend {
  period: string
  total_expenses: number
  expense_count: number
}

// Report types
export interface FinancialReport {
  id: string
  tenant_id: string
  report_type: 'monthly' | 'custom'
  start_date: string
  end_date: string
  properties: PropertyFinancialSummary[]
  owners: OwnerFinancialSummary[]
  totals: FinancialTotals
  generated_at: string
  generated_by: string
}

export interface PropertyFinancialSummary {
  property_id: string
  property_name: string
  total_revenue: number
  total_expenses: number
  net_profit: number
  booking_count: number
  expense_count: number
  revenue_by_source: RevenueBySource[]
  expenses_by_category: ExpenseByCategory[]
}

export interface OwnerFinancialSummary {
  owner_id: string
  owner_name: string
  owner_email?: string
  properties: OwnerPropertySummary[]
  total_revenue: number
  total_expenses: number
  net_profit: number
}

export interface OwnerPropertySummary {
  property_id: string
  property_name: string
  ownership_percentage: number
  attributed_revenue: number
  attributed_expenses: number
  attributed_profit: number
}

export interface FinancialTotals {
  total_revenue: number
  total_expenses: number
  net_profit: number
  total_bookings: number
  total_expenses_count: number
  profit_margin: number
}

export interface RevenueBySource {
  source: string
  total_revenue: number
  booking_count: number
}

export interface ExpenseByCategory {
  category: string
  total_expenses: number
  expense_count: number
}

export interface ReportGenerationRequest {
  report_type: 'monthly' | 'custom'
  start_date: string
  end_date: string
  property_ids?: string[]
  owner_ids?: string[]
  format: 'pdf' | 'csv' | 'json'
}

export interface ReportExportOptions {
  format: 'pdf' | 'csv'
  include_charts?: boolean
  include_details?: boolean
  template?: 'standard' | 'detailed' | 'summary'
}

export interface SharedReport {
  id: string
  tenant_id: string
  report_id: string
  share_token: string
  shared_with_email?: string
  shared_by: string
  expires_at?: string
  access_count: number
  max_access_count?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ReportShareRequest {
  report_data: FinancialReport
  shared_with_email?: string
  expires_in_days?: number
  max_access_count?: number
  format: 'pdf' | 'csv' | 'json'
}

export interface EmailReportSchedule {
  id: string
  tenant_id: string
  owner_id: string
  property_ids?: string[]
  schedule_type: 'monthly' | 'weekly' | 'quarterly'
  day_of_month?: number // For monthly reports (1-31)
  day_of_week?: number // For weekly reports (0-6, 0=Sunday)
  is_active: boolean
  last_sent?: string
  next_send: string
  format: 'pdf' | 'csv'
  created_at: string
  updated_at: string
}

// Database function types
export type DatabaseFunction = {
  get_tenant_stats: (tenant_uuid: string) => TenantStats
  cleanup_old_audit_logs: () => number
}