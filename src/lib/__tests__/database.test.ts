import { testDatabaseConnection, createTenant, createUserProfile } from '../database'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('database utilities', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      })),
      auth: {
        admin: {
          createUser: jest.fn()
        }
      }
    }

    mockCreateClient.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('testDatabaseConnection', () => {
    it('returns true for successful connection', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { version: '1.0' },
        error: null
      })

      const result = await testDatabaseConnection()

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('tenants')
      expect(mockSupabase.from().select).toHaveBeenCalledWith('id')
    })

    it('returns false for failed connection', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' }
      })

      const result = await testDatabaseConnection()

      expect(result).toBe(false)
    })

    it('handles exceptions gracefully', async () => {
      mockSupabase.from().select().single.mockRejectedValue(new Error('Network error'))

      const result = await testDatabaseConnection()

      expect(result).toBe(false)
    })
  })

  describe('createTenant', () => {
    it('creates tenant successfully', async () => {
      const mockTenant = {
        id: 'tenant-1',
        name: 'Test Company',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockTenant,
        error: null
      })

      const result = await createTenant('Test Company')

      expect(result.success).toBe(true)
      expect(result.tenant).toEqual(mockTenant)
      expect(mockSupabase.from).toHaveBeenCalledWith('tenants')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        name: 'Test Company'
      })
    })

    it('handles tenant creation error', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Tenant name already exists' }
      })

      const result = await createTenant('Existing Company')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Tenant name already exists')
      expect(result.tenant).toBeNull()
    })

    it('validates tenant name', async () => {
      const result = await createTenant('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Tenant name is required')
      expect(result.tenant).toBeNull()
    })

    it('handles exceptions during tenant creation', async () => {
      mockSupabase.from().insert().select().single.mockRejectedValue(new Error('Database error'))

      const result = await createTenant('Test Company')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
      expect(result.tenant).toBeNull()
    })
  })

  describe('createUserProfile', () => {
    const mockUserData = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin' as const
    }

    it('creates user profile successfully', async () => {
      const mockProfile = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin',
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockProfile,
        error: null
      })

      const result = await createUserProfile(mockUserData)

      expect(result.success).toBe(true)
      expect(result.profile).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin',
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@example.com'
      })
    })

    it('handles profile creation error', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'User profile already exists' }
      })

      const result = await createUserProfile(mockUserData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User profile already exists')
      expect(result.profile).toBeNull()
    })

    it('validates required fields', async () => {
      const invalidData = {
        ...mockUserData,
        email: '',
        firstName: ''
      }

      const result = await createUserProfile(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email and first name are required')
      expect(result.profile).toBeNull()
    })

    it('validates role', async () => {
      const invalidData = {
        ...mockUserData,
        role: 'invalid' as any
      }

      const result = await createUserProfile(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid role. Must be admin, staff, or owner')
      expect(result.profile).toBeNull()
    })

    it('handles exceptions during profile creation', async () => {
      mockSupabase.from().insert().select().single.mockRejectedValue(new Error('Database error'))

      const result = await createUserProfile(mockUserData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
      expect(result.profile).toBeNull()
    })
  })
})