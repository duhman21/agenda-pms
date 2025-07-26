import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyList } from '../PropertyList'
import { PropertyForm } from '../PropertyForm'
import { PropertyCard } from '../PropertyCard'
import { PropertySearch } from '../PropertySearch'

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
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}))

const mockProperties = [
  {
    id: 'prop-1',
    name: 'Sunset Villa',
    address: '123 Beach Road, Miami, FL',
    description: 'Beautiful beachfront villa',
    ical_import_url: 'https://airbnb.com/calendar/prop1.ics',
    property_owners: [
      {
        ownership_percentage: 100,
        user_profiles: {
          id: 'owner-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com'
        }
      }
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'prop-2',
    name: 'Mountain Cabin',
    address: '456 Pine Street, Aspen, CO',
    description: 'Cozy mountain retreat',
    ical_import_url: null,
    property_owners: [
      {
        ownership_percentage: 60,
        user_profiles: {
          id: 'owner-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com'
        }
      },
      {
        ownership_percentage: 40,
        user_profiles: {
          id: 'owner-2',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com'
        }
      }
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

describe('Property Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PropertyList', () => {
    it('displays list of properties', async () => {
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockProperties,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 2,
        error: null
      })
      
      render(<PropertyList />)
      
      await waitFor(() => {
        expect(screen.getByText('Sunset Villa')).toBeInTheDocument()
        expect(screen.getByText('Mountain Cabin')).toBeInTheDocument()
        expect(screen.getByText('123 Beach Road, Miami, FL')).toBeInTheDocument()
        expect(screen.getByText('456 Pine Street, Aspen, CO')).toBeInTheDocument()
      })
    })

    it('shows loading state initially', () => {
      mockSupabase.from().select().order().range.mockImplementation(() => new Promise(() => {}))
      
      render(<PropertyList />)
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('handles empty property list', async () => {
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: [],
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 0,
        error: null
      })
      
      render(<PropertyList />)
      
      await waitFor(() => {
        expect(screen.getByText(/no properties found/i)).toBeInTheDocument()
      })
    })

    it('handles pagination', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockProperties,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 25, // More than one page
        error: null
      })
      
      render(<PropertyList />)
      
      await waitFor(() => {
        expect(screen.getByText('Sunset Villa')).toBeInTheDocument()
      })
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeInTheDocument()
      
      await user.click(nextButton)
      
      // Should call with different range for page 2
      expect(mockSupabase.from().select().order().range).toHaveBeenCalledWith(10, 19)
    })

    it('allows deleting properties', async () => {
      const user = userEvent.setup()
      
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockProperties,
        error: null
      })
      
      mockSupabase.from().select().eq.mockResolvedValue({
        count: 2,
        error: null
      })
      
      mockSupabase.from().delete().eq.mockResolvedValue({
        error: null
      })
      
      render(<PropertyList />)
      
      await waitFor(() => {
        expect(screen.getByText('Sunset Villa')).toBeInTheDocument()
      })
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)
      
      expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 'prop-1')
    })
  })

  describe('PropertyForm', () => {
    it('renders form fields for creating new property', () => {
      render(<PropertyForm />)
      
      expect(screen.getByLabelText(/property name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/ical import url/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save property/i })).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<PropertyForm />)
      
      const submitButton = screen.getByRole('button', { name: /save property/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/property name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/address is required/i)).toBeInTheDocument()
    })

    it('validates iCal URL format', async () => {
      const user = userEvent.setup()
      render(<PropertyForm />)
      
      const icalInput = screen.getByLabelText(/ical import url/i)
      await user.type(icalInput, 'invalid-url')
      
      const submitButton = screen.getByRole('button', { name: /save property/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument()
    })

    it('creates new property successfully', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'new-prop',
          name: 'New Property',
          address: '789 New Street',
          description: 'A new property'
        },
        error: null
      })
      
      render(<PropertyForm onSuccess={mockOnSuccess} />)
      
      await user.type(screen.getByLabelText(/property name/i), 'New Property')
      await user.type(screen.getByLabelText(/address/i), '789 New Street')
      await user.type(screen.getByLabelText(/description/i), 'A new property')
      await user.type(screen.getByLabelText(/ical import url/i), 'https://example.com/calendar.ics')
      
      await user.click(screen.getByRole('button', { name: /save property/i }))
      
      await waitFor(() => {
        expect(mockSupabase.from().insert).toHaveBeenCalledWith({
          name: 'New Property',
          address: '789 New Street',
          description: 'A new property',
          ical_import_url: 'https://example.com/calendar.ics'
        })
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('updates existing property', async () => {
      const user = userEvent.setup()
      const existingProperty = mockProperties[0]
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { ...existingProperty, name: 'Updated Villa' },
        error: null
      })
      
      render(<PropertyForm property={existingProperty} />)
      
      const nameInput = screen.getByLabelText(/property name/i)
      expect(nameInput).toHaveValue('Sunset Villa')
      
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Villa')
      
      await user.click(screen.getByRole('button', { name: /save property/i }))
      
      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          name: 'Updated Villa',
          address: '123 Beach Road, Miami, FL',
          description: 'Beautiful beachfront villa',
          ical_import_url: 'https://airbnb.com/calendar/prop1.ics'
        })
      })
    })
  })

  describe('PropertyCard', () => {
    it('displays property information', () => {
      render(<PropertyCard property={mockProperties[0]} />)
      
      expect(screen.getByText('Sunset Villa')).toBeInTheDocument()
      expect(screen.getByText('123 Beach Road, Miami, FL')).toBeInTheDocument()
      expect(screen.getByText('Beautiful beachfront villa')).toBeInTheDocument()
    })

    it('displays single owner information', () => {
      render(<PropertyCard property={mockProperties[0]} />)
      
      expect(screen.getByText('John Doe (100%)')).toBeInTheDocument()
    })

    it('displays multiple owners information', () => {
      render(<PropertyCard property={mockProperties[1]} />)
      
      expect(screen.getByText('John Doe (60%)')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith (40%)')).toBeInTheDocument()
    })

    it('shows iCal sync status', () => {
      render(<PropertyCard property={mockProperties[0]} />)
      
      expect(screen.getByText(/ical sync: enabled/i)).toBeInTheDocument()
    })

    it('shows when iCal sync is disabled', () => {
      render(<PropertyCard property={mockProperties[1]} />)
      
      expect(screen.getByText(/ical sync: disabled/i)).toBeInTheDocument()
    })

    it('provides edit and delete actions', () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <PropertyCard 
          property={mockProperties[0]} 
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )
      
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('calls edit handler when edit button clicked', async () => {
      const user = userEvent.setup()
      const mockOnEdit = jest.fn()
      
      render(
        <PropertyCard 
          property={mockProperties[0]} 
          onEdit={mockOnEdit}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /edit/i }))
      
      expect(mockOnEdit).toHaveBeenCalledWith(mockProperties[0])
    })
  })

  describe('PropertySearch', () => {
    it('renders search input', () => {
      render(<PropertySearch onSearch={jest.fn()} />)
      
      expect(screen.getByPlaceholderText(/search properties/i)).toBeInTheDocument()
    })

    it('calls onSearch when typing', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()
      
      render(<PropertySearch onSearch={mockOnSearch} />)
      
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'villa')
      
      // Should debounce the search calls
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('villa')
      }, { timeout: 1000 })
    })

    it('clears search when clear button clicked', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()
      
      render(<PropertySearch onSearch={mockOnSearch} />)
      
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'villa')
      
      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)
      
      expect(searchInput).toHaveValue('')
      expect(mockOnSearch).toHaveBeenCalledWith('')
    })

    it('shows search suggestions', async () => {
      const user = userEvent.setup()
      const mockSuggestions = ['Sunset Villa', 'Villa Paradise', 'Ocean Villa']
      
      render(
        <PropertySearch 
          onSearch={jest.fn()} 
          suggestions={mockSuggestions}
        />
      )
      
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'villa')
      
      await waitFor(() => {
        expect(screen.getByText('Sunset Villa')).toBeInTheDocument()
        expect(screen.getByText('Villa Paradise')).toBeInTheDocument()
        expect(screen.getByText('Ocean Villa')).toBeInTheDocument()
      })
    })

    it('selects suggestion when clicked', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()
      const mockSuggestions = ['Sunset Villa', 'Villa Paradise']
      
      render(
        <PropertySearch 
          onSearch={mockOnSearch} 
          suggestions={mockSuggestions}
        />
      )
      
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'villa')
      
      await waitFor(() => {
        expect(screen.getByText('Sunset Villa')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Sunset Villa'))
      
      expect(searchInput).toHaveValue('Sunset Villa')
      expect(mockOnSearch).toHaveBeenCalledWith('Sunset Villa')
    })
  })
})