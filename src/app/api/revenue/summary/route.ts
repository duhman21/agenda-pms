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
    const groupBy = searchParams.get('group_by') || 'month'; // month, quarter, year

    // Build base query for revenue summary
    let query = supabase
      .from('bookings')
      .select(`
        revenue,
        check_in,
        check_out,
        property_id,
        properties!inner(
          id,
          name,
          property_owners(
            ownership_percentage,
            user_profiles!inner(
              id,
              first_name,
              last_name
            )
          )
        )
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .not('revenue', 'is', null);

    // Apply role-based filtering
    if (userProfile.role === 'owner') {
      const { data: ownedProperties } = await supabase
        .from('property_owners')
        .select('property_id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('owner_id', userProfile.id);

      if (!ownedProperties || ownedProperties.length === 0) {
        return NextResponse.json({
          success: true,
          summary: {
            total_revenue: 0,
            average_revenue: 0,
            booking_count: 0,
            revenue_by_property: [],
            revenue_by_owner: [],
            revenue_trends: []
          }
        });
      }

      const propertyIds = ownedProperties.map(p => p.property_id);
      query = query.in('property_id', propertyIds);
    }

    // Apply filters
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    if (startDate) {
      query = query.gte('check_in', startDate);
    }

    if (endDate) {
      query = query.lte('check_out', endDate);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching revenue summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch revenue summary', details: error.message },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          total_revenue: 0,
          average_revenue: 0,
          booking_count: 0,
          revenue_by_property: [],
          revenue_by_owner: [],
          revenue_trends: []
        }
      });
    }

    // Calculate total revenue and averages
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.revenue || 0), 0);
    const averageRevenue = totalRevenue / bookings.length;
    const bookingCount = bookings.length;

    // Group revenue by property
    const revenueByProperty = bookings.reduce((acc, booking) => {
      const propertyId = booking.property_id;
      const propertyName = booking.properties.name;
      
      if (!acc[propertyId]) {
        acc[propertyId] = {
          property_id: propertyId,
          property_name: propertyName,
          total_revenue: 0,
          booking_count: 0
        };
      }
      
      acc[propertyId].total_revenue += booking.revenue || 0;
      acc[propertyId].booking_count += 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Group revenue by owner with attribution
    const revenueByOwner = bookings.reduce((acc, booking) => {
      const owners = booking.properties.property_owners || [];
      
      owners.forEach(owner => {
        const ownerId = owner.user_profiles.id;
        const ownerName = `${owner.user_profiles.first_name || ''} ${owner.user_profiles.last_name || ''}`.trim();
        const attributedRevenue = (booking.revenue || 0) * (owner.ownership_percentage / 100);
        
        if (!acc[ownerId]) {
          acc[ownerId] = {
            owner_id: ownerId,
            owner_name: ownerName,
            total_revenue: 0,
            booking_count: 0
          };
        }
        
        acc[ownerId].total_revenue += attributedRevenue;
        acc[ownerId].booking_count += 1;
      });
      
      return acc;
    }, {} as Record<string, any>);

    // Generate revenue trends based on groupBy parameter
    const revenueTrends = generateRevenueTrends(bookings, groupBy);

    return NextResponse.json({
      success: true,
      summary: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        average_revenue: Math.round(averageRevenue * 100) / 100,
        booking_count: bookingCount,
        revenue_by_property: Object.values(revenueByProperty).map(item => ({
          ...item,
          total_revenue: Math.round(item.total_revenue * 100) / 100
        })),
        revenue_by_owner: Object.values(revenueByOwner).map(item => ({
          ...item,
          total_revenue: Math.round(item.total_revenue * 100) / 100
        })),
        revenue_trends: revenueTrends
      }
    });

  } catch (error) {
    console.error('Revenue summary error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateRevenueTrends(bookings: any[], groupBy: string) {
  const trends = bookings.reduce((acc, booking) => {
    const checkInDate = new Date(booking.check_in);
    let periodKey: string;

    switch (groupBy) {
      case 'year':
        periodKey = checkInDate.getFullYear().toString();
        break;
      case 'quarter':
        const quarter = Math.floor(checkInDate.getMonth() / 3) + 1;
        periodKey = `${checkInDate.getFullYear()}-Q${quarter}`;
        break;
      case 'month':
      default:
        periodKey = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!acc[periodKey]) {
      acc[periodKey] = {
        period: periodKey,
        total_revenue: 0,
        booking_count: 0
      };
    }

    acc[periodKey].total_revenue += booking.revenue || 0;
    acc[periodKey].booking_count += 1;

    return acc;
  }, {} as Record<string, any>);

  return Object.values(trends)
    .map(item => ({
      ...item,
      total_revenue: Math.round(item.total_revenue * 100) / 100
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}