import { POST, GET } from '../generate/route';
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { ReportGenerator } from '@/lib/report-generator';

// Mock dependencies
jest.mock('@/lib/auth-server');
jest.mock('@/lib/report-generator');

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockReportGenerator = ReportGenerator as jest.MockedClass<typeof ReportGenerator>;

describe('/api/reports/generate', () => {
  const mockUserProfile = {
    id: 'user-1',
    tenant_id: 'tenant-1',
    role: 'admin' as const,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockReport = {
    id: 'report-1',
    tenant_id: 'tenant-1',
    report_type: 'monthly' as const,
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    properties: [
      {
        property_id: 'prop-1',
        property_name: 'Test Property',
        total_revenue: 1000,
        total_expenses: 200,
        net_profit: 800,
        booking_count: 5,
        expense_count: 3,
        revenue_by_source: [
          { source: 'airbnb', total_revenue: 600, booking_count: 3 },
          { source: 'booking.com', total_revenue: 400, booking_count: 2 }
        ],
        expenses_by_category: [
          { category: 'cleaning', total_expenses: 120, expense_count: 2 },
          { category: 'maintenance', total_expenses: 80, expense_count: 1 }
        ]
      }
    ],
    owners: [
      {
        owner_id: 'owner-1',
        owner_name: 'Jane Smith',
        owner_email: 'jane@example.com',
        properties: [
          {
            property_id: 'prop-1',
            property_name: 'Test Property',
            ownership_percentage: 100,
            attributed_revenue: 1000,
            attributed_expenses: 200,
            attributed_profit: 800
          }
        ],
        total_revenue: 1000,
        total_expenses: 200,
        net_profit: 800
      }
    ],
    totals: {
      total_revenue: 1000,
      total_expenses: 200,
      net_profit: 800,
      total_bookings: 5,
      total_expenses_count: 3,
      profit_margin: 80
    },
    generated_at: '2024-01-01T12:00:00Z',
    generated_by: 'user-1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ profile: mockUserProfile });
    
    const mockGenerateFinancialReport = jest.fn().mockResolvedValue(mockReport);
    const mockExportToCSV = jest.fn().mockResolvedValue('csv,data');
    const mockExportToPDF = jest.fn().mockResolvedValue(Buffer.from('pdf data'));
    
    mockReportGenerator.mockImplementation(() => ({
      generateFinancialReport: mockGenerateFinancialReport,
      exportToCSV: mockExportToCSV,
      exportToPDF: mockExportToPDF
    }) as any);
  });

  describe('POST /api/reports/generate', () => {
    it('should generate a JSON report successfully', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          format: 'json'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report).toEqual(mockReport);
    });

    it('should generate a CSV report successfully', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          format: 'csv'
        })
      });

      const response = await POST(request);
      const csvData = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(csvData).toBe('csv,data');
    });

    it('should generate a PDF report successfully', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          format: 'pdf'
        })
      });

      const response = await POST(request);
      const pdfData = await response.arrayBuffer();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(Buffer.from(pdfData)).toEqual(Buffer.from('pdf data'));
    });

    it('should return 401 for unauthorized users', async () => {
      mockGetCurrentUser.mockResolvedValue({ profile: null });

      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          format: 'json'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'monthly',
          start_date: '2024-01-01'
          // Missing end_date and format
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid report type', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'invalid',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          format: 'json'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid report_type');
    });

    it('should return 400 for invalid format', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          format: 'invalid'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid format');
    });

    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'monthly',
          start_date: 'invalid-date',
          end_date: '2024-01-31',
          format: 'json'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid date format');
    });

    it('should return 400 when end date is before start date', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'monthly',
          start_date: '2024-01-31',
          end_date: '2024-01-01',
          format: 'json'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('End date must be after start date');
    });

    it('should return 400 for date range exceeding 1 year', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'custom',
          start_date: '2024-01-01',
          end_date: '2025-01-02',
          format: 'json'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Date range cannot exceed 1 year');
    });
  });

  describe('GET /api/reports/generate', () => {
    it('should generate current month report by default', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report).toEqual(mockReport);
    });

    it('should generate specific month report', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate?month=2024-01&format=json');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report).toEqual(mockReport);
    });

    it('should generate yearly report', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate?year=2024&format=json');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report).toEqual(mockReport);
    });

    it('should return CSV format when requested', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate?month=2024-01&format=csv');

      const response = await GET(request);
      const csvData = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(csvData).toBe('csv,data');
    });

    it('should return PDF format when requested', async () => {
      const request = new NextRequest('http://localhost/api/reports/generate?month=2024-01&format=pdf');

      const response = await GET(request);
      const pdfData = await response.arrayBuffer();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(Buffer.from(pdfData)).toEqual(Buffer.from('pdf data'));
    });

    it('should return 401 for unauthorized users', async () => {
      mockGetCurrentUser.mockResolvedValue({ profile: null });

      const request = new NextRequest('http://localhost/api/reports/generate');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});