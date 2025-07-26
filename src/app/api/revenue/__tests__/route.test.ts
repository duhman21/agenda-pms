import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getCurrentUser } from '@/lib/auth-server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/lib/auth-server');
jest.mock('@/lib/supabase');

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockCreateServerSupabaseClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>;

describe('/api/revenue', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Create a proper mock chain
    const createMockChain = () => ({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    });

    mockSupabase = createMockChain();
    mockCreateServerSupabaseClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/revenue', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockGetCurrentUser.mockResolvedValue({ user: null, profile: null });

      const request = new NextRequest('http://localhost:3000/api/revenue');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should fetch revenue data for authenticated admin user', async () => {
      const mockProfile = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockGetCurrentUser.mockResolvedValue({ 
        user: { id: 'user-1' } as any, 
        profile: mockProfile 
      });

      const mockRevenueData = [
        {
          id: 'booking-1',
          property_id: 'prop-1',
          guest_name: 'John Doe',
          check_in: '2024-01-01',
          check_out: '2024-01-03',
          revenue: 200,
          source: 'airbnb',
          created_at: '2024-01-01T00:00:00Z',
          properties: {
            id: 'prop-1',
            name: 'Test Property',
            property_owners: [
              {
                ownership_percentage: 100,
                user_profiles: {
                  id: 'owner-1',
                  first_name: 'Owner',
                  last_name: 'One',
                  email: 'owner@test.com'
                }
              }
            ]
          }
        }
      ];

      mockSupabase.select.mockResolvedValue({ data: mockRevenueData, error: null });
      mockSupabase.select.mockResolvedValueOnce({ count: 1, error: null });

      const request = new NextRequest('http://localhost:3000/api/revenue');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.revenue).toHaveLength(1);
      expect(data.revenue[0].total_revenue).toBe(200);
      expect(data.revenue[0].owner_revenue).toHaveLength(1);
      expect(data.revenue[0].owner_revenue[0].attributed_revenue).toBe(200);
    });

    it('should filter revenue data for property owner users', async () => {
      const mockProfile = {
        id: 'owner-1',
        tenant_id: 'tenant-1',
        role: 'owner' as const,
        first_name: 'Property',
        last_name: 'Owner',
        email: 'owner@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockGetCurrentUser.mockResolvedValue({ 
        user: { id: 'owner-1' } as any, 
        profile: mockProfile 
      });

      // Mock owned properties query
      mockSupabase.select.mockResolvedValueOnce({ 
        data: [{ property_id: 'prop-1' }], 
        error: null 
      });

      // Mock revenue data query
      mockSupabase.select.mockResolvedValueOnce({ 
        data: [], 
        error: null 
      });

      const request = new NextRequest('http://localhost:3000/api/revenue');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.in).toHaveBeenCalledWith('property_id', ['prop-1']);
    });
  });

  describe('POST /api/revenue', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockGetCurrentUser.mockResolvedValue({ user: null, profile: null });

      const request = new NextRequest('http://localhost:3000/api/revenue', {
        method: 'POST',
        body: JSON.stringify({ revenue: 100 })
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 for property owner users', async () => {
      const mockProfile = {
        id: 'owner-1',
        tenant_id: 'tenant-1',
        role: 'owner' as const,
        first_name: 'Property',
        last_name: 'Owner',
        email: 'owner@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockGetCurrentUser.mockResolvedValue({ 
        user: { id: 'owner-1' } as any, 
        profile: mockProfile 
      });

      const request = new NextRequest('http://localhost:3000/api/revenue', {
        method: 'POST',
        body: JSON.stringify({ revenue: 100 })
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should update existing booking revenue', async () => {
      const mockProfile = {
        id: 'admin-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockGetCurrentUser.mockResolvedValue({ 
        user: { id: 'admin-1' } as any, 
        profile: mockProfile 
      });

      const mockBooking = {
        id: 'booking-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        revenue: 150
      };

      mockSupabase.update.mockResolvedValue({ data: mockBooking, error: null });

      const request = new NextRequest('http://localhost:3000/api/revenue', {
        method: 'POST',
        body: JSON.stringify({
          booking_id: 'booking-1',
          revenue: 150
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.booking.revenue).toBe(150);
    });

    it('should create new booking with revenue', async () => {
      const mockProfile = {
        id: 'admin-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockGetCurrentUser.mockResolvedValue({ 
        user: { id: 'admin-1' } as any, 
        profile: mockProfile 
      });

      // Mock property verification
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: 'prop-1' }, 
        error: null 
      });

      // Mock booking creation
      const mockBooking = {
        id: 'booking-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        guest_name: 'John Doe',
        check_in: '2024-01-01',
        check_out: '2024-01-03',
        revenue: 200,
        source: 'manual'
      };

      mockSupabase.insert.mockResolvedValue({ data: mockBooking, error: null });

      const request = new NextRequest('http://localhost:3000/api/revenue', {
        method: 'POST',
        body: JSON.stringify({
          property_id: 'prop-1',
          guest_name: 'John Doe',
          check_in: '2024-01-01',
          check_out: '2024-01-03',
          revenue: 200,
          source: 'manual'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.booking.revenue).toBe(200);
    });

    it('should validate revenue amount', async () => {
      const mockProfile = {
        id: 'admin-1',
        tenant_id: 'tenant-1',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockGetCurrentUser.mockResolvedValue({ 
        user: { id: 'admin-1' } as any, 
        profile: mockProfile 
      });

      const request = new NextRequest('http://localhost:3000/api/revenue', {
        method: 'POST',
        body: JSON.stringify({
          revenue: 0
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Revenue amount is required and must be greater than 0');
    });
  });
});