import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { ICalSyncService } from '@/lib/ical-sync';
import { getUserProfile } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const userProfile = await getUserProfile();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and staff can trigger sync
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { property_id } = body;

    const syncService = new ICalSyncService();

    if (property_id) {
      // Sync specific property
      const result = await syncService.syncProperty(property_id, userProfile.tenant_id);
      
      return NextResponse.json({
        success: result.success,
        property_id,
        result
      });
    } else {
      // Sync all properties
      const results = await syncService.syncAllProperties(userProfile.tenant_id);
      
      return NextResponse.json({
        success: Object.values(results).some(r => r.success),
        results
      });
    }
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userProfile = await getUserProfile();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');

    const syncService = new ICalSyncService();
    const syncStatus = await syncService.getSyncStatus(userProfile.tenant_id, propertyId || undefined);

    return NextResponse.json({
      success: true,
      sync_status: syncStatus
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}