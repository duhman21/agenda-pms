import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, generateTenantSlug, isValidTenantSlug } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, tenantName } = await request.json()

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !tenantName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Generate tenant slug
    const tenantSlug = generateTenantSlug(tenantName)
    
    if (!isValidTenantSlug(tenantSlug)) {
      return NextResponse.json(
        { error: 'Invalid tenant name. Please use only letters, numbers, and spaces.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Check if tenant slug already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (existingTenant) {
      return NextResponse.json(
        { error: 'A tenant with this name already exists. Please choose a different name.' },
        { status: 409 }
      )
    }

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

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        slug: tenantSlug
      })
      .select()
      .single()

    if (tenantError) {
      // Clean up user if tenant creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create tenant' },
        { status: 500 }
      )
    }

    // Create user profile as admin
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        tenant_id: tenant.id,
        role: 'admin',
        first_name: firstName,
        last_name: lastName,
        email: email
      })

    if (profileError) {
      // Clean up user and tenant if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Tenant and admin account created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error) {
    console.error('Tenant signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}