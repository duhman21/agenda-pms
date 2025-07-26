import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth-server'
import { getTenantContext } from '@/lib/tenant-context'

export async function PUT(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const tenantContext = getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Unauthorized - No tenant context' },
        { status: 401 }
      )
    }

    // Only admins can update users
    if (tenantContext.userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { firstName, lastName, role } = await request.json()

    // Validate required fields
    if (!firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'First name, last name, and role are required' },
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

    // Check if user exists and belongs to the same tenant
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const tenantContext = getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Unauthorized - No tenant context' },
        { status: 401 }
      )
    }

    // Only admins can delete users
    if (tenantContext.userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Prevent self-deletion
    if (id === tenantContext.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Check if user exists and belongs to the same tenant
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user profile (this will cascade to auth.users due to foreign key)
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantContext.tenantId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    // Also delete from auth.users
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id)
    
    if (authDeleteError) {
      console.error('Failed to delete auth user:', authDeleteError)
      // Continue anyway as the profile is deleted
    }

    return NextResponse.json({
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}