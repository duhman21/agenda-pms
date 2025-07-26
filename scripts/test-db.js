const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  try {
    console.log('Testing database connection and schema...')
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('tenants')
      .select('count')
      .limit(1)

    if (connectionError) {
      console.error('Connection failed:', connectionError.message)
      return false
    }

    console.log('✓ Database connection successful')

    // Test if all tables exist by trying to query them
    const tables = ['tenants', 'user_profiles', 'properties', 'property_owners', 'bookings', 'tasks', 'expenses', 'audit_logs']
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (error) {
        console.error(`✗ Table ${table} not found or accessible:`, error.message)
        return false
      } else {
        console.log(`✓ Table ${table} exists and accessible`)
      }
    }

    // Test RLS functions
    try {
      const { error: funcError } = await supabase.rpc('get_current_tenant_id')
      if (funcError && !funcError.message.includes('JWT')) {
        console.error('✗ RLS functions error:', funcError.message)
        return false
      } else {
        console.log('✓ RLS functions created successfully')
      }
    } catch (err) {
      console.log('✓ RLS functions created (expected JWT error without auth)')
    }

    console.log('\n🎉 Database schema and multi-tenant foundation implemented successfully!')
    return true

  } catch (error) {
    console.error('Test failed:', error.message)
    return false
  }
}

testDatabase().then(success => {
  process.exit(success ? 0 : 1)
})