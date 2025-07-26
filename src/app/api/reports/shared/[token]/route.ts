import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ReportGenerator } from '@/lib/report-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { token } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    if (!token) {
      return NextResponse.json(
        { error: 'Share token is required' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['pdf', 'csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be pdf, csv, or json' },
        { status: 400 }
      );
    }

    // Find the shared report
    const { data: sharedReport, error: findError } = await supabase
      .from('shared_reports')
      .select(`
        id,
        tenant_id,
        report_id,
        shared_with_email,
        expires_at,
        access_count,
        max_access_count,
        is_active
      `)
      .eq('share_token', token)
      .single();

    if (findError || !sharedReport) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      );
    }

    // Check if the shared report is active
    if (!sharedReport.is_active) {
      return NextResponse.json(
        { error: 'This share link has been deactivated' },
        { status: 403 }
      );
    }

    // Check if the shared report has expired
    if (sharedReport.expires_at && new Date(sharedReport.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This share link has expired' },
        { status: 403 }
      );
    }

    // Check if the access count limit has been reached
    if (sharedReport.max_access_count && sharedReport.access_count >= sharedReport.max_access_count) {
      return NextResponse.json(
        { error: 'This share link has reached its access limit' },
        { status: 403 }
      );
    }

    // Increment access count
    const { error: updateError } = await supabase
      .from('shared_reports')
      .update({ 
        access_count: sharedReport.access_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', sharedReport.id);

    if (updateError) {
      console.error('Error updating access count:', updateError);
      // Continue anyway - this is not critical
    }

    // For this implementation, we'll need to regenerate the report
    // In a production system, you might want to cache the report data
    // or store it when the share link is created
    
    // Since we don't have the original report data stored, we'll need to 
    // regenerate it based on the report_id and tenant context
    // For now, we'll return an error indicating this needs to be implemented
    
    return NextResponse.json(
      { 
        error: 'Report regeneration not implemented in this demo',
        message: 'In a production system, the report data would be cached or regenerated here',
        shared_report_info: {
          id: sharedReport.id,
          access_count: sharedReport.access_count + 1,
          max_access_count: sharedReport.max_access_count,
          expires_at: sharedReport.expires_at
        }
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Shared report access error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to access shared report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}