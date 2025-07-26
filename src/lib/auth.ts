import { createClient } from '@supabase/supabase-js'
import { UserProfile, Tenant } from '@/types'

// Client-side Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Client-side function to get current user session and profile
export async function getCurrentUser() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return { user: null, profile: null, tenant: null }
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (profileError || !profile) {
    return { user: session.user, profile: null, tenant: null }
  }

  // Get tenant information
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  return {
    user: session.user,
    profile: profile as UserProfile,
    tenant: tenantError ? null : (tenant as Tenant)
  }
}

// Check if user has required role
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

// Check if user is admin
export function isAdmin(userRole: string): boolean {
  return userRole === 'admin'
}

// Check if user is staff or admin
export function isStaffOrAdmin(userRole: string): boolean {
  return ['admin', 'staff'].includes(userRole)
}