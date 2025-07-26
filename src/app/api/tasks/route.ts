import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignedTo = searchParams.get('assigned_to')
    const propertyId = searchParams.get('property_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    let query = supabase
      .from('tasks')
      .select(`
        *,
        properties!inner(id, name),
        user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (user.role === 'staff') {
      query = query.eq('assigned_to', user.id)
    }

    // Apply filters
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }
    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)

    // Apply pagination
    const { data: tasks, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({
      data: tasks,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error in GET /api/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and staff can create tasks
    if (user.role === 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { property_id, assigned_to, title, description, due_date } = body

    // Validate required fields
    if (!property_id || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields: property_id, title' 
      }, { status: 400 })
    }

    // Verify property belongs to tenant
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('tenant_id', user.tenant_id)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // If assigned_to is provided, verify user belongs to tenant
    if (assigned_to) {
      const { data: assignee } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', assigned_to)
        .eq('tenant_id', user.tenant_id)
        .single()

      if (!assignee) {
        return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        tenant_id: user.tenant_id,
        property_id,
        assigned_to,
        title,
        description,
        due_date: due_date ? new Date(due_date).toISOString() : null,
        status: 'pending',
        auto_generated: false
      })
      .select(`
        *,
        properties!inner(id, name),
        user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}