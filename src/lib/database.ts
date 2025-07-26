import { createServerSupabaseClient } from './supabase'
import { Tenant, UserProfile, TenantStats } from '@/types'

/**
 * Database utility functions for multi-tenant operations
 */

/**
 * Create a new tenant with isolated environment
 */
export async function createTenant(name: string, slug: string): Promise<Tenant> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .insert({ name, slug })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create tenant: ${error.message}`)
  }

  return data
}

/**
 * Create a user profile with tenant association
 */
export async function createUserProfile(
  userId: string,
  tenantId: string,
  role: 'admin' | 'staff' | 'owner',
  firstName?: string,
  lastName?: string,
  email?: string
): Promise<UserProfile> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      tenant_id: tenantId,
      role,
      first_name: firstName,
      last_name: lastName,
      email
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create user profile: ${error.message}`)
  }

  return data
}

/**
 * Get tenant statistics
 */
export async function getTenantStats(tenantId: string): Promise<TenantStats> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .rpc('get_tenant_stats', { tenant_uuid: tenantId })

  if (error) {
    throw new Error(`Failed to get tenant stats: ${error.message}`)
  }

  return data
}

/**
 * Validate tenant access for a user
 */
export async function validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    return false
  }

  return true
}

/**
 * Get user profile with tenant information
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Check if user has admin role in their tenant
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  return profile?.role === 'admin'
}

/**
 * Check if user has staff or admin role in their tenant
 */
export async function isUserStaffOrAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  return profile?.role === 'admin' || profile?.role === 'staff'
}

/**
 * Clean up old audit logs (should be run periodically)
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .rpc('cleanup_old_audit_logs')

  if (error) {
    throw new Error(`Failed to cleanup audit logs: ${error.message}`)
  }

  return data
}

/**
 * Validate booking dates don't overlap
 */
export async function validateBookingDates(
  propertyId: string,
  tenantId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .or(`and(check_in.lte.${checkIn},check_out.gt.${checkIn}),and(check_in.lt.${checkOut},check_out.gte.${checkOut}),and(check_in.gte.${checkIn},check_out.lte.${checkOut})`)

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to validate booking dates: ${error.message}`)
  }

  return data.length === 0
}

/**
 * Get property ownership percentages
 */
export async function getPropertyOwnershipTotal(propertyId: string, tenantId: string): Promise<number> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('property_owners')
    .select('ownership_percentage')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`Failed to get property ownership: ${error.message}`)
  }

  return data.reduce((total, owner) => total + owner.ownership_percentage, 0)
}