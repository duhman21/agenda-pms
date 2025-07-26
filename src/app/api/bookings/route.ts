import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';
import { Booking } from '@/types';

// Function to automatically generate tasks for a booking
async function generateBookingTasks(supabase: any, booking: Booking, tenantId: string) {
  const checkOutDate = new Date(booking.check_out);
  
  // Generate cleaning task for checkout day
  const cleaningTask = {
    tenant_id: tenantId,
    property_id: booking.property_id,
    title: `Cleaning after ${booking.guest_name || 'Guest'} checkout`,
    description: `Clean property after guest checkout. Booking: ${booking.check_in} to ${booking.check_out}`,
    due_date: new Date(checkOutDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours after checkout
    status: 'pending',
    auto_generated: true
  };

  // Generate maintenance check task for checkout day
  const maintenanceTask = {
    tenant_id: tenantId,
    property_id: booking.property_id,
    title: `Maintenance check after ${booking.guest_name || 'Guest'} checkout`,
    description: `Perform maintenance check after guest checkout. Booking: ${booking.check_in} to ${booking.check_out}`,
    due_date: new Date(checkOutDate.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours after checkout
    status: 'pending',
    auto_generated: true
  };

  // Insert both tasks
  const { error: tasksError } = await supabase
    .from('tasks')
    .insert([cleaningTask, maintenanceTask]);

  if (tasksError) {
    console.error('Error creating auto-generated tasks:', tasksError);
    throw tasksError;
  }

  console.log(`Generated 2 tasks for booking ${booking.id}`);
}

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
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        *,
        properties!inner(id, name)
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .order('check_in', { ascending: true });

    // Apply filters
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    if (start) {
      query = query.gte('check_out', start);
    }

    if (end) {
      query = query.lte('check_in', end);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: error.message },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userProfile.tenant_id);

    if (countError) {
      console.error('Error getting booking count:', countError);
    }

    return NextResponse.json({
      success: true,
      bookings: bookings || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
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

    // Only admin and staff can create bookings
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      property_id,
      guest_name,
      check_in,
      check_out,
      revenue,
      source
    } = body;

    // Validate required fields
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

    // Check for overlapping bookings
    const { data: overlappingBookings, error: overlapError } = await supabase
      .from('bookings')
      .select('id, guest_name, check_in, check_out')
      .eq('property_id', property_id)
      .eq('tenant_id', userProfile.tenant_id)
      .lt('check_in', check_out)
      .gt('check_out', check_in);

    if (overlapError) {
      console.error('Error checking for overlaps:', overlapError);
      return NextResponse.json(
        { error: 'Failed to check for booking overlaps' },
        { status: 500 }
      );
    }

    if (overlappingBookings && overlappingBookings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Booking overlaps with existing booking(s)',
          overlapping_bookings: overlappingBookings
        },
        { status: 409 }
      );
    }

    // Create booking
    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        tenant_id: userProfile.tenant_id,
        property_id,
        guest_name,
        check_in,
        check_out,
        revenue: revenue ? parseFloat(revenue) : null,
        source: source || 'manual'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating booking:', insertError);
      return NextResponse.json(
        { error: 'Failed to create booking', details: insertError.message },
        { status: 500 }
      );
    }

    // Automatically generate tasks for the booking
    try {
      await generateBookingTasks(supabase, booking, userProfile.tenant_id);
    } catch (taskError) {
      console.error('Error generating booking tasks:', taskError);
      // Don't fail the booking creation if task generation fails
    }

    return NextResponse.json({
      success: true,
      booking
    }, { status: 201 });

  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}