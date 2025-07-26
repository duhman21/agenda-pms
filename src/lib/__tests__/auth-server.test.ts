import { getCurrentUser, createServerSupabaseClient } from '../auth-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

// Mock Supabase SSR
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn()
}))

const mockCookies = cookies as jest.MockedFunction<typeof cookies>
const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>

describe('auth-server', () => {
  let mockSupabase: any
  let mockCookieStore: any

  beforeEach(() => {
    mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
    
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
        getUser: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      }))
    }

    mockCookies.mockReturnValue(mockCookieStore)
    mockCreateServerClient.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createServerSupabaseClient', () => {
    it('creates Supabase client with cookie handling', async () => {
      await createServerSupabaseClient()

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
            remove: expect.any(Function)
          })
        })
      )
    })

    it('handles cookie operations correctly', async () => {
      await createServerSupabaseClient()

      const cookieOptions = mockCreateServerClient.mock.calls[0][2].cookies

      // Test get operation
      mockCookieStore.get.mockReturnValue({ value: 'test-value' })
      const getValue = cookieOptions.get('test-cookie')
      expect(getValue).toBe('test-value')
      expect(mockCookieStore.get).toHaveBeenCalledWith('test-cookie')

      // Test set operation
      cookieOptions.set('test-cookie', 'new-value', { maxAge: 3600 })
      expect(mockCookieStore.set).toHaveBeenCalledWith('test-cookie', 'new-value', { maxAge: 3600 })

      // Test remove operation
      cookieOptions.remove('test-cookie', {})
      expect(mockCookieStore.remove).toHaveBeenCalledWith('test-cookie', {})
    })
  })

  describe('getCurrentUser', () => {
    it('returns user and profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe'
        }
      }

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

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null
      })

      const result = await getCurrentUser()

      expect(result.user).toEqual(mockUser)
      expect(result.profile).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*')
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('id', 'user-1')
    })

    it('returns null for unauthenticated user', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await getCurrentUser()

      expect(result.user).toBeNull()
      expect(result.profile).toBeNull()
    })

    it('handles session error', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' }
      })

      const result = await getCurrentUser()

      expect(result.user).toBeNull()
      expect(result.profile).toBeNull()
    })

    it('handles profile fetch error', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com'
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' }
      })

      const result = await getCurrentUser()

      expect(result.user).toEqual(mockUser)
      expect(result.profile).toBeNull()
    })

    it('returns user without profile if profile does not exist', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com'
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await getCurrentUser()

      expect(result.user).toEqual(mockUser)
      expect(result.profile).toBeNull()
    })
  })
})