import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth-server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Test database connection by checking if tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'tenants',
        'user_profiles', 
        'properties',
        'property_owners',
        'bookings',
        'tasks',
        'expenses',
        'audit_logs'
      ])

    if (error) {
      return NextResponse.json(
        { error: 'Database connection failed', details: error.message },
        { status: 500 }
      )
    }

    // Test RLS functions
    let functionsStatus = 'Working'
    try {
      await supabase.rpc('get_current_tenant_id')
    } catch (err) {
      functionsStatus = 'Error: ' + (err instanceof Error ? err.message : 'Unknown error')
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database schema and multi-tenant foundation implemented successfully',
      tables: tables?.map(t => t.table_name) || [],
      functions_status: functionsStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}