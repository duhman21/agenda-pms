import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RevenueDashboard } from '../RevenueDashboard'
import { RevenueForm } from '../RevenueForm'
import { RevenueAnalytics } from '../RevenueAnalytics'
import { RevenueAuditTrail } from '../RevenueAuditTrail'

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div>Chart Data: {JSON.stringify(data.labels)}</div>
      <div>Chart Title: {options?.plugins?.title?.text}</div>
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div>Chart Data: {JSON.stringify(data.labels)}</div>
      <div>Chart Title: {options?.plugins?.title?.text}</div>
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart">
      <div>Chart Data: {JSON.stringify(data.labels)}</div>
      <div>Chart Title: {options?.plugins?.title?.text}</div>
    </div>
  )
}))

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  ArcElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}))

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn(),
    not: jest.fn().mockReturnThis()
  }))
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}))

const mockRevenueData = [
  {
    id: 'booking-1',
    property_id: 'prop-1',
    guest_name: 'John Doe',
    check_in: '2024-01-01',
    check_out: '2024-01-03',
    revenue: 300,
    source: 'airbnb',
    created_at: '2024-01-01T00:00:00Z',
    properties: {
      id: 'prop-1',
      name: 'Sunset Villa',
      property_owners: [
        {
          ownership_percentage: 100,
          user_profiles: {
            id: 'owner-1',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com'
          }
        }
      ]
    }
  },
  {
    id: 'booking-2',
    property_id: 'prop-2',
    guest_name: 'Bob Wilson',
    check_in: '2024-01-05',
    check_out: '2024-01-07',
    revenue: 250,
    source: 'booking.com',
    created_at: '2024-01-05T00:00:00Z',
    properties: {
      id: 'prop-2',
      name: 'Mountain Cabin',
      property_owners: [
        {
          ownership_percentage: 50,
          user_profiles: {
            id: 'owner-1',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com'
          }
        },
        {
          ownership_percentage: 50,
          user_profiles: {
            id: 'owner-2',
            first_name: 'Mike',
            last_name: 'Johnson',
            email: 'mike@example.com'
          }
        }
      ]
    }
  }
]

const mockProperties = [
  { id: 'prop-1', name: 'Sunset Villa' },
  { id: 'prop-2', name: 'Mountain Cabin' }
]

describe('Revenue Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('RevenueDashboard', () => {
    it('displays revenue summary metrics', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
        expect(screen.getByText('$550')).toBeInTheDocument()
        expect(screen.getByText('Total Bookings')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Average Booking Value')).toBeInTheDocument()
        expect(screen.getByText('$275')).toBeInTheDocument()
      })
    })

    it('allows filtering by date range', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueDashboard />)
      
      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)
      
      await user.type(startDateInput, '2024-01-01')
      await user.type(endDateInput, '2024-01-31')
      
      const applyButton = screen.getByRole('button', { name: /apply filter/i })
      await user.click(applyButton)
      
      expect(mockSupabase.from().gte).toHaveBeenCalledWith('check_in', '2024-01-01')
      expect(mockSupabase.from().lte).toHaveBeenCalledWith('check_out', '2024-01-31')
    })

    it('allows filtering by property', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueDashboard />)
      
      const propertyFilter = screen.getByLabelText(/filter by property/i)
      await user.selectOptions(propertyFilter, 'prop-1')
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('property_id', 'prop-1')
    })

    it('displays revenue by source breakdown', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Revenue by Source')).toBeInTheDocument()
        expect(screen.getByText('Airbnb: $300')).toBeInTheDocument()
        expect(screen.getByText('Booking.com: $250')).toBeInTheDocument()
      })
    })

    it('shows owner revenue attribution', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Owner Revenue Attribution')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith: $425')).toBeInTheDocument() // 300 + 125 (50% of 250)
        expect(screen.getByText('Mike Johnson: $125')).toBeInTheDocument() // 50% of 250
      })
    })

    it('handles empty revenue data', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: [],
        error: null
      })
      
      render(<RevenueDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('$0')).toBeInTheDocument()
        expect(screen.getByText('No revenue data available')).toBeInTheDocument()
      })
    })
  })

  describe('RevenueForm', () => {
    it('renders form fields for manual revenue entry', () => {
      render(<RevenueForm properties={mockProperties} />)
      
      expect(screen.getByLabelText(/guest name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/check-in date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/check-out date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/revenue amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/source/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add revenue/i })).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<RevenueForm properties={mockProperties} />)
      
      const submitButton = screen.getByRole('button', { name: /add revenue/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/guest name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/property is required/i)).toBeInTheDocument()
      expect(screen.getByText(/check-in date is required/i)).toBeInTheDocument()
      expect(screen.getByText(/check-out date is required/i)).toBeInTheDocument()
      expect(screen.getByText(/revenue amount is required/i)).toBeInTheDocument()
    })

    it('validates revenue amount is positive', async () => {
      const user = userEvent.setup()
      render(<RevenueForm properties={mockProperties} />)
      
      const revenueInput = screen.getByLabelText(/revenue amount/i)
      await user.type(revenueInput, '-100')
      
      const submitButton = screen.getByRole('button', { name: /add revenue/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/revenue amount must be positive/i)).toBeInTheDocument()
    })

    it('validates check-out date is after check-in date', async () => {
      const user = userEvent.setup()
      render(<RevenueForm properties={mockProperties} />)
      
      await user.type(screen.getByLabelText(/check-in date/i), '2024-01-05')
      await user.type(screen.getByLabelText(/check-out date/i), '2024-01-03')
      
      const submitButton = screen.getByRole('button', { name: /add revenue/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/check-out date must be after check-in date/i)).toBeInTheDocument()
    })

    it('creates revenue entry successfully', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'new-booking',
          guest_name: 'Alice Brown',
          property_id: 'prop-1',
          check_in: '2024-01-10',
          check_out: '2024-01-12',
          revenue: 200,
          source: 'manual'
        },
        error: null
      })
      
      render(<RevenueForm properties={mockProperties} onSuccess={mockOnSuccess} />)
      
      await user.type(screen.getByLabelText(/guest name/i), 'Alice Brown')
      await user.selectOptions(screen.getByLabelText(/property/i), 'prop-1')
      await user.type(screen.getByLabelText(/check-in date/i), '2024-01-10')
      await user.type(screen.getByLabelText(/check-out date/i), '2024-01-12')
      await user.type(screen.getByLabelText(/revenue amount/i), '200')
      await user.selectOptions(screen.getByLabelText(/source/i), 'manual')
      
      await user.click(screen.getByRole('button', { name: /add revenue/i }))
      
      await waitFor(() => {
        expect(mockSupabase.from().insert).toHaveBeenCalledWith({
          guest_name: 'Alice Brown',
          property_id: 'prop-1',
          check_in: '2024-01-10',
          check_out: '2024-01-12',
          revenue: 200,
          source: 'manual'
        })
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('updates existing booking revenue', async () => {
      const user = userEvent.setup()
      const existingBooking = mockRevenueData[0]
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { ...existingBooking, revenue: 350 },
        error: null
      })
      
      render(<RevenueForm properties={mockProperties} booking={existingBooking} />)
      
      const revenueInput = screen.getByLabelText(/revenue amount/i)
      expect(revenueInput).toHaveValue(300)
      
      await user.clear(revenueInput)
      await user.type(revenueInput, '350')
      
      await user.click(screen.getByRole('button', { name: /update revenue/i }))
      
      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          guest_name: 'John Doe',
          property_id: 'prop-1',
          check_in: '2024-01-01',
          check_out: '2024-01-03',
          revenue: 350,
          source: 'airbnb'
        })
      })
    })
  })

  describe('RevenueAnalytics', () => {
    it('displays revenue trend chart', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueAnalytics />)
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
        expect(screen.getByText('Chart Title: Revenue Trend')).toBeInTheDocument()
      })
    })

    it('displays revenue by source chart', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueAnalytics />)
      
      await waitFor(() => {
        expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument()
        expect(screen.getByText('Chart Title: Revenue by Source')).toBeInTheDocument()
      })
    })

    it('displays property performance comparison', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueAnalytics />)
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
        expect(screen.getByText('Chart Title: Property Performance')).toBeInTheDocument()
      })
    })

    it('shows key performance indicators', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueAnalytics />)
      
      await waitFor(() => {
        expect(screen.getByText('Average Daily Rate')).toBeInTheDocument()
        expect(screen.getByText('Occupancy Rate')).toBeInTheDocument()
        expect(screen.getByText('Revenue Per Available Room')).toBeInTheDocument()
      })
    })

    it('allows changing time period', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValue({
        data: mockRevenueData,
        error: null
      })
      
      render(<RevenueAnalytics />)
      
      const periodSelect = screen.getByLabelText(/time period/i)
      await user.selectOptions(periodSelect, 'quarterly')
      
      // Should update the chart data grouping
      await waitFor(() => {
        expect(mockSupabase.from().select).toHaveBeenCalled()
      })
    })
  })

  describe('RevenueAuditTrail', () => {
    const mockAuditData = [
      {
        id: 'audit-1',
        booking_id: 'booking-1',
        action: 'created',
        old_values: null,
        new_values: { revenue: 300, guest_name: 'John Doe' },
        changed_by: 'admin-1',
        changed_at: '2024-01-01T10:00:00Z',
        user_profiles: {
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@example.com'
        }
      },
      {
        id: 'audit-2',
        booking_id: 'booking-1',
        action: 'updated',
        old_values: { revenue: 300 },
        new_values: { revenue: 350 },
        changed_by: 'admin-1',
        changed_at: '2024-01-02T14:30:00Z',
        user_profiles: {
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@example.com'
        }
      }
    ]

    it('displays audit trail entries', async () => {
      mockSupabase.from().select().order.mockResolvedValue({
        data: mockAuditData,
        error: null
      })
      
      render(<RevenueAuditTrail />)
      
      await waitFor(() => {
        expect(screen.getByText('Revenue Created')).toBeInTheDocument()
        expect(screen.getByText('Revenue Updated')).toBeInTheDocument()
        expect(screen.getByText('Admin User')).toBeInTheDocument()
        expect(screen.getByText('Jan 1, 2024 10:00 AM')).toBeInTheDocument()
        expect(screen.getByText('Jan 2, 2024 2:30 PM')).toBeInTheDocument()
      })
    })

    it('shows change details for updates', async () => {
      mockSupabase.from().select().order.mockResolvedValue({
        data: mockAuditData,
        error: null
      })
      
      render(<RevenueAuditTrail />)
      
      await waitFor(() => {
        expect(screen.getByText('Revenue: $300 → $350')).toBeInTheDocument()
      })
    })

    it('filters audit trail by booking', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().order.mockResolvedValue({
        data: mockAuditData,
        error: null
      })
      
      render(<RevenueAuditTrail />)
      
      const bookingFilter = screen.getByLabelText(/filter by booking/i)
      await user.type(bookingFilter, 'booking-1')
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('booking_id', 'booking-1')
    })

    it('filters audit trail by date range', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().order.mockResolvedValue({
        data: mockAuditData,
        error: null
      })
      
      render(<RevenueAuditTrail />)
      
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01')
      await user.type(screen.getByLabelText(/end date/i), '2024-01-31')
      
      const applyButton = screen.getByRole('button', { name: /apply filter/i })
      await user.click(applyButton)
      
      expect(mockSupabase.from().gte).toHaveBeenCalledWith('changed_at', '2024-01-01T00:00:00.000Z')
      expect(mockSupabase.from().lte).toHaveBeenCalledWith('changed_at', '2024-01-31T23:59:59.999Z')
    })

    it('handles empty audit trail', async () => {
      mockSupabase.from().select().order.mockResolvedValue({
        data: [],
        error: null
      })
      
      render(<RevenueAuditTrail />)
      
      await waitFor(() => {
        expect(screen.getByText('No audit trail entries found')).toBeInTheDocument()
      })
    })
  })
})