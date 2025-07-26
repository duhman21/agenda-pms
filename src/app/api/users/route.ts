import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth-server'
import { getTenantContext } from '@/lib/tenant-context'

export async function GET(request: NextRequest) {
  try {
    const context = getTenantContext(request)
    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized - No tenant context' },
        { status: 401 }
      )
    }

    // Only admins can list users
    if (context.userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Get all users in the tenant
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      users: users || []
    })

  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = getTenantContext(request)
    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized - No tenant context' },
        { status: 401 }
      )
    }

    // Only admins can create users
    if (context.userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { email, password, firstName, lastName, role } = await request.json()

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'staff', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        tenant_id: context.tenantId,
        role,
        first_name: firstName,
        last_name: lastName,
        email: email
      })
      .select()
      .single()

    if (profileError) {
      // Clean up user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: profile
    })

  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}