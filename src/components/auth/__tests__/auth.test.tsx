import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'
import { TenantSignupForm } from '../TenantSignupForm'
import { RoleGuard } from '../RoleGuard'
import { TenantProvider, useTenant } from '../TenantProvider'
import { UserManagement } from '../UserManagement'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn()
  })
}))

// Mock Supabase auth
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis()
  }))
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}))

// Test component for TenantProvider
function TestTenantComponent() {
  const { tenant, user, loading } = useTenant()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <div data-testid="tenant-name">{tenant?.name || 'No tenant'}</div>
      <div data-testid="user-email">{user?.email || 'No user'}</div>
    </div>
  )
}

describe('Authentication Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('LoginForm', () => {
    it('renders login form with email and password fields', () => {
      render(<LoginForm />)
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })

    it('submits form with valid credentials', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null
      })
      
      render(<LoginForm />)
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('displays error message on login failure', async () => {
      const user = userEvent.setup()
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' }
      })
      
      render(<LoginForm />)
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })
  })

  describe('TenantSignupForm', () => {
    it('renders signup form with all required fields', () => {
      render(<TenantSignupForm />)
      
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('validates password confirmation', async () => {
      const user = userEvent.setup()
      render(<TenantSignupForm />)
      
      await user.type(screen.getByLabelText(/^password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'different')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    it('validates password strength', async () => {
      const user = userEvent.setup()
      render(<TenantSignupForm />)
      
      await user.type(screen.getByLabelText(/^password/i), '123')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })

    it('creates tenant and user account successfully', async () => {
      const user = userEvent.setup()
      
      // Mock successful signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: '1', email: 'admin@company.com' } },
        error: null
      })
      
      // Mock tenant creation
      mockSupabase.from().insert().mockResolvedValue({
        data: { id: 'tenant-1', name: 'Test Company' },
        error: null
      })
      
      render(<TenantSignupForm />)
      
      await user.type(screen.getByLabelText(/company name/i), 'Test Company')
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email/i), 'admin@company.com')
      await user.type(screen.getByLabelText(/^password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'admin@company.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            role: 'admin'
          }
        }
      })
    })
  })

  describe('RoleGuard', () => {
    const mockUser = {
      id: '1',
      tenant_id: 'tenant-1',
      role: 'admin' as const,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('renders children for users with required role', () => {
      render(
        <RoleGuard allowedRoles={['admin']} user={mockUser}>
          <div>Admin Content</div>
        </RoleGuard>
      )
      
      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })

    it('renders fallback for users without required role', () => {
      const staffUser = { ...mockUser, role: 'staff' as const }
      
      render(
        <RoleGuard 
          allowedRoles={['admin']} 
          user={staffUser}
          fallback={<div>Access Denied</div>}
        >
          <div>Admin Content</div>
        </RoleGuard>
      )
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('renders default unauthorized message when no fallback provided', () => {
      const ownerUser = { ...mockUser, role: 'owner' as const }
      
      render(
        <RoleGuard allowedRoles={['admin', 'staff']} user={ownerUser}>
          <div>Staff Content</div>
        </RoleGuard>
      )
      
      expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument()
    })

    it('allows multiple roles', () => {
      const staffUser = { ...mockUser, role: 'staff' as const }
      
      render(
        <RoleGuard allowedRoles={['admin', 'staff']} user={staffUser}>
          <div>Staff Content</div>
        </RoleGuard>
      )
      
      expect(screen.getByText('Staff Content')).toBeInTheDocument()
    })
  })

  describe('TenantProvider', () => {
    it('provides tenant context to children', async () => {
      const mockTenant = { id: 'tenant-1', name: 'Test Company' }
      const mockUser = { id: '1', email: 'test@example.com' }
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockTenant,
        error: null
      })
      
      render(
        <TenantProvider>
          <TestTenantComponent />
        </TenantProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('tenant-name')).toHaveTextContent('Test Company')
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })
    })

    it('shows loading state initially', () => {
      mockSupabase.auth.getSession.mockImplementation(() => new Promise(() => {}))
      
      render(
        <TenantProvider>
          <TestTenantComponent />
        </TenantProvider>
      )
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('handles no session gracefully', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })
      
      render(
        <TenantProvider>
          <TestTenantComponent />
        </TenantProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('tenant-name')).toHaveTextContent('No tenant')
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      })
    })
  })

  describe('UserManagement', () => {
    const mockUsers = [
      {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role: 'admin'
      },
      {
        id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        role: 'staff'
      }
    ]

    it('displays list of users', async () => {
      mockSupabase.from().select().eq.mockResolvedValue({
        data: mockUsers,
        error: null
      })
      
      render(<UserManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('john@example.com')).toBeInTheDocument()
        expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      })
    })

    it('allows creating new users', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().eq.mockResolvedValue({
        data: [],
        error: null
      })
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: '3' } },
        error: null
      })
      
      render(<UserManagement />)
      
      const addButton = screen.getByRole('button', { name: /add user/i })
      await user.click(addButton)
      
      // Fill out the form
      await user.type(screen.getByLabelText(/first name/i), 'Bob')
      await user.type(screen.getByLabelText(/last name/i), 'Wilson')
      await user.type(screen.getByLabelText(/email/i), 'bob@example.com')
      await user.selectOptions(screen.getByLabelText(/role/i), 'staff')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      await user.click(screen.getByRole('button', { name: /create user/i }))
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'bob@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Bob',
            last_name: 'Wilson',
            role: 'staff'
          }
        }
      })
    })

    it('filters users by role', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().eq.mockResolvedValue({
        data: mockUsers,
        error: null
      })
      
      render(<UserManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
      
      const roleFilter = screen.getByLabelText(/filter by role/i)
      await user.selectOptions(roleFilter, 'admin')
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })
})