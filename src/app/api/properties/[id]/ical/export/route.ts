import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { ICalGenerator } from '@/lib/ical-generator';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Export token required' },
        { status: 401 }
      );
    }

    // Get property by export token (no tenant restriction for public export)
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, tenant_id, name, ical_export_token')
      .eq('id', params.id)
      .eq('ical_export_token', token)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found or invalid token' },
        { status: 404 }
      );
    }

    // Get date range parameters
    const startDateParam = searchParams.get('start');
    const endDateParam = searchParams.get('end');
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date format' },
          { status: 400 }
        );
      }
    }

    if (endDateParam) {
      endDate = new Date(endDateParam);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end date format' },
          { status: 400 }
        );
      }
    }

    // Default to next 12 months if no date range specified
    if (!startDate && !endDate) {
      startDate = new Date();
      endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Get bookings for the property
    let bookingsQuery = supabase
      .from('bookings')
      .select('*')
      .eq('property_id', property.id)
      .eq('tenant_id', property.tenant_id)
      .order('check_in', { ascending: true });

    // Apply date filters
    if (startDate) {
      bookingsQuery = bookingsQuery.gte('check_out', startDate.toISOString().split('T')[0]);
    }
    
    if (endDate) {
      bookingsQuery = bookingsQuery.lte('check_in', endDate.toISOString().split('T')[0]);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Generate iCal content
    const icalContent = ICalGenerator.generateICalForDateRange(
      bookings || [],
      property.name,
      startDate,
      endDate
    );

    // Validate generated content
    const validation = ICalGenerator.validateICalContent(icalContent);
    if (!validation.valid) {
      console.error('Generated invalid iCal content:', validation.errors);
      return NextResponse.json(
        { error: 'Failed to generate valid iCal content' },
        { status: 500 }
      );
    }

    // Return iCal content with proper headers
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${property.name.replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('iCal export error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}