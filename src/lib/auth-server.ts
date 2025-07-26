import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { UnauthorizedError, ForbiddenError, validateTenantAccess } from '@/lib/api-error-handler';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  tenantId: string;
  role: 'admin' | 'staff' | 'owner';
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  // Get tenant and user info from middleware headers
  const tenantId = request.headers.get('x-tenant-id');
  const userRole = request.headers.get('x-user-role') as 'admin' | 'staff' | 'owner';
  const userId = request.headers.get('x-user-id');

  if (!tenantId || !userRole || !userId) {
    throw new UnauthorizedError('Authentication required');
  }

  // Create Supabase client to get user details
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op for server-side
        },
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new UnauthorizedError('Invalid session');
  }

  if (session.user.id !== userId) {
    throw new UnauthorizedError('Session user mismatch');
  }

  return {
    user: {
      id: userId,
      email: session.user.email,
    },
    tenantId,
    role: userRole,
  };
}

export function requireRole(allowedRoles: Array<'admin' | 'staff' | 'owner'>) {
  return (authContext: AuthContext) => {
    if (!allowedRoles.includes(authContext.role)) {
      throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }
  };
}

export function requireAdmin(authContext: AuthContext) {
  requireRole(['admin'])(authContext);
}

export function requireAdminOrStaff(authContext: AuthContext) {
  requireRole(['admin', 'staff'])(authContext);
}

export function validateResourceAccess(
  authContext: AuthContext,
  resourceTenantId: string | null | undefined
) {
  validateTenantAccess(authContext.tenantId, resourceTenantId);
}

// Helper to create authenticated API handler
export function withAuth<T extends any[]>(
  handler: (authContext: AuthContext, ...args: T) => Promise<Response>,
  options: {
    requiredRoles?: Array<'admin' | 'staff' | 'owner'>;
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authContext = await getAuthContext(request);
    
    if (options.requiredRoles) {
      requireRole(options.requiredRoles)(authContext);
    }
    
    return handler(authContext, ...args);
  };
}