import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('tasks')
      .select(`
        *,
        properties!inner(id, name),
        user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .eq('id', params.id)
      .eq('tenant_id', user.tenant_id)

    // Staff can only see tasks assigned to them
    if (user.role === 'staff') {
      query = query.eq('assigned_to', user.id)
    }

    const { data: task, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      console.error('Error fetching task:', error)
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { assigned_to, title, description, due_date, status } = body

    // First, get the existing task to check permissions
    let taskQuery = supabase
      .from('tasks')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', user.tenant_id)

    // Staff can only update tasks assigned to them
    if (user.role === 'staff') {
      taskQuery = taskQuery.eq('assigned_to', user.id)
    }

    const { data: existingTask, error: fetchError } = await taskQuery.single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      console.error('Error fetching task:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
    }

    // Owners cannot update tasks
    if (user.role === 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If assigned_to is being changed, verify new assignee belongs to tenant
    if (assigned_to && assigned_to !== existingTask.assigned_to) {
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

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (due_date !== undefined) updateData.due_date = due_date ? new Date(due_date).toISOString() : null
    if (status !== undefined) {
      updateData.status = status
      // Set completed_at timestamp when task is completed
      if (status === 'completed' && existingTask.status !== 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (status !== 'completed') {
        updateData.completed_at = null
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', params.id)
      .eq('tenant_id', user.tenant_id)
      .select(`
        *,
        properties!inner(id, name),
        user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error in PUT /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete tasks
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', user.tenant_id)

    if (error) {
      console.error('Error deleting task:', error)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}