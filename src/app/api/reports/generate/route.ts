import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { ReportGenerator } from '@/lib/report-generator';
import { ReportGenerationRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ReportGenerationRequest = await request.json();
    const { report_type, start_date, end_date, property_ids, owner_ids, format } = body;

    // Validate required fields
    if (!report_type || !start_date || !end_date || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: report_type, start_date, end_date, format' },
        { status: 400 }
      );
    }

    // Validate report type
    if (!['monthly', 'custom'].includes(report_type)) {
      return NextResponse.json(
        { error: 'Invalid report_type. Must be "monthly" or "custom"' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['pdf', 'csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "pdf", "csv", or "json"' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Check date range limit (max 1 year)
    const maxDate = new Date(startDate);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (endDate > maxDate) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 1 year' },
        { status: 400 }
      );
    }

    const reportGenerator = new ReportGenerator();
    const report = await reportGenerator.generateFinancialReport(body, userProfile);

    // Return different formats based on request
    switch (format) {
      case 'json':
        return NextResponse.json({
          success: true,
          report
        });

      case 'csv':
        const csvData = await reportGenerator.exportToCSV(report);
        return new NextResponse(csvData, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="financial-report-${start_date}-to-${end_date}.csv"`
          }
        });

      case 'pdf':
        const pdfBuffer = await reportGenerator.exportToPDF(report);
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="financial-report-${start_date}-to-${end_date}.pdf"`
          }
        });

      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving monthly reports
export async function GET(request: NextRequest) {
  try {
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM
    const year = searchParams.get('year');
    const format = searchParams.get('format') || 'json';

    let startDate: string;
    let endDate: string;

    if (month) {
      // Generate monthly report
      const [yearStr, monthStr] = month.split('-');
      const monthDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
      const nextMonth = new Date(monthDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      startDate = monthDate.toISOString().split('T')[0];
      endDate = new Date(nextMonth.getTime() - 1).toISOString().split('T')[0];
    } else if (year) {
      // Generate yearly report
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      // Default to current month
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      startDate = currentMonth.toISOString().split('T')[0];
      endDate = new Date(nextMonth.getTime() - 1).toISOString().split('T')[0];
    }

    const reportRequest: ReportGenerationRequest = {
      report_type: 'monthly',
      start_date: startDate,
      end_date: endDate,
      format: format as 'pdf' | 'csv' | 'json'
    };

    const reportGenerator = new ReportGenerator();
    const report = await reportGenerator.generateFinancialReport(reportRequest, userProfile);

    // Return different formats based on request
    switch (format) {
      case 'json':
        return NextResponse.json({
          success: true,
          report
        });

      case 'csv':
        const csvData = await reportGenerator.exportToCSV(report);
        return new NextResponse(csvData, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="monthly-report-${month || year || 'current'}.csv"`
          }
        });

      case 'pdf':
        const pdfBuffer = await reportGenerator.exportToPDF(report);
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="monthly-report-${month || year || 'current'}.pdf"`
          }
        });

      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Monthly report generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate monthly report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}