import { createServerSupabaseClient } from '@/lib/supabase';
import { 
  FinancialReport, 
  PropertyFinancialSummary, 
  OwnerFinancialSummary, 
  FinancialTotals,
  ReportGenerationRequest,
  ReportExportOptions,
  UserProfile
} from '@/types';
import puppeteer from 'puppeteer';
import Papa from 'papaparse';

export class ReportGenerator {
  private supabase = createServerSupabaseClient();

  async generateFinancialReport(
    request: ReportGenerationRequest,
    userProfile: UserProfile
  ): Promise<FinancialReport> {
    const { report_type, start_date, end_date, property_ids, owner_ids } = request;

    // Validate date range
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Get properties based on user role and filters
    const properties = await this.getPropertiesForReport(userProfile, property_ids);
    
    // Generate property financial summaries
    const propertyFinancials = await Promise.all(
      properties.map(property => this.generatePropertyFinancialSummary(
        property.id, 
        property.name, 
        start_date, 
        end_date,
        userProfile.tenant_id
      ))
    );

    // Generate owner financial summaries
    const ownerFinancials = await this.generateOwnerFinancialSummaries(
      properties.map(p => p.id),
      start_date,
      end_date,
      userProfile.tenant_id,
      owner_ids
    );

    // Calculate totals
    const totals = this.calculateFinancialTotals(propertyFinancials);

    const report: FinancialReport = {
      id: crypto.randomUUID(),
      tenant_id: userProfile.tenant_id,
      report_type,
      start_date,
      end_date,
      properties: propertyFinancials,
      owners: ownerFinancials,
      totals,
      generated_at: new Date().toISOString(),
      generated_by: userProfile.id
    };

    return report;
  }

  private async getPropertiesForReport(
    userProfile: UserProfile, 
    property_ids?: string[]
  ): Promise<{ id: string; name: string }[]> {
    let query = this.supabase
      .from('properties')
      .select('id, name')
      .eq('tenant_id', userProfile.tenant_id);

    // Apply role-based filtering
    if (userProfile.role === 'owner') {
      const { data: ownedProperties } = await this.supabase
        .from('property_owners')
        .select('property_id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('owner_id', userProfile.id);

      if (!ownedProperties || ownedProperties.length === 0) {
        return [];
      }

      const ownedPropertyIds = ownedProperties.map(p => p.property_id);
      query = query.in('id', ownedPropertyIds);
    }

    // Apply property filter if specified
    if (property_ids && property_ids.length > 0) {
      query = query.in('id', property_ids);
    }

    const { data: properties, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }

    return properties || [];
  }

  private async generatePropertyFinancialSummary(
    propertyId: string,
    propertyName: string,
    startDate: string,
    endDate: string,
    tenantId: string
  ): Promise<PropertyFinancialSummary> {
    // Get revenue data
    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('revenue, source')
      .eq('tenant_id', tenantId)
      .eq('property_id', propertyId)
      .gte('check_in', startDate)
      .lte('check_out', endDate)
      .not('revenue', 'is', null);

    // Get expense data
    const { data: expenses } = await this.supabase
      .from('expenses')
      .select('amount, category')
      .eq('tenant_id', tenantId)
      .eq('property_id', propertyId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    // Calculate revenue metrics
    const totalRevenue = bookings?.reduce((sum, booking) => sum + (booking.revenue || 0), 0) || 0;
    const bookingCount = bookings?.length || 0;

    // Calculate revenue by source
    const revenueBySource = this.groupRevenueBySource(bookings || []);

    // Calculate expense metrics
    const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
    const expenseCount = expenses?.length || 0;

    // Calculate expenses by category
    const expensesByCategory = this.groupExpensesByCategory(expenses || []);

    return {
      property_id: propertyId,
      property_name: propertyName,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      booking_count: bookingCount,
      expense_count: expenseCount,
      revenue_by_source: revenueBySource,
      expenses_by_category: expensesByCategory
    };
  }

  private async generateOwnerFinancialSummaries(
    propertyIds: string[],
    startDate: string,
    endDate: string,
    tenantId: string,
    ownerIds?: string[]
  ): Promise<OwnerFinancialSummary[]> {
    if (propertyIds.length === 0) {
      return [];
    }

    // Get property owners
    let ownerQuery = this.supabase
      .from('property_owners')
      .select(`
        owner_id,
        property_id,
        ownership_percentage,
        user_profiles!inner(
          id,
          first_name,
          last_name,
          email
        ),
        properties!inner(
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .in('property_id', propertyIds);

    if (ownerIds && ownerIds.length > 0) {
      ownerQuery = ownerQuery.in('owner_id', ownerIds);
    }

    const { data: propertyOwners, error } = await ownerQuery;

    if (error) {
      throw new Error(`Failed to fetch property owners: ${error.message}`);
    }

    // Group by owner
    const ownerMap = new Map<string, {
      owner_id: string;
      owner_name: string;
      owner_email?: string;
      properties: Array<{
        property_id: string;
        property_name: string;
        ownership_percentage: number;
      }>;
    }>();

    propertyOwners?.forEach(po => {
      const ownerId = po.owner_id;
      const ownerName = `${po.user_profiles.first_name || ''} ${po.user_profiles.last_name || ''}`.trim();
      
      if (!ownerMap.has(ownerId)) {
        ownerMap.set(ownerId, {
          owner_id: ownerId,
          owner_name: ownerName,
          owner_email: po.user_profiles.email,
          properties: []
        });
      }

      ownerMap.get(ownerId)!.properties.push({
        property_id: po.property_id,
        property_name: po.properties.name,
        ownership_percentage: po.ownership_percentage
      });
    });

    // Calculate financial data for each owner
    const ownerFinancials = await Promise.all(
      Array.from(ownerMap.values()).map(async (owner) => {
        const propertyFinancials = await Promise.all(
          owner.properties.map(async (property) => {
            // Get revenue for this property
            const { data: bookings } = await this.supabase
              .from('bookings')
              .select('revenue')
              .eq('tenant_id', tenantId)
              .eq('property_id', property.property_id)
              .gte('check_in', startDate)
              .lte('check_out', endDate)
              .not('revenue', 'is', null);

            const propertyRevenue = bookings?.reduce((sum, booking) => sum + (booking.revenue || 0), 0) || 0;

            // Get expenses for this property
            const { data: expenses } = await this.supabase
              .from('expenses')
              .select('amount')
              .eq('tenant_id', tenantId)
              .eq('property_id', property.property_id)
              .gte('expense_date', startDate)
              .lte('expense_date', endDate);

            const propertyExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

            // Calculate attributed amounts
            const attributedRevenue = propertyRevenue * property.ownership_percentage / 100;
            const attributedExpenses = propertyExpenses * property.ownership_percentage / 100;
            const attributedProfit = attributedRevenue - attributedExpenses;

            return {
              property_id: property.property_id,
              property_name: property.property_name,
              ownership_percentage: property.ownership_percentage,
              attributed_revenue: attributedRevenue,
              attributed_expenses: attributedExpenses,
              attributed_profit: attributedProfit
            };
          })
        );

        // Calculate totals for this owner
        const totalRevenue = propertyFinancials.reduce((sum, pf) => sum + pf.attributed_revenue, 0);
        const totalExpenses = propertyFinancials.reduce((sum, pf) => sum + pf.attributed_expenses, 0);
        const netProfit = totalRevenue - totalExpenses;

        return {
          owner_id: owner.owner_id,
          owner_name: owner.owner_name,
          owner_email: owner.owner_email,
          properties: propertyFinancials,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_profit: netProfit
        };
      })
    );

    return ownerFinancials;
  }

  private groupRevenueBySource(bookings: Array<{ revenue: number | null; source?: string }>) {
    const sourceMap = new Map<string, { total_revenue: number; booking_count: number }>();

    bookings.forEach(booking => {
      if (booking.revenue) {
        const source = booking.source || 'unknown';
        const current = sourceMap.get(source) || { total_revenue: 0, booking_count: 0 };
        sourceMap.set(source, {
          total_revenue: current.total_revenue + booking.revenue,
          booking_count: current.booking_count + 1
        });
      }
    });

    return Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      total_revenue: data.total_revenue,
      booking_count: data.booking_count
    }));
  }

  private groupExpensesByCategory(expenses: Array<{ amount: number; category: string }>) {
    const categoryMap = new Map<string, { total_expenses: number; expense_count: number }>();

    expenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || { total_expenses: 0, expense_count: 0 };
      categoryMap.set(expense.category, {
        total_expenses: current.total_expenses + expense.amount,
        expense_count: current.expense_count + 1
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      total_expenses: data.total_expenses,
      expense_count: data.expense_count
    }));
  }

  private calculateFinancialTotals(propertyFinancials: PropertyFinancialSummary[]): FinancialTotals {
    const totalRevenue = propertyFinancials.reduce((sum, pf) => sum + pf.total_revenue, 0);
    const totalExpenses = propertyFinancials.reduce((sum, pf) => sum + pf.total_expenses, 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalBookings = propertyFinancials.reduce((sum, pf) => sum + pf.booking_count, 0);
    const totalExpensesCount = propertyFinancials.reduce((sum, pf) => sum + pf.expense_count, 0);
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      total_bookings: totalBookings,
      total_expenses_count: totalExpensesCount,
      profit_margin: profitMargin
    };
  }

  async exportToPDF(report: FinancialReport, options: ReportExportOptions = { format: 'pdf' }): Promise<Buffer> {
    const html = this.generateReportHTML(report, options);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });
      
      return pdf;
    } finally {
      await browser.close();
    }
  }

  async exportToCSV(report: FinancialReport): Promise<string> {
    const csvData = [];

    // Add summary row
    csvData.push({
      Type: 'Summary',
      Property: 'All Properties',
      Owner: 'All Owners',
      Revenue: report.totals.total_revenue,
      Expenses: report.totals.total_expenses,
      Profit: report.totals.net_profit,
      'Profit Margin %': report.totals.profit_margin.toFixed(2)
    });

    // Add property data
    report.properties.forEach(property => {
      csvData.push({
        Type: 'Property',
        Property: property.property_name,
        Owner: '',
        Revenue: property.total_revenue,
        Expenses: property.total_expenses,
        Profit: property.net_profit,
        'Profit Margin %': property.total_revenue > 0 ? ((property.net_profit / property.total_revenue) * 100).toFixed(2) : '0.00'
      });
    });

    // Add owner data
    report.owners.forEach(owner => {
      csvData.push({
        Type: 'Owner',
        Property: '',
        Owner: owner.owner_name,
        Revenue: owner.total_revenue,
        Expenses: owner.total_expenses,
        Profit: owner.net_profit,
        'Profit Margin %': owner.total_revenue > 0 ? ((owner.net_profit / owner.total_revenue) * 100).toFixed(2) : '0.00'
      });

      // Add owner property details
      owner.properties.forEach(property => {
        csvData.push({
          Type: 'Owner Property',
          Property: property.property_name,
          Owner: owner.owner_name,
          Revenue: property.attributed_revenue,
          Expenses: property.attributed_expenses,
          Profit: property.attributed_profit,
          'Profit Margin %': property.attributed_revenue > 0 ? ((property.attributed_profit / property.attributed_revenue) * 100).toFixed(2) : '0.00'
        });
      });
    });

    return Papa.unparse(csvData);
  }

  private generateReportHTML(report: FinancialReport, options: ReportExportOptions): string {
    const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Financial Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .header h1 { color: #1f2937; margin: 0; }
          .header p { color: #6b7280; margin: 5px 0; }
          .summary { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .summary h2 { color: #1f2937; margin-top: 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
          .summary-item { text-align: center; }
          .summary-item .label { font-size: 14px; color: #6b7280; margin-bottom: 5px; }
          .summary-item .value { font-size: 24px; font-weight: bold; color: #1f2937; }
          .summary-item.profit .value { color: #059669; }
          .summary-item.loss .value { color: #dc2626; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f9fafb; font-weight: 600; color: #374151; }
          .number { text-align: right; }
          .positive { color: #059669; }
          .negative { color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Financial Report</h1>
          <p>Period: ${formatDate(report.start_date)} - ${formatDate(report.end_date)}</p>
          <p>Generated: ${formatDate(report.generated_at)}</p>
        </div>

        <div class="summary">
          <h2>Financial Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="label">Total Revenue</div>
              <div class="value">${formatCurrency(report.totals.total_revenue)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total Expenses</div>
              <div class="value">${formatCurrency(report.totals.total_expenses)}</div>
            </div>
            <div class="summary-item ${report.totals.net_profit >= 0 ? 'profit' : 'loss'}">
              <div class="label">Net Profit</div>
              <div class="value">${formatCurrency(report.totals.net_profit)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Profit Margin</div>
              <div class="value">${report.totals.profit_margin.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Property Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th class="number">Revenue</th>
                <th class="number">Expenses</th>
                <th class="number">Net Profit</th>
                <th class="number">Bookings</th>
              </tr>
            </thead>
            <tbody>
              ${report.properties.map(property => `
                <tr>
                  <td>${property.property_name}</td>
                  <td class="number">${formatCurrency(property.total_revenue)}</td>
                  <td class="number">${formatCurrency(property.total_expenses)}</td>
                  <td class="number ${property.net_profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(property.net_profit)}</td>
                  <td class="number">${property.booking_count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Owner Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th class="number">Revenue</th>
                <th class="number">Expenses</th>
                <th class="number">Net Profit</th>
                <th class="number">Properties</th>
              </tr>
            </thead>
            <tbody>
              ${report.owners.map(owner => `
                <tr>
                  <td>${owner.owner_name}</td>
                  <td class="number">${formatCurrency(owner.total_revenue)}</td>
                  <td class="number">${formatCurrency(owner.total_expenses)}</td>
                  <td class="number ${owner.net_profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(owner.net_profit)}</td>
                  <td class="number">${owner.properties.length}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>This report was generated automatically by the Property Management System</p>
        </div>
      </body>
      </html>
    `;
  }
}