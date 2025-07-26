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

    const now = new Date().toISOString()

    let query = supabase
      .from('tasks')
      .select(`
        *,
        properties!inner(id, name),
        user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', user.tenant_id)
      .lt('due_date', now)
      .neq('status', 'completed')
      .order('due_date', { ascending: true })

    // Apply role-based filtering
    if (user.role === 'staff') {
      query = query.eq('assigned_to', user.id)
    }

    const { data: overdueTasks, error } = await query

    if (error) {
      console.error('Error fetching overdue tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch overdue tasks' }, { status: 500 })
    }

    // Calculate how overdue each task is
    const tasksWithOverdueInfo = (overdueTasks || []).map(task => {
      const dueDate = new Date(task.due_date)
      const nowDate = new Date()
      const hoursOverdue = Math.floor((nowDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60))
      const daysOverdue = Math.floor(hoursOverdue / 24)
      
      return {
        ...task,
        hours_overdue: hoursOverdue,
        days_overdue: daysOverdue,
        overdue_severity: daysOverdue >= 7 ? 'critical' : daysOverdue >= 3 ? 'high' : daysOverdue >= 1 ? 'medium' : 'low'
      }
    })

    return NextResponse.json({
      data: tasksWithOverdueInfo,
      total: tasksWithOverdueInfo.length,
      summary: {
        critical: tasksWithOverdueInfo.filter(t => t.overdue_severity === 'critical').length,
        high: tasksWithOverdueInfo.filter(t => t.overdue_severity === 'high').length,
        medium: tasksWithOverdueInfo.filter(t => t.overdue_severity === 'medium').length,
        low: tasksWithOverdueInfo.filter(t => t.overdue_severity === 'low').length
      }
    })
  } catch (error) {
    console.error('Error in GET /api/tasks/overdue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}