import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskList } from '../TaskList'
import { TaskForm } from '../TaskForm'
import { TaskCalendar } from '../TaskCalendar'
import { OverdueTaskNotifications } from '../OverdueTaskNotifications'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })
}))

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis()
  }))
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}))

const mockTasks = [
  {
    id: 'task-1',
    title: 'Clean property after checkout',
    description: 'Deep clean the entire property',
    status: 'pending',
    due_date: '2024-01-15T10:00:00Z',
    auto_generated: true,
    assigned_to: 'staff-1',
    property_id: 'prop-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    properties: {
      id: 'prop-1',
      name: 'Sunset Villa'
    },
    user_profiles: {
      id: 'staff-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com'
    }
  },
  {
    id: 'task-2',
    title: 'Maintenance check',
    description: 'Check HVAC system',
    status: 'in_progress',
    due_date: '2024-01-20T14:00:00Z',
    auto_generated: false,
    assigned_to: 'staff-2',
    property_id: 'prop-2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    properties: {
      id: 'prop-2',
      name: 'Mountain Cabin'
    },
    user_profiles: {
      id: 'staff-2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com'
    }
  }
]

const mockProperties = [
  { id: 'prop-1', name: 'Sunset Villa' },
  { id: 'prop-2', name: 'Mountain Cabin' }
]

const mockStaff = [
  { id: 'staff-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
  { id: 'staff-2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
]

describe('Task Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('TaskList', () => {
    it('displays list of tasks', async () => {
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 2,
        error: null
      })
      
      render(<TaskList />)
      
      await waitFor(() => {
        expect(screen.getByText('Clean property after checkout')).toBeInTheDocument()
        expect(screen.getByText('Maintenance check')).toBeInTheDocument()
        expect(screen.getByText('Sunset Villa')).toBeInTheDocument()
        expect(screen.getByText('Mountain Cabin')).toBeInTheDocument()
      })
    })

    it('shows task status badges', async () => {
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 2,
        error: null
      })
      
      render(<TaskList />)
      
      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
        expect(screen.getByText('In Progress')).toBeInTheDocument()
      })
    })

    it('shows assigned staff information', async () => {
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 2,
        error: null
      })
      
      render(<TaskList />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
    })

    it('allows filtering by status', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 2,
        error: null
      })
      
      render(<TaskList />)
      
      await waitFor(() => {
        expect(screen.getByText('Clean property after checkout')).toBeInTheDocument()
        expect(screen.getByText('Maintenance check')).toBeInTheDocument()
      })
      
      const statusFilter = screen.getByLabelText(/filter by status/i)
      await user.selectOptions(statusFilter, 'pending')
      
      // Should filter to only pending tasks
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('allows filtering by property', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 2,
        error: null
      })
      
      render(<TaskList />)
      
      await waitFor(() => {
        expect(screen.getByText('Clean property after checkout')).toBeInTheDocument()
      })
      
      const propertyFilter = screen.getByLabelText(/filter by property/i)
      await user.selectOptions(propertyFilter, 'prop-1')
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('property_id', 'prop-1')
    })

    it('allows marking tasks as complete', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 2,
        error: null
      })
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { ...mockTasks[0], status: 'completed' },
        error: null
      })
      
      render(<TaskList />)
      
      await waitFor(() => {
        expect(screen.getByText('Clean property after checkout')).toBeInTheDocument()
      })
      
      const completeButtons = screen.getAllByRole('button', { name: /mark complete/i })
      await user.click(completeButtons[0])
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        status: 'completed',
        updated_at: expect.any(String)
      })
      expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', 'task-1')
    })

    it('shows overdue tasks with warning styling', async () => {
      const overdueTask = {
        ...mockTasks[0],
        due_date: '2023-12-01T10:00:00Z' // Past date
      }
      
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: [overdueTask],
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 1,
        error: null
      })
      
      render(<TaskList />)
      
      await waitFor(() => {
        const taskElement = screen.getByText('Clean property after checkout').closest('[data-testid="task-item"]')
        expect(taskElement).toHaveClass('overdue')
      })
    })
  })

  describe('TaskForm', () => {
    it('renders form fields for creating new task', () => {
      render(<TaskForm properties={mockProperties} staff={mockStaff} />)
      
      expect(screen.getByLabelText(/task title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/assign to/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<TaskForm properties={mockProperties} staff={mockStaff} />)
      
      const submitButton = screen.getByRole('button', { name: /create task/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/task title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/property is required/i)).toBeInTheDocument()
      expect(screen.getByText(/due date is required/i)).toBeInTheDocument()
    })

    it('creates new task successfully', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'new-task',
          title: 'New Task',
          description: 'Task description',
          property_id: 'prop-1',
          assigned_to: 'staff-1',
          due_date: '2024-01-25T10:00:00Z',
          status: 'pending'
        },
        error: null
      })
      
      render(<TaskForm properties={mockProperties} staff={mockStaff} onSuccess={mockOnSuccess} />)
      
      await user.type(screen.getByLabelText(/task title/i), 'New Task')
      await user.type(screen.getByLabelText(/description/i), 'Task description')
      await user.selectOptions(screen.getByLabelText(/property/i), 'prop-1')
      await user.selectOptions(screen.getByLabelText(/assign to/i), 'staff-1')
      await user.type(screen.getByLabelText(/due date/i), '2024-01-25T10:00')
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      await waitFor(() => {
        expect(mockSupabase.from().insert).toHaveBeenCalledWith({
          title: 'New Task',
          description: 'Task description',
          property_id: 'prop-1',
          assigned_to: 'staff-1',
          due_date: '2024-01-25T10:00:00.000Z',
          status: 'pending',
          auto_generated: false
        })
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('updates existing task', async () => {
      const user = userEvent.setup()
      const existingTask = mockTasks[0]
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { ...existingTask, title: 'Updated Task' },
        error: null
      })
      
      render(<TaskForm properties={mockProperties} staff={mockStaff} task={existingTask} />)
      
      const titleInput = screen.getByLabelText(/task title/i)
      expect(titleInput).toHaveValue('Clean property after checkout')
      
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Task')
      
      await user.click(screen.getByRole('button', { name: /update task/i }))
      
      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          title: 'Updated Task',
          description: 'Deep clean the entire property',
          property_id: 'prop-1',
          assigned_to: 'staff-1',
          due_date: '2024-01-15T10:00:00.000Z',
          status: 'pending'
        })
      })
    })

    it('allows unassigned tasks', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'unassigned-task',
          title: 'Unassigned Task',
          assigned_to: null
        },
        error: null
      })
      
      render(<TaskForm properties={mockProperties} staff={mockStaff} />)
      
      await user.type(screen.getByLabelText(/task title/i), 'Unassigned Task')
      await user.selectOptions(screen.getByLabelText(/property/i), 'prop-1')
      await user.type(screen.getByLabelText(/due date/i), '2024-01-25T10:00')
      // Don't select any staff member
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      await waitFor(() => {
        expect(mockSupabase.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            assigned_to: null
          })
        )
      })
    })
  })

  describe('TaskCalendar', () => {
    it('displays tasks in calendar view', async () => {
      mockSupabase.from().select().eq().gte().lte.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      render(<TaskCalendar />)
      
      await waitFor(() => {
        expect(screen.getByText('Clean property after checkout')).toBeInTheDocument()
        expect(screen.getByText('Maintenance check')).toBeInTheDocument()
      })
    })

    it('allows navigation between months', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().eq().gte().lte.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      render(<TaskCalendar />)
      
      const nextButton = screen.getByRole('button', { name: /next month/i })
      await user.click(nextButton)
      
      // Should call with different date range
      expect(mockSupabase.from().gte).toHaveBeenCalled()
      expect(mockSupabase.from().lte).toHaveBeenCalled()
    })

    it('shows task details on click', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().eq().gte().lte.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      render(<TaskCalendar />)
      
      await waitFor(() => {
        expect(screen.getByText('Clean property after checkout')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Clean property after checkout'))
      
      expect(screen.getByText('Deep clean the entire property')).toBeInTheDocument()
      expect(screen.getByText('Assigned to: John Doe')).toBeInTheDocument()
    })

    it('filters tasks by assigned staff', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().eq().gte().lte.mockResolvedValue({
        data: mockTasks,
        error: null
      })
      
      render(<TaskCalendar />)
      
      const staffFilter = screen.getByLabelText(/filter by staff/i)
      await user.selectOptions(staffFilter, 'staff-1')
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('assigned_to', 'staff-1')
    })
  })

  describe('OverdueTaskNotifications', () => {
    it('displays overdue task count', async () => {
      const overdueTasks = [
        {
          ...mockTasks[0],
          due_date: '2023-12-01T10:00:00Z'
        }
      ]
      
      mockSupabase.from().select().eq().lte.mockResolvedValue({
        data: overdueTasks,
        error: null
      })
      
      render(<OverdueTaskNotifications />)
      
      await waitFor(() => {
        expect(screen.getByText(/1 overdue task/i)).toBeInTheDocument()
      })
    })

    it('shows no notification when no overdue tasks', async () => {
      mockSupabase.from().select().eq().lte.mockResolvedValue({
        data: [],
        error: null
      })
      
      render(<OverdueTaskNotifications />)
      
      await waitFor(() => {
        expect(screen.queryByText(/overdue task/i)).not.toBeInTheDocument()
      })
    })

    it('displays multiple overdue tasks count', async () => {
      const overdueTasks = [
        {
          ...mockTasks[0],
          due_date: '2023-12-01T10:00:00Z'
        },
        {
          ...mockTasks[1],
          due_date: '2023-12-05T10:00:00Z'
        }
      ]
      
      mockSupabase.from().select().eq().lte.mockResolvedValue({
        data: overdueTasks,
        error: null
      })
      
      render(<OverdueTaskNotifications />)
      
      await waitFor(() => {
        expect(screen.getByText(/2 overdue tasks/i)).toBeInTheDocument()
      })
    })

    it('shows overdue task details on click', async () => {
      const user = userEvent.setup()
      const overdueTasks = [
        {
          ...mockTasks[0],
          due_date: '2023-12-01T10:00:00Z'
        }
      ]
      
      mockSupabase.from().select().eq().lte.mockResolvedValue({
        data: overdueTasks,
        error: null
      })
      
      render(<OverdueTaskNotifications />)
      
      await waitFor(() => {
        expect(screen.getByText(/1 overdue task/i)).toBeInTheDocument()
      })
      
      await user.click(screen.getByText(/1 overdue task/i))
      
      expect(screen.getByText('Clean property after checkout')).toBeInTheDocument()
      expect(screen.getByText('Due: Dec 1, 2023')).toBeInTheDocument()
    })

    it('allows dismissing notifications', async () => {
      const user = userEvent.setup()
      const overdueTasks = [
        {
          ...mockTasks[0],
          due_date: '2023-12-01T10:00:00Z'
        }
      ]
      
      mockSupabase.from().select().eq().lte.mockResolvedValue({
        data: overdueTasks,
        error: null
      })
      
      render(<OverdueTaskNotifications />)
      
      await waitFor(() => {
        expect(screen.getByText(/1 overdue task/i)).toBeInTheDocument()
      })
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      await user.click(dismissButton)
      
      expect(screen.queryByText(/overdue task/i)).not.toBeInTheDocument()
    })
  })
})