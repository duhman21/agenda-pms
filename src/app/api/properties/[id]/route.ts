import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, profile } = await getCurrentUser()
    if (!user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServerSupabaseClient()
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_owners (
          id,
          owner_id,
          ownership_percentage,
          user_profiles!property_owners_owner_id_fkey (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      console.error('Error fetching property:', error)
      return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error in GET /api/properties/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, profile } = await getCurrentUser()
    if (!user || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, address, description, ical_import_url, owners } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Property name is required' }, { status: 400 })
    }

    // Validate owners if provided
    if (owners && Array.isArray(owners)) {
      const totalPercentage = owners.reduce((sum, owner) => sum + (owner.ownership_percentage || 0), 0)
      if (totalPercentage > 100) {
        return NextResponse.json({ error: 'Total ownership percentage cannot exceed 100%' }, { status: 400 })
      }
    }

    const supabase = createServerSupabaseClient()

    // First, verify the property exists and belongs to the tenant
    const { error: checkError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      console.error('Error checking property:', checkError)
      return NextResponse.json({ error: 'Failed to verify property' }, { status: 500 })
    }

    // Update the property
    const { data: property, error: updateError } = await supabase
      .from('properties')
      .update({
        name,
        address,
        description,
        ical_import_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating property:', updateError)
      return NextResponse.json({ error: 'Failed to update property' }, { status: 500 })
    }

    // Update property owners if provided
    if (owners && Array.isArray(owners)) {
      // Delete existing owners
      const { error: deleteOwnersError } = await supabase
        .from('property_owners')
        .delete()
        .eq('property_id', id)
        .eq('tenant_id', profile.tenant_id)

      if (deleteOwnersError) {
        console.error('Error deleting existing owners:', deleteOwnersError)
        return NextResponse.json({ error: 'Failed to update property owners' }, { status: 500 })
      }

      // Insert new owners
      if (owners.length > 0) {
        const propertyOwners = owners.map(owner => ({
          tenant_id: profile.tenant_id,
          property_id: id,
          owner_id: owner.owner_id,
          ownership_percentage: owner.ownership_percentage || 100
        }))

        const { error: insertOwnersError } = await supabase
          .from('property_owners')
          .insert(propertyOwners)

        if (insertOwnersError) {
          console.error('Error inserting new owners:', insertOwnersError)
          return NextResponse.json({ error: 'Failed to update property owners' }, { status: 500 })
        }
      }
    }

    // Fetch the complete updated property with owners
    const { data: completeProperty, error: fetchError } = await supabase
      .from('properties')
      .select(`
        *,
        property_owners (
          id,
          owner_id,
          ownership_percentage,
          user_profiles!property_owners_owner_id_fkey (
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching updated property:', fetchError)
      return NextResponse.json({ error: 'Property updated but failed to fetch details' }, { status: 500 })
    }

    return NextResponse.json(completeProperty)
  } catch (error) {
    console.error('Error in PUT /api/properties/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, profile } = await getCurrentUser()
    if (!user || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServerSupabaseClient()

    // First, verify the property exists and belongs to the tenant
    const { error: checkError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      console.error('Error checking property:', checkError)
      return NextResponse.json({ error: 'Failed to verify property' }, { status: 500 })
    }

    // Check if property has associated bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('property_id', id)
      .eq('tenant_id', profile.tenant_id)
      .limit(1)

    if (bookingsError) {
      console.error('Error checking bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to check property dependencies' }, { status: 500 })
    }

    if (bookings && bookings.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete property with existing bookings. Please remove all bookings first.' 
      }, { status: 400 })
    }

    // Check if property has associated tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('property_id', id)
      .eq('tenant_id', profile.tenant_id)
      .limit(1)

    if (tasksError) {
      console.error('Error checking tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to check property dependencies' }, { status: 500 })
    }

    if (tasks && tasks.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete property with existing tasks. Please remove all tasks first.' 
      }, { status: 400 })
    }

    // Delete property owners first (due to foreign key constraints)
    const { error: deleteOwnersError } = await supabase
      .from('property_owners')
      .delete()
      .eq('property_id', id)
      .eq('tenant_id', profile.tenant_id)

    if (deleteOwnersError) {
      console.error('Error deleting property owners:', deleteOwnersError)
      return NextResponse.json({ error: 'Failed to delete property owners' }, { status: 500 })
    }

    // Delete the property
    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      console.error('Error deleting property:', deleteError)
      return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Property deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/properties/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}