import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getAuthContext, requireAdminOrStaff, validateResourceAccess } from '@/lib/auth-server'
import { withErrorHandling, ValidationError, DatabaseError, handleDatabaseError } from '@/lib/api-error-handler'
import { z } from 'zod'

const getPropertiesSchema = z.object({
  search: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
})

const createPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(255),
  address: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  ical_import_url: z.string().url().optional().or(z.literal('')),
  owners: z.array(z.object({
    owner_id: z.string().uuid(),
    ownership_percentage: z.number().min(0).max(100).default(100),
  })).optional(),
})

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authContext = await getAuthContext(request)
  const { searchParams } = new URL(request.url)

  // Validate query parameters
  const queryParams = getPropertiesSchema.parse({
    search: searchParams.get('search'),
    owner_id: searchParams.get('owner_id'),
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  const { search, owner_id, page, limit } = queryParams
  const offset = (page - 1) * limit

  const supabase = createServerSupabaseClient()

  try {
    let query = supabase
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
      `, { count: 'exact' })
      .eq('tenant_id', authContext.tenantId)
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply owner filter
    if (owner_id) {
      query = query.eq('property_owners.owner_id', owner_id)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: properties, error, count } = await query

    if (error) {
      handleDatabaseError(error)
    }

    return NextResponse.json({
      properties: properties || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    handleDatabaseError(error)
  }
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const authContext = await getAuthContext(request)
  requireAdminOrStaff(authContext) // Only admin and staff can create properties

  const body = await request.json()
  const validatedData = createPropertySchema.parse(body)
  const { name, address, description, ical_import_url, owners } = validatedData

  // Validate owners if provided
  if (owners && owners.length > 0) {
    const totalPercentage = owners.reduce((sum, owner) => sum + owner.ownership_percentage, 0)
    if (totalPercentage > 100) {
      throw new ValidationError('Total ownership percentage cannot exceed 100%', {
        totalPercentage,
        maxAllowed: 100,
      })
    }
  }

  const supabase = createServerSupabaseClient()

  try {
    // Start a transaction by creating the property first
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        tenant_id: authContext.tenantId,
        name,
        address,
        description,
        ical_import_url: ical_import_url || null,
      })
      .select()
      .single()

    if (propertyError) {
      handleDatabaseError(propertyError)
    }

    // Add property owners if provided
    if (owners && owners.length > 0) {
      const propertyOwners = owners.map(owner => ({
        tenant_id: authContext.tenantId,
        property_id: property.id,
        owner_id: owner.owner_id,
        ownership_percentage: owner.ownership_percentage,
      }))

      const { error: ownersError } = await supabase
        .from('property_owners')
        .insert(propertyOwners)

      if (ownersError) {
        // Clean up the property if owner creation fails
        await supabase.from('properties').delete().eq('id', property.id)
        handleDatabaseError(ownersError)
      }
    }

    // Fetch the complete property with owners
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
      .eq('id', property.id)
      .single()

    if (fetchError) {
      handleDatabaseError(fetchError)
    }

    return NextResponse.json(completeProperty, { status: 201 })
  } catch (error) {
    handleDatabaseError(error)
  }
})