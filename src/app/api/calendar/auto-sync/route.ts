import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { ICalSyncService } from '@/lib/ical-sync';

// This endpoint is designed to be called by a cron job or background service
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authorized source (e.g., cron job)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-cron-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const syncService = new ICalSyncService();

    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id');

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    const results: Record<string, any> = {};
    let totalSynced = 0;
    let totalErrors = 0;

    // Process each tenant
    for (const tenant of tenants || []) {
      try {
        // Get properties that need sync for this tenant
        const propertiesNeedingSync = await syncService.getPropertiesNeedingSync(tenant.id);
        
        if (propertiesNeedingSync.length === 0) {
          results[tenant.id] = { message: 'No properties need sync' };
          continue;
        }

        const tenantResults: Record<string, any> = {};

        // Sync each property
        for (const propertyId of propertiesNeedingSync) {
          try {
            const syncResult = await syncService.syncProperty(propertyId, tenant.id);
            tenantResults[propertyId] = syncResult;
            
            if (syncResult.success) {
              totalSynced++;
            } else {
              totalErrors++;
            }
          } catch (error) {
            tenantResults[propertyId] = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
            totalErrors++;
          }
        }

        results[tenant.id] = tenantResults;
      } catch (error) {
        results[tenant.id] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        totalErrors++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_synced: totalSynced,
        total_errors: totalErrors,
        processed_tenants: Object.keys(results).length
      },
      results
    });

  } catch (error) {
    console.error('Auto-sync error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ical-auto-sync'
  });
}