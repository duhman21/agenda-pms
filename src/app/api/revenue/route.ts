import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');
    const ownerId = searchParams.get('owner_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build base query for bookings with revenue
    let query = supabase
      .from('bookings')
      .select(`
        id,
        property_id,
        guest_name,
        check_in,
        check_out,
        revenue,
        source,
        created_at,
        properties!inner(
          id,
          name,
          property_owners(
            ownership_percentage,
            user_profiles!inner(
              id,
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .not('revenue', 'is', null)
      .order('check_in', { ascending: false });

    // Apply filters based on user role
    if (userProfile.role === 'owner') {
      // Property owners can only see revenue for their properties
      const { data: ownedProperties } = await supabase
        .from('property_owners')
        .select('property_id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('owner_id', userProfile.id);

      if (!ownedProperties || ownedProperties.length === 0) {
        return NextResponse.json({
          success: true,
          revenue: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        });
      }

      const propertyIds = ownedProperties.map(p => p.property_id);
      query = query.in('property_id', propertyIds);
    }

    // Apply additional filters
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    if (startDate) {
      query = query.gte('check_in', startDate);
    }

    if (endDate) {
      query = query.lte('check_out', endDate);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching revenue data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch revenue data', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to include owner revenue attribution
    const revenueData = bookings?.map(booking => {
      const property = booking.properties;
      const owners = property.property_owners || [];
      
      // Calculate revenue attribution per owner
      const ownerRevenue = owners.map(owner => ({
        owner_id: owner.user_profiles.id,
        owner_name: `${owner.user_profiles.first_name || ''} ${owner.user_profiles.last_name || ''}`.trim(),
        owner_email: owner.user_profiles.email,
        ownership_percentage: owner.ownership_percentage,
        attributed_revenue: booking.revenue ? (booking.revenue * owner.ownership_percentage / 100) : 0
      }));

      return {
        id: booking.id,
        property_id: booking.property_id,
        property_name: property.name,
        guest_name: booking.guest_name,
        check_in: booking.check_in,
        check_out: booking.check_out,
        total_revenue: booking.revenue,
        source: booking.source,
        created_at: booking.created_at,
        owner_revenue: ownerRevenue
      };
    }) || [];

    // Get total count for pagination
    let countQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userProfile.tenant_id)
      .not('revenue', 'is', null);

    if (userProfile.role === 'owner') {
      const { data: ownedProperties } = await supabase
        .from('property_owners')
        .select('property_id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('owner_id', userProfile.id);

      if (ownedProperties && ownedProperties.length > 0) {
        const propertyIds = ownedProperties.map(p => p.property_id);
        countQuery = countQuery.in('property_id', propertyIds);
      }
    }

    if (propertyId) {
      countQuery = countQuery.eq('property_id', propertyId);
    }

    if (startDate) {
      countQuery = countQuery.gte('check_in', startDate);
    }

    if (endDate) {
      countQuery = countQuery.lte('check_out', endDate);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting revenue count:', countError);
    }

    return NextResponse.json({
      success: true,
      revenue: revenueData,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get revenue error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and staff can record revenue
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      booking_id,
      property_id,
      guest_name,
      check_in,
      check_out,
      revenue,
      source
    } = body;

    // Validate required fields
    if (!revenue || revenue <= 0) {
      return NextResponse.json(
        { error: 'Revenue amount is required and must be greater than 0' },
        { status: 400 }
      );
    }

    if (booking_id) {
      // Update existing booking with revenue
      const { data: booking, error: updateError } = await supabase
        .from('bookings')
        .update({ revenue: parseFloat(revenue) })
        .eq('id', booking_id)
        .eq('tenant_id', userProfile.tenant_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating booking revenue:', updateError);
        return NextResponse.json(
          { error: 'Failed to update booking revenue', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        booking
      });
    } else {
      // Create new booking with revenue
      if (!property_id || !check_in || !check_out) {
        return NextResponse.json(
          { error: 'Missing required fields: property_id, check_in, check_out' },
          { status: 400 }
        );
      }

      // Validate dates
      const checkInDate = new Date(check_in);
      const checkOutDate = new Date(check_out);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }

      if (checkOutDate <= checkInDate) {
        return NextResponse.json(
          { error: 'Check-out date must be after check-in date' },
          { status: 400 }
        );
      }

      // Verify property belongs to tenant
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', property_id)
        .eq('tenant_id', userProfile.tenant_id)
        .single();

      if (propertyError || !property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        );
      }

      // Create booking with revenue
      const { data: booking, error: insertError } = await supabase
        .from('bookings')
        .insert({
          tenant_id: userProfile.tenant_id,
          property_id,
          guest_name,
          check_in,
          check_out,
          revenue: parseFloat(revenue),
          source: source || 'manual'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating booking with revenue:', insertError);
        return NextResponse.json(
          { error: 'Failed to create booking with revenue', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        booking
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Revenue recording error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}