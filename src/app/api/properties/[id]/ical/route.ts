import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getUserProfile } from '@/lib/auth-server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const userProfile = await getUserProfile();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and staff can update iCal settings
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ical_import_url } = body;

    // Validate URL format if provided
    if (ical_import_url && ical_import_url.trim()) {
      try {
        new URL(ical_import_url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid iCal URL format' },
          { status: 400 }
        );
      }
    }

    // Update property iCal settings
    const { data, error } = await supabase
      .from('properties')
      .update({
        ical_import_url: ical_import_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('tenant_id', userProfile.tenant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update property iCal settings', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      property: data
    });
  } catch (error) {
    console.error('Update iCal settings error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const userProfile = await getUserProfile();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get property iCal settings
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, ical_import_url, ical_export_token')
      .eq('id', params.id)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch property iCal settings', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      property: data
    });
  } catch (error) {
    console.error('Get iCal settings error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}