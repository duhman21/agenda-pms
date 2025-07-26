import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/auth-server');

const mockSupabase = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  in: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  or: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
  insert: jest.fn(),
  single: jest.fn(),
  not: jest.fn()
};

const mockCreateServerSupabaseClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('/api/expenses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerSupabaseClient.mockReturnValue(mockSupabase as any);
  });

  describe('GET', () => {
    it('should return unauthorized when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue({ user: null, profile: null, tenant: null });

      const request = new NextRequest('http://localhost:3000/api/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should fetch expenses for admin user', async () => {
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
        profile: mockProfile, 
        tenant: null 
      });

      const mockExpenses = [
        {
          id: 'expense-1',
          property_id: 'property-1',
          amount: 100.00,
          category: 'Maintenance & Repairs',
          description: 'Test expense',
          receipt_url: null,
          expense_date: '2024-01-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          properties: {
            id: 'property-1',
            name: 'Test Property',
            property_owners: [
              {
                ownership_percentage: 100,
                user_profiles: {
                  id: 'owner-1',
                  first_name: 'Owner',
                  last_name: 'User',
                  email: 'owner@test.com'
                }
              }
            ]
          }
        }
      ];

      // Mock the query chain
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockExpenses, error: null })
      };

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 1, error: null })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'expenses') {
          return mockQuery;
        }
        return mockCountQuery;
      });

      const request = new NextRequest('http://localhost:3000/api/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expenses).toHaveLength(1);
      expect(data.expenses[0].property_name).toBe('Test Property');
      expect(data.expenses[0].owner_expenses).toHaveLength(1);
      expect(data.expenses[0].owner_expenses[0].attributed_expense).toBe(100);
    });

    it('should filter expenses for property owner', async () => {
      const mockProfile = {
        id: 'owner-1',
        tenant_id: 'tenant-1',
        role: 'owner' as const,
        first_name: 'Owner',
        last_name: 'User',
        email: 'owner@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockGetCurrentUser.mockResolvedValue({ 
        user: { id: 'owner-1' } as any, 
        profile: mockProfile, 
        tenant: null 
      });

      const mockOwnedProperties = [{ property_id: 'property-1' }];

      // Mock property ownership query - first call
      const mockOwnershipQuery1 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockOwnedProperties, error: null })
      };

      // Mock property ownership query - second call for count
      const mockOwnershipQuery2 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockOwnedProperties, error: null })
      };

      const mockExpenseQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ count: 0, error: null })
      };

      let ownershipCallCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'property_owners') {
          ownershipCallCount++;
          return ownershipCallCount === 1 ? mockOwnershipQuery1 : mockOwnershipQuery2;
        } else if (table === 'expenses') {
          // Check if it's a count query by looking at the select call
          const query = {
            select: jest.fn().mockImplementation((fields) => {
              if (fields === '*' || (typeof fields === 'object' && fields.count === 'exact')) {
                return mockCountQuery;
              }
              return mockExpenseQuery;
            }),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], error: null })
          };
          return query;
        }
        return mockExpenseQuery;
      });

      const request = new NextRequest('http://localhost:3000/api/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('POST', () => {
    it('should return unauthorized when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue({ user: null, profile: null, tenant: null });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          property_id: 'property-1',
          amount: 100,
          category: 'Maintenance & Repairs',
          expense_date: '2024-01-01'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return forbidden for property owner', async () => {
      const mockProfile = {
        id: 'owner-1',
        tenant_id: 'tenant-1',
        role: 'owner' as const,
        first_name: 'Owner',
        last_name: 'User',
        email: 'owner@test.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockGetCurrentUser.mockResolvedValue({ 
        user: { id: 'owner-1' } as any, 
        profile: mockProfile, 
        tenant: null 
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          property_id: 'property-1',
          amount: 100,
          category: 'Maintenance & Repairs',
          expense_date: '2024-01-01'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should create expense for admin user', async () => {
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
        profile: mockProfile, 
        tenant: null 
      });

      const mockProperty = { id: 'property-1' };
      const mockExpense = {
        id: 'expense-1',
        tenant_id: 'tenant-1',
        property_id: 'property-1',
        amount: 100,
        category: 'Maintenance & Repairs',
        description: 'Test expense',
        expense_date: '2024-01-01',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Mock property verification
      const mockPropertyQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProperty, error: null })
      };

      // Mock expense creation
      const mockExpenseQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExpense, error: null })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'properties') {
          return mockPropertyQuery;
        }
        return mockExpenseQuery;
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          property_id: 'property-1',
          amount: 100,
          category: 'Maintenance & Repairs',
          description: 'Test expense',
          expense_date: '2024-01-01'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.expense.id).toBe('expense-1');
      expect(mockExpenseQuery.insert).toHaveBeenCalledWith({
        tenant_id: 'tenant-1',
        property_id: 'property-1',
        amount: 100,
        category: 'Maintenance & Repairs',
        description: 'Test expense',
        receipt_url: undefined,
        expense_date: '2024-01-01'
      });
    });

    it('should validate required fields', async () => {
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
        profile: mockProfile, 
        tenant: null 
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amount: 100
          // Missing required fields
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: property_id, amount, category, expense_date');
    });

    it('should validate amount is greater than 0', async () => {
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
        profile: mockProfile, 
        tenant: null 
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          property_id: 'property-1',
          amount: -10,
          category: 'Maintenance & Repairs',
          expense_date: '2024-01-01'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Amount must be greater than 0');
    });
  });
});