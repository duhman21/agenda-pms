import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';
import { EmailReportSchedule } from '@/types';

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

    // Only admin and staff can create email schedules
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      owner_id,
      property_ids,
      schedule_type,
      day_of_month,
      day_of_week,
      format = 'pdf'
    } = body;

    // Validate required fields
    if (!owner_id || !schedule_type) {
      return NextResponse.json(
        { error: 'Missing required fields: owner_id, schedule_type' },
        { status: 400 }
      );
    }

    // Validate schedule_type
    if (!['monthly', 'weekly', 'quarterly'].includes(schedule_type)) {
      return NextResponse.json(
        { error: 'Invalid schedule_type. Must be monthly, weekly, or quarterly' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['pdf', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be pdf or csv' },
        { status: 400 }
      );
    }

    // Validate day_of_month for monthly/quarterly schedules
    if (['monthly', 'quarterly'].includes(schedule_type)) {
      if (!day_of_month || day_of_month < 1 || day_of_month > 31) {
        return NextResponse.json(
          { error: 'day_of_month is required for monthly/quarterly schedules and must be between 1-31' },
          { status: 400 }
        );
      }
    }

    // Validate day_of_week for weekly schedules
    if (schedule_type === 'weekly') {
      if (day_of_week === undefined || day_of_week < 0 || day_of_week > 6) {
        return NextResponse.json(
          { error: 'day_of_week is required for weekly schedules and must be between 0-6' },
          { status: 400 }
        );
      }
    }

    // Verify owner exists and belongs to tenant
    const { data: owner, error: ownerError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', owner_id)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('role', 'owner')
      .single();

    if (ownerError || !owner) {
      return NextResponse.json(
        { error: 'Owner not found' },
        { status: 404 }
      );
    }

    // Verify properties belong to tenant if specified
    if (property_ids && property_ids.length > 0) {
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('tenant_id', userProfile.tenant_id)
        .in('id', property_ids);

      if (propertiesError || !properties || properties.length !== property_ids.length) {
        return NextResponse.json(
          { error: 'One or more properties not found' },
          { status: 404 }
        );
      }
    }

    // Calculate next send date using the database function
    const { data: nextSendResult, error: nextSendError } = await supabase
      .rpc('calculate_next_send_date', {
        schedule_type,
        day_of_month: schedule_type !== 'weekly' ? day_of_month : null,
        day_of_week: schedule_type === 'weekly' ? day_of_week : null
      });

    if (nextSendError) {
      console.error('Error calculating next send date:', nextSendError);
      return NextResponse.json(
        { error: 'Failed to calculate next send date', details: nextSendError.message },
        { status: 500 }
      );
    }

    // Create email schedule
    const { data: schedule, error: insertError } = await supabase
      .from('email_report_schedules')
      .insert({
        tenant_id: userProfile.tenant_id,
        owner_id,
        property_ids: property_ids || null,
        schedule_type,
        day_of_month: schedule_type !== 'weekly' ? day_of_month : null,
        day_of_week: schedule_type === 'weekly' ? day_of_week : null,
        next_send: nextSendResult,
        format,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating email schedule:', insertError);
      return NextResponse.json(
        { error: 'Failed to create email schedule', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      schedule
    }, { status: 201 });

  } catch (error) {
    console.error('Email schedule creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create email schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
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
    const ownerId = searchParams.get('owner_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query for email schedules
    let query = supabase
      .from('email_report_schedules')
      .select(`
        id,
        owner_id,
        property_ids,
        schedule_type,
        day_of_month,
        day_of_week,
        is_active,
        last_sent,
        next_send,
        format,
        created_at,
        updated_at,
        user_profiles!email_report_schedules_owner_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (userProfile.role === 'owner') {
      query = query.eq('owner_id', userProfile.id);
    } else if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: schedules, error } = await query;

    if (error) {
      console.error('Error fetching email schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch email schedules', details: error.message },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('email_report_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userProfile.tenant_id);

    if (userProfile.role === 'owner') {
      countQuery = countQuery.eq('owner_id', userProfile.id);
    } else if (ownerId) {
      countQuery = countQuery.eq('owner_id', ownerId);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting email schedules count:', countError);
    }

    return NextResponse.json({
      success: true,
      schedules,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get email schedules error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and staff can update email schedules
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      property_ids,
      schedule_type,
      day_of_month,
      day_of_week,
      format,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    // Verify schedule exists and belongs to tenant
    const { data: existingSchedule, error: findError } = await supabase
      .from('email_report_schedules')
      .select('id, schedule_type, day_of_month, day_of_week')
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (findError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Email schedule not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};

    if (property_ids !== undefined) {
      updateData.property_ids = property_ids;
    }

    if (schedule_type !== undefined) {
      if (!['monthly', 'weekly', 'quarterly'].includes(schedule_type)) {
        return NextResponse.json(
          { error: 'Invalid schedule_type' },
          { status: 400 }
        );
      }
      updateData.schedule_type = schedule_type;
    }

    if (day_of_month !== undefined) {
      updateData.day_of_month = day_of_month;
    }

    if (day_of_week !== undefined) {
      updateData.day_of_week = day_of_week;
    }

    if (format !== undefined) {
      if (!['pdf', 'csv'].includes(format)) {
        return NextResponse.json(
          { error: 'Invalid format' },
          { status: 400 }
        );
      }
      updateData.format = format;
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    // Recalculate next send date if schedule parameters changed
    const scheduleChanged = schedule_type !== undefined || 
                           day_of_month !== undefined || 
                           day_of_week !== undefined;

    if (scheduleChanged) {
      const finalScheduleType = schedule_type || existingSchedule.schedule_type;
      const finalDayOfMonth = day_of_month !== undefined ? day_of_month : existingSchedule.day_of_month;
      const finalDayOfWeek = day_of_week !== undefined ? day_of_week : existingSchedule.day_of_week;

      const { data: nextSendResult, error: nextSendError } = await supabase
        .rpc('calculate_next_send_date', {
          schedule_type: finalScheduleType,
          day_of_month: finalScheduleType !== 'weekly' ? finalDayOfMonth : null,
          day_of_week: finalScheduleType === 'weekly' ? finalDayOfWeek : null
        });

      if (nextSendError) {
        console.error('Error calculating next send date:', nextSendError);
        return NextResponse.json(
          { error: 'Failed to calculate next send date', details: nextSendError.message },
          { status: 500 }
        );
      }

      updateData.next_send = nextSendResult;
    }

    // Update the schedule
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('email_report_schedules')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating email schedule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update email schedule', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule
    });

  } catch (error) {
    console.error('Email schedule update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update email schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and staff can delete email schedules
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    // Delete the schedule
    const { error: deleteError } = await supabase
      .from('email_report_schedules')
      .delete()
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id);

    if (deleteError) {
      console.error('Error deleting email schedule:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete email schedule', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email schedule deleted successfully'
    });

  } catch (error) {
    console.error('Email schedule deletion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete email schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}