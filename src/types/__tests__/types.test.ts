import type { 
  UserProfile, 
  Property, 
  Booking, 
  Task, 
  Expense, 
  PropertyOwner,
  Tenant,
  UserRole,
  TaskStatus,
  ReportType
} from '../index'

describe('Type Definitions', () => {
  describe('UserProfile', () => {
    it('should have correct structure', () => {
      const userProfile: UserProfile = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        role: 'admin',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(userProfile.id).toBe('user-1')
      expect(userProfile.role).toBe('admin')
      expect(userProfile.email).toBe('john@example.com')
    })

    it('should support all user roles', () => {
      const adminUser: UserProfile = {
        id: 'admin-1',
        tenant_id: 'tenant-1',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const staffUser: UserProfile = {
        id: 'staff-1',
        tenant_id: 'tenant-1',
        role: 'staff',
        first_name: 'Staff',
        last_name: 'User',
        email: 'staff@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const ownerUser: UserProfile = {
        id: 'owner-1',
        tenant_id: 'tenant-1',
        role: 'owner',
        first_name: 'Owner',
        last_name: 'User',
        email: 'owner@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(adminUser.role).toBe('admin')
      expect(staffUser.role).toBe('staff')
      expect(ownerUser.role).toBe('owner')
    })
  })

  describe('Property', () => {
    it('should have correct structure', () => {
      const property: Property = {
        id: 'prop-1',
        tenant_id: 'tenant-1',
        name: 'Sunset Villa',
        address: '123 Beach Road',
        description: 'Beautiful beachfront property',
        ical_import_url: 'https://example.com/calendar.ics',
        ical_export_token: 'export-token-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(property.id).toBe('prop-1')
      expect(property.name).toBe('Sunset Villa')
      expect(property.ical_import_url).toBe('https://example.com/calendar.ics')
    })

    it('should allow optional fields to be null', () => {
      const property: Property = {
        id: 'prop-1',
        tenant_id: 'tenant-1',
        name: 'Basic Property',
        address: '123 Street',
        description: null,
        ical_import_url: null,
        ical_export_token: 'token-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(property.description).toBeNull()
      expect(property.ical_import_url).toBeNull()
    })
  })

  describe('Booking', () => {
    it('should have correct structure', () => {
      const booking: Booking = {
        id: 'booking-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        guest_name: 'John Doe',
        check_in: '2024-01-01',
        check_out: '2024-01-03',
        revenue: 250.00,
        source: 'airbnb',
        ical_uid: 'booking-123@airbnb.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(booking.id).toBe('booking-1')
      expect(booking.guest_name).toBe('John Doe')
      expect(booking.revenue).toBe(250.00)
      expect(booking.source).toBe('airbnb')
    })

    it('should allow optional fields to be null', () => {
      const booking: Booking = {
        id: 'booking-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        guest_name: 'John Doe',
        check_in: '2024-01-01',
        check_out: '2024-01-03',
        revenue: null,
        source: 'manual',
        ical_uid: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(booking.revenue).toBeNull()
      expect(booking.ical_uid).toBeNull()
    })
  })

  describe('Task', () => {
    it('should have correct structure', () => {
      const task: Task = {
        id: 'task-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        assigned_to: 'user-1',
        title: 'Clean property',
        description: 'Deep clean after checkout',
        due_date: '2024-01-15T10:00:00Z',
        status: 'pending',
        auto_generated: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(task.id).toBe('task-1')
      expect(task.title).toBe('Clean property')
      expect(task.status).toBe('pending')
      expect(task.auto_generated).toBe(true)
    })

    it('should support all task statuses', () => {
      const pendingTask: Task = {
        id: 'task-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        assigned_to: 'user-1',
        title: 'Pending Task',
        description: null,
        due_date: null,
        status: 'pending',
        auto_generated: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const inProgressTask: Task = {
        ...pendingTask,
        id: 'task-2',
        status: 'in_progress'
      }

      const completedTask: Task = {
        ...pendingTask,
        id: 'task-3',
        status: 'completed'
      }

      expect(pendingTask.status).toBe('pending')
      expect(inProgressTask.status).toBe('in_progress')
      expect(completedTask.status).toBe('completed')
    })

    it('should allow unassigned tasks', () => {
      const unassignedTask: Task = {
        id: 'task-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        assigned_to: null,
        title: 'Unassigned Task',
        description: null,
        due_date: null,
        status: 'pending',
        auto_generated: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(unassignedTask.assigned_to).toBeNull()
    })
  })

  describe('Expense', () => {
    it('should have correct structure', () => {
      const expense: Expense = {
        id: 'expense-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        amount: 150.00,
        category: 'Maintenance & Repairs',
        description: 'Plumbing repair',
        receipt_url: 'https://example.com/receipt.pdf',
        expense_date: '2024-01-15',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(expense.id).toBe('expense-1')
      expect(expense.amount).toBe(150.00)
      expect(expense.category).toBe('Maintenance & Repairs')
    })

    it('should allow optional fields to be null', () => {
      const expense: Expense = {
        id: 'expense-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        amount: 50.00,
        category: 'Cleaning',
        description: null,
        receipt_url: null,
        expense_date: '2024-01-15',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(expense.description).toBeNull()
      expect(expense.receipt_url).toBeNull()
    })
  })

  describe('PropertyOwner', () => {
    it('should have correct structure', () => {
      const propertyOwner: PropertyOwner = {
        id: 'po-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        owner_id: 'owner-1',
        ownership_percentage: 75.5,
        created_at: '2024-01-01T00:00:00Z'
      }

      expect(propertyOwner.id).toBe('po-1')
      expect(propertyOwner.ownership_percentage).toBe(75.5)
    })

    it('should support full ownership', () => {
      const fullOwner: PropertyOwner = {
        id: 'po-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        owner_id: 'owner-1',
        ownership_percentage: 100.0,
        created_at: '2024-01-01T00:00:00Z'
      }

      expect(fullOwner.ownership_percentage).toBe(100.0)
    })
  })

  describe('Tenant', () => {
    it('should have correct structure', () => {
      const tenant: Tenant = {
        id: 'tenant-1',
        name: 'Acme Property Management',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(tenant.id).toBe('tenant-1')
      expect(tenant.name).toBe('Acme Property Management')
    })
  })

  describe('Enums', () => {
    it('should define UserRole correctly', () => {
      const adminRole: UserRole = 'admin'
      const staffRole: UserRole = 'staff'
      const ownerRole: UserRole = 'owner'

      expect(adminRole).toBe('admin')
      expect(staffRole).toBe('staff')
      expect(ownerRole).toBe('owner')
    })

    it('should define TaskStatus correctly', () => {
      const pendingStatus: TaskStatus = 'pending'
      const inProgressStatus: TaskStatus = 'in_progress'
      const completedStatus: TaskStatus = 'completed'

      expect(pendingStatus).toBe('pending')
      expect(inProgressStatus).toBe('in_progress')
      expect(completedStatus).toBe('completed')
    })

    it('should define ReportType correctly', () => {
      const monthlyReport: ReportType = 'monthly'
      const customReport: ReportType = 'custom'

      expect(monthlyReport).toBe('monthly')
      expect(customReport).toBe('custom')
    })
  })

  describe('Type Guards and Validation', () => {
    it('should validate user roles', () => {
      const validRoles: UserRole[] = ['admin', 'staff', 'owner']
      const testRole = 'admin' as UserRole

      expect(validRoles).toContain(testRole)
    })

    it('should validate task statuses', () => {
      const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed']
      const testStatus = 'pending' as TaskStatus

      expect(validStatuses).toContain(testStatus)
    })

    it('should validate report types', () => {
      const validTypes: ReportType[] = ['monthly', 'custom']
      const testType = 'monthly' as ReportType

      expect(validTypes).toContain(testType)
    })
  })

  describe('Complex Type Relationships', () => {
    it('should support property with owners relationship', () => {
      interface PropertyWithOwners extends Property {
        property_owners: (PropertyOwner & {
          user_profiles: UserProfile
        })[]
      }

      const propertyWithOwners: PropertyWithOwners = {
        id: 'prop-1',
        tenant_id: 'tenant-1',
        name: 'Test Property',
        address: '123 Test St',
        description: 'Test description',
        ical_import_url: null,
        ical_export_token: 'token-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        property_owners: [
          {
            id: 'po-1',
            tenant_id: 'tenant-1',
            property_id: 'prop-1',
            owner_id: 'owner-1',
            ownership_percentage: 100,
            created_at: '2024-01-01T00:00:00Z',
            user_profiles: {
              id: 'owner-1',
              tenant_id: 'tenant-1',
              role: 'owner',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          }
        ]
      }

      expect(propertyWithOwners.property_owners).toHaveLength(1)
      expect(propertyWithOwners.property_owners[0].user_profiles.role).toBe('owner')
    })

    it('should support task with property and user relationships', () => {
      interface TaskWithRelations extends Task {
        properties: Property
        user_profiles?: UserProfile
      }

      const taskWithRelations: TaskWithRelations = {
        id: 'task-1',
        tenant_id: 'tenant-1',
        property_id: 'prop-1',
        assigned_to: 'user-1',
        title: 'Test Task',
        description: 'Test description',
        due_date: '2024-01-15T10:00:00Z',
        status: 'pending',
        auto_generated: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        properties: {
          id: 'prop-1',
          tenant_id: 'tenant-1',
          name: 'Test Property',
          address: '123 Test St',
          description: 'Test description',
          ical_import_url: null,
          ical_export_token: 'token-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        user_profiles: {
          id: 'user-1',
          tenant_id: 'tenant-1',
          role: 'staff',
          first_name: 'Staff',
          last_name: 'User',
          email: 'staff@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      }

      expect(taskWithRelations.properties.name).toBe('Test Property')
      expect(taskWithRelations.user_profiles?.role).toBe('staff')
    })
  })
})