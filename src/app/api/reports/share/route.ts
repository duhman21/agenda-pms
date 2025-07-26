import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';
import { ReportShareRequest, SharedReport } from '@/types';
import { ReportGenerator } from '@/lib/report-generator';

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

    // Only admin and staff can share reports
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body: ReportShareRequest = await request.json();
    const { 
      report_data, 
      shared_with_email, 
      expires_in_days = 30, 
      max_access_count,
      format = 'pdf'
    } = body;

    if (!report_data) {
      return NextResponse.json(
        { error: 'Report data is required' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (shared_with_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shared_with_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const expiresAt = expires_in_days > 0 
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : null;

    // Create shared report record
    const { data: sharedReport, error: insertError } = await supabase
      .from('shared_reports')
      .insert({
        tenant_id: userProfile.tenant_id,
        report_id: report_data.id,
        shared_with_email,
        shared_by: userProfile.id,
        expires_at: expiresAt?.toISOString(),
        max_access_count,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating shared report:', insertError);
      return NextResponse.json(
        { error: 'Failed to create shared report', details: insertError.message },
        { status: 500 }
      );
    }

    // Generate the secure share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reports/shared/${sharedReport.share_token}?format=${format}`;

    // TODO: Send email notification if shared_with_email is provided
    // This would integrate with an email service like Resend or SendGrid

    return NextResponse.json({
      success: true,
      shared_report: sharedReport,
      share_url: shareUrl
    }, { status: 201 });

  } catch (error) {
    console.error('Report sharing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to share report',
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query for shared reports
    let query = supabase
      .from('shared_reports')
      .select(`
        id,
        report_id,
        share_token,
        shared_with_email,
        shared_by,
        expires_at,
        access_count,
        max_access_count,
        is_active,
        created_at,
        updated_at,
        user_profiles!shared_reports_shared_by_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: sharedReports, error } = await query;

    if (error) {
      console.error('Error fetching shared reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shared reports', details: error.message },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('shared_reports')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userProfile.tenant_id);

    if (countError) {
      console.error('Error getting shared reports count:', countError);
    }

    return NextResponse.json({
      success: true,
      shared_reports: sharedReports,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get shared reports error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}