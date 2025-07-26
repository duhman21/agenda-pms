import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { createClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth-server'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn()
}))
jest.mock('@/lib/auth-server', () => ({
  getCurrentUser: jest.fn()
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

describe('/api/tasks', () => {
  let mockSupabase: any

  beforeEach(() => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    }
    
    mockSupabase = {
      from: jest.fn().mockReturnValue(mockQueryBuilder),
      ...mockQueryBuilder
    }
    mockCreateClient.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return unauthorized when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tasks')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should fetch tasks for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const
      }
      mockGetCurrentUser.mockResolvedValue(mockUser)

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'pending',
          properties: { id: 'prop-1', name: 'Test Property' }
        }
      ]

      mockSupabase.range.mockResolvedValue({ data: mockTasks, error: null })
      mockSupabase.select.mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost:3000/api/tasks')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual(mockTasks)
      expect(data.pagination).toBeDefined()
    })

    it('should filter tasks for staff users to only assigned tasks', async () => {
      const mockUser = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'staff' as const
      }
      mockGetCurrentUser.mockResolvedValue(mockUser)

      mockSupabase.range.mockResolvedValue({ data: [], error: null })
      mockSupabase.select.mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost:3000/api/tasks')
      await GET(request)

      expect(mockSupabase.eq).toHaveBeenCalledWith('assigned_to', 'user-1')
    })

    it('should apply query filters', async () => {
      const mockUser = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const
      }
      mockGetCurrentUser.mockResolvedValue(mockUser)

      mockSupabase.range.mockResolvedValue({ data: [], error: null })
      mockSupabase.select.mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost:3000/api/tasks?status=pending&property_id=prop-1')
      await GET(request)

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending')
      expect(mockSupabase.eq).toHaveBeenCalledWith('property_id', 'prop-1')
    })
  })

  describe('POST /api/tasks', () => {
    it('should return unauthorized when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Task', property_id: 'prop-1' })
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return forbidden for property owners', async () => {
      const mockUser = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'owner' as const
      }
      mockGetCurrentUser.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Task', property_id: 'prop-1' })
      })
      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('should validate required fields', async () => {
      const mockUser = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const
      }
      mockGetCurrentUser.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ description: 'Missing title and property' })
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing required fields')
    })

    it('should create task successfully', async () => {
      const mockUser = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const
      }
      mockGetCurrentUser.mockResolvedValue(mockUser)

      // Mock property verification
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: 'prop-1' }, 
        error: null 
      })

      // Mock task creation
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        property_id: 'prop-1',
        tenant_id: 'tenant-1'
      }
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockTask, 
        error: null 
      })

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ 
          title: 'Test Task', 
          property_id: 'prop-1',
          description: 'Test description'
        })
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.title).toBe('Test Task')
    })

    it('should return 404 when property not found', async () => {
      const mockUser = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const
      }
      mockGetCurrentUser.mockResolvedValue(mockUser)

      // Mock property not found
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: null 
      })

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ 
          title: 'Test Task', 
          property_id: 'nonexistent-prop'
        })
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Property not found')
    })
  })
})