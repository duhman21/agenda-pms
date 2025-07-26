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

    // First verify the property exists and belongs to the tenant
    const { error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (propertyError) {
      if (propertyError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      console.error('Error checking property:', propertyError)
      return NextResponse.json({ error: 'Failed to verify property' }, { status: 500 })
    }

    // Get property owners
    const { data: owners, error } = await supabase
      .from('property_owners')
      .select(`
        id,
        owner_id,
        ownership_percentage,
        created_at,
        user_profiles!property_owners_owner_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('property_id', id)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching property owners:', error)
      return NextResponse.json({ error: 'Failed to fetch property owners' }, { status: 500 })
    }

    return NextResponse.json(owners || [])
  } catch (error) {
    console.error('Error in GET /api/properties/[id]/owners:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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
    const { owner_id, ownership_percentage = 100 } = body

    // Validate required fields
    if (!owner_id) {
      return NextResponse.json({ error: 'Owner ID is required' }, { status: 400 })
    }

    if (ownership_percentage <= 0 || ownership_percentage > 100) {
      return NextResponse.json({ error: 'Ownership percentage must be between 1 and 100' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // First verify the property exists and belongs to the tenant
    const { error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (propertyError) {
      if (propertyError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      console.error('Error checking property:', propertyError)
      return NextResponse.json({ error: 'Failed to verify property' }, { status: 500 })
    }

    // Verify the owner exists and belongs to the tenant
    const { data: owner, error: ownerError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', owner_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (ownerError) {
      if (ownerError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
      }
      console.error('Error checking owner:', ownerError)
      return NextResponse.json({ error: 'Failed to verify owner' }, { status: 500 })
    }

    if (owner.role !== 'owner') {
      return NextResponse.json({ error: 'User must have owner role to be assigned to property' }, { status: 400 })
    }

    // Check if owner is already assigned to this property
    const { data: existingOwner, error: existingError } = await supabase
      .from('property_owners')
      .select('id')
      .eq('property_id', id)
      .eq('owner_id', owner_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing owner:', existingError)
      return NextResponse.json({ error: 'Failed to check existing ownership' }, { status: 500 })
    }

    if (existingOwner) {
      return NextResponse.json({ error: 'Owner is already assigned to this property' }, { status: 400 })
    }

    // Check total ownership percentage
    const { data: currentOwners, error: currentOwnersError } = await supabase
      .from('property_owners')
      .select('ownership_percentage')
      .eq('property_id', id)
      .eq('tenant_id', profile.tenant_id)

    if (currentOwnersError) {
      console.error('Error checking current owners:', currentOwnersError)
      return NextResponse.json({ error: 'Failed to check current ownership' }, { status: 500 })
    }

    const currentTotal = currentOwners?.reduce((sum, owner) => sum + owner.ownership_percentage, 0) || 0
    if (currentTotal + ownership_percentage > 100) {
      return NextResponse.json({ 
        error: `Total ownership would exceed 100%. Current total: ${currentTotal}%` 
      }, { status: 400 })
    }

    // Add the property owner
    const { data: newOwner, error: insertError } = await supabase
      .from('property_owners')
      .insert({
        tenant_id: profile.tenant_id,
        property_id: id,
        owner_id,
        ownership_percentage
      })
      .select(`
        id,
        owner_id,
        ownership_percentage,
        created_at,
        user_profiles!property_owners_owner_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .single()

    if (insertError) {
      console.error('Error adding property owner:', insertError)
      return NextResponse.json({ error: 'Failed to add property owner' }, { status: 500 })
    }

    return NextResponse.json(newOwner, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/properties/[id]/owners:', error)
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
    const { owners } = body

    if (!Array.isArray(owners)) {
      return NextResponse.json({ error: 'Owners must be an array' }, { status: 400 })
    }

    // Validate total ownership percentage
    const totalPercentage = owners.reduce((sum, owner) => sum + (owner.ownership_percentage || 0), 0)
    if (totalPercentage > 100) {
      return NextResponse.json({ error: 'Total ownership percentage cannot exceed 100%' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // First verify the property exists and belongs to the tenant
    const { error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (propertyError) {
      if (propertyError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      console.error('Error checking property:', propertyError)
      return NextResponse.json({ error: 'Failed to verify property' }, { status: 500 })
    }

    // Delete existing owners
    const { error: deleteError } = await supabase
      .from('property_owners')
      .delete()
      .eq('property_id', id)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      console.error('Error deleting existing owners:', deleteError)
      return NextResponse.json({ error: 'Failed to update property owners' }, { status: 500 })
    }

    // Insert new owners if any
    if (owners.length > 0) {
      const propertyOwners = owners.map(owner => ({
        tenant_id: profile.tenant_id,
        property_id: id,
        owner_id: owner.owner_id,
        ownership_percentage: owner.ownership_percentage || 100
      }))

      const { error: insertError } = await supabase
        .from('property_owners')
        .insert(propertyOwners)

      if (insertError) {
        console.error('Error inserting new owners:', insertError)
        return NextResponse.json({ error: 'Failed to update property owners' }, { status: 500 })
      }
    }

    // Fetch updated owners
    const { data: updatedOwners, error: fetchError } = await supabase
      .from('property_owners')
      .select(`
        id,
        owner_id,
        ownership_percentage,
        created_at,
        user_profiles!property_owners_owner_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('property_id', id)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching updated owners:', fetchError)
      return NextResponse.json({ error: 'Owners updated but failed to fetch details' }, { status: 500 })
    }

    return NextResponse.json(updatedOwners || [])
  } catch (error) {
    console.error('Error in PUT /api/properties/[id]/owners:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}