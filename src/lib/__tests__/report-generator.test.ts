import { ReportGenerator } from '../report-generator'
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

// Mock Puppeteer
jest.mock('puppeteer')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>

describe('ReportGenerator', () => {
  let mockSupabase: any
  let reportGenerator: ReportGenerator

  const mockBookings = [
    {
      id: 'booking-1',
      property_id: 'prop-1',
      guest_name: 'John Doe',
      check_in: '2024-01-01',
      check_out: '2024-01-03',
      revenue: 300,
      source: 'airbnb',
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
      property_id: 'prop-1',
      guest_name: 'Bob Wilson',
      check_in: '2024-01-05',
      check_out: '2024-01-07',
      revenue: 250,
      source: 'booking.com',
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
    }
  ]

  const mockExpenses = [
    {
      id: 'expense-1',
      property_id: 'prop-1',
      amount: 50,
      category: 'Cleaning',
      description: 'Post-checkout cleaning',
      expense_date: '2024-01-03',
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
    }
  ]

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis()
      }))
    }

    mockCreateClient.mockReturnValue(mockSupabase)
    reportGenerator = new ReportGenerator('tenant-1')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateFinancialReport', () => {
    it('generates monthly financial report', async () => {
      // Mock bookings query
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValueOnce({
        data: mockBookings,
        error: null
      })

      // Mock expenses query
      mockSupabase.from().select().eq().gte().lte.mockResolvedValueOnce({
        data: mockExpenses,
        error: null
      })

      const report = await reportGenerator.generateFinancialReport({
        report_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })

      expect(report.report_type).toBe('monthly')
      expect(report.start_date).toBe('2024-01-01')
      expect(report.end_date).toBe('2024-01-31')
      expect(report.properties).toHaveLength(1)
      expect(report.owners).toHaveLength(1)

      const property = report.properties[0]
      expect(property.property_name).toBe('Sunset Villa')
      expect(property.total_revenue).toBe(550)
      expect(property.total_expenses).toBe(50)
      expect(property.net_profit).toBe(500)
      expect(property.booking_count).toBe(2)
      expect(property.expense_count).toBe(1)

      const owner = report.owners[0]
      expect(owner.owner_name).toBe('Jane Smith')
      expect(owner.total_revenue).toBe(550)
      expect(owner.total_expenses).toBe(50)
      expect(owner.net_profit).toBe(500)

      expect(report.totals.total_revenue).toBe(550)
      expect(report.totals.total_expenses).toBe(50)
      expect(report.totals.net_profit).toBe(500)
      expect(report.totals.profit_margin).toBe(90.91)
    })

    it('handles empty data gracefully', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValueOnce({
        data: [],
        error: null
      })

      mockSupabase.from().select().eq().gte().lte.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const report = await reportGenerator.generateFinancialReport({
        report_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })

      expect(report.properties).toHaveLength(0)
      expect(report.owners).toHaveLength(0)
      expect(report.totals.total_revenue).toBe(0)
      expect(report.totals.total_expenses).toBe(0)
      expect(report.totals.net_profit).toBe(0)
      expect(report.totals.profit_margin).toBe(0)
    })

    it('filters by property IDs when provided', async () => {
      mockSupabase.from().select().eq().gte().lte().in().not.mockResolvedValueOnce({
        data: mockBookings,
        error: null
      })

      mockSupabase.from().select().eq().gte().lte().in.mockResolvedValueOnce({
        data: mockExpenses,
        error: null
      })

      await reportGenerator.generateFinancialReport({
        report_type: 'custom',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        property_ids: ['prop-1', 'prop-2']
      })

      expect(mockSupabase.from().select().eq().gte().lte().in).toHaveBeenCalledWith('property_id', ['prop-1', 'prop-2'])
    })

    it('groups revenue by source correctly', async () => {
      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValueOnce({
        data: mockBookings,
        error: null
      })

      mockSupabase.from().select().eq().gte().lte.mockResolvedValueOnce({
        data: mockExpenses,
        error: null
      })

      const report = await reportGenerator.generateFinancialReport({
        report_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })

      const property = report.properties[0]
      expect(property.revenue_by_source).toHaveLength(2)
      
      const airbnbRevenue = property.revenue_by_source.find(r => r.source === 'airbnb')
      expect(airbnbRevenue?.total_revenue).toBe(300)
      expect(airbnbRevenue?.booking_count).toBe(1)

      const bookingComRevenue = property.revenue_by_source.find(r => r.source === 'booking.com')
      expect(bookingComRevenue?.total_revenue).toBe(250)
      expect(bookingComRevenue?.booking_count).toBe(1)
    })

    it('groups expenses by category correctly', async () => {
      const multiCategoryExpenses = [
        ...mockExpenses,
        {
          id: 'expense-2',
          property_id: 'prop-1',
          amount: 30,
          category: 'Cleaning',
          description: 'Additional cleaning',
          expense_date: '2024-01-10',
          properties: mockExpenses[0].properties
        },
        {
          id: 'expense-3',
          property_id: 'prop-1',
          amount: 100,
          category: 'Maintenance',
          description: 'Plumbing repair',
          expense_date: '2024-01-15',
          properties: mockExpenses[0].properties
        }
      ]

      mockSupabase.from().select().eq().gte().lte().not.mockResolvedValueOnce({
        data: mockBookings,
        error: null
      })

      mockSupabase.from().select().eq().gte().lte.mockResolvedValueOnce({
        data: multiCategoryExpenses,
        error: null
      })

      const report = await reportGenerator.generateFinancialReport({
        report_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })

      const property = report.properties[0]
      expect(property.expenses_by_category).toHaveLength(2)
      
      const cleaningExpenses = property.expenses_by_category.find(e => e.category === 'Cleaning')
      expect(cleaningExpenses?.total_expenses).toBe(80)
      expect(cleaningExpenses?.expense_count).toBe(2)

      const maintenanceExpenses = property.expenses_by_category.find(e => e.category === 'Maintenance')
      expect(maintenanceExpenses?.total_expenses).toBe(100)
      expect(maintenanceExpenses?.expense_count).toBe(1)
    })
  })

  describe('exportToCSV', () => {
    it('exports report data to CSV format', async () => {
      const mockReport = {
        id: 'report-1',
        tenant_id: 'tenant-1',
        report_type: 'monthly' as const,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        properties: [
          {
            property_id: 'prop-1',
            property_name: 'Sunset Villa',
            total_revenue: 550,
            total_expenses: 50,
            net_profit: 500,
            booking_count: 2,
            expense_count: 1,
            revenue_by_source: [],
            expenses_by_category: []
          }
        ],
        owners: [
          {
            owner_id: 'owner-1',
            owner_name: 'Jane Smith',
            owner_email: 'jane@example.com',
            properties: [],
            total_revenue: 550,
            total_expenses: 50,
            net_profit: 500
          }
        ],
        totals: {
          total_revenue: 550,
          total_expenses: 50,
          net_profit: 500,
          total_bookings: 2,
          total_expenses_count: 1,
          profit_margin: 90.91
        },
        generated_at: '2024-01-01T12:00:00Z',
        generated_by: 'user-1'
      }

      const csvData = await reportGenerator.exportToCSV(mockReport)

      expect(csvData).toContain('Property Name,Total Revenue,Total Expenses,Net Profit')
      expect(csvData).toContain('Sunset Villa,550,50,500')
      expect(csvData).toContain('Owner Name,Owner Email,Total Revenue,Total Expenses,Net Profit')
      expect(csvData).toContain('Jane Smith,jane@example.com,550,50,500')
    })
  })

  describe('exportToPDF', () => {
    it('generates PDF report', async () => {
      const mockBrowser = {
        newPage: jest.fn(),
        close: jest.fn()
      }

      const mockPage = {
        setContent: jest.fn(),
        pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf content'))
      }

      mockBrowser.newPage.mockResolvedValue(mockPage)
      mockPuppeteer.launch.mockResolvedValue(mockBrowser as any)

      const mockReport = {
        id: 'report-1',
        tenant_id: 'tenant-1',
        report_type: 'monthly' as const,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        properties: [],
        owners: [],
        totals: {
          total_revenue: 0,
          total_expenses: 0,
          net_profit: 0,
          total_bookings: 0,
          total_expenses_count: 0,
          profit_margin: 0
        },
        generated_at: '2024-01-01T12:00:00Z',
        generated_by: 'user-1'
      }

      const pdfBuffer = await reportGenerator.exportToPDF(mockReport)

      expect(mockPuppeteer.launch).toHaveBeenCalledWith({ headless: true })
      expect(mockBrowser.newPage).toHaveBeenCalled()
      expect(mockPage.setContent).toHaveBeenCalled()
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
      })
      expect(mockBrowser.close).toHaveBeenCalled()
      expect(pdfBuffer).toEqual(Buffer.from('mock pdf content'))
    })

    it('handles PDF generation errors', async () => {
      mockPuppeteer.launch.mockRejectedValue(new Error('Puppeteer error'))

      const mockReport = {
        id: 'report-1',
        tenant_id: 'tenant-1',
        report_type: 'monthly' as const,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        properties: [],
        owners: [],
        totals: {
          total_revenue: 0,
          total_expenses: 0,
          net_profit: 0,
          total_bookings: 0,
          total_expenses_count: 0,
          profit_margin: 0
        },
        generated_at: '2024-01-01T12:00:00Z',
        generated_by: 'user-1'
      }

      await expect(reportGenerator.exportToPDF(mockReport)).rejects.toThrow('Puppeteer error')
    })
  })
})