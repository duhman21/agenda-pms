import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth-server'

export interface TenantContext {
  tenantId: string
  userId: string
  userRole: 'admin' | 'staff' | 'owner'
}

/**
 * Extract tenant context from request headers (set by middleware)
 */
export function getTenantContext(request: NextRequest): TenantContext | null {
  const tenantId = request.headers.get('x-tenant-id')
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role') as 'admin' | 'staff' | 'owner'

  if (!tenantId || !userId || !userRole) {
    return null
  }

  return {
    tenantId,
    userId,
    userRole
  }
}

/**
 * Validate that the user has the required role
 */
export function hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

/**
 * Create a Supabase client with tenant context for RLS
 */
export async function createTenantSupabaseClient(context: TenantContext) {
  const supabase = await createServerSupabaseClient()
  
  // Set the tenant_id in the JWT claims for RLS
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    // Update the JWT with tenant context
    await supabase.auth.updateUser({
      data: {
        tenant_id: context.tenantId,
        role: context.userRole
      }
    })
  }
  
  return supabase
}

/**
 * Middleware helper to ensure tenant isolation
 */
export function validateTenantAccess(context: TenantContext, resourceTenantId: string): boolean {
  return context.tenantId === resourceTenantId
}