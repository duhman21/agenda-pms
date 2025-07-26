import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { profile: user } = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const assignedTo = searchParams.get('assigned_to')
    const propertyId = searchParams.get('property_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('tasks')
      .select(`
        *,
        properties!inner(id, name),
        user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', user.tenant_id)
      .order('due_date', { ascending: true })

    // Apply role-based filtering
    if (user.role === 'staff') {
      query = query.eq('assigned_to', user.id)
    }

    // Apply date range filter
    if (startDate) {
      query = query.gte('due_date', startDate)
    }
    if (endDate) {
      // Add one day to end date to include tasks on the end date
      const endDateTime = new Date(endDate)
      endDateTime.setDate(endDateTime.getDate() + 1)
      query = query.lt('due_date', endDateTime.toISOString().split('T')[0])
    }

    // Apply other filters
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }
    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    // Apply limit
    query = query.limit(limit)

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching calendar tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Add overdue flag to tasks
    const tasksWithOverdue = (tasks || []).map(task => ({
      ...task,
      is_overdue: task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date()
    }))

    return NextResponse.json({
      data: tasksWithOverdue,
      total: tasksWithOverdue.length
    })
  } catch (error) {
    console.error('Error in GET /api/tasks/calendar:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}