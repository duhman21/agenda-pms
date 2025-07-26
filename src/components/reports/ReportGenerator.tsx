'use client';

import { useState } from 'react';
import { ReportGenerationRequest, FinancialReport } from '@/types';

interface ReportGeneratorProps {
  properties?: Array<{ id: string; name: string }>;
  owners?: Array<{ id: string; name: string }>;
}

export default function ReportGenerator({ properties = [], owners = [] }: ReportGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [formData, setFormData] = useState({
    report_type: 'monthly' as 'monthly' | 'custom',
    start_date: '',
    end_date: '',
    property_ids: [] as string[],
    owner_ids: [] as string[],
    format: 'json' as 'pdf' | 'csv' | 'json'
  });

  // Set default dates based on report type
  const setDefaultDates = (reportType: 'monthly' | 'custom') => {
    const now = new Date();
    
    if (reportType === 'monthly') {
      // Current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      setFormData(prev => ({
        ...prev,
        report_type: reportType,
        start_date: startOfMonth.toISOString().split('T')[0],
        end_date: endOfMonth.toISOString().split('T')[0]
      }));
    } else {
      // Last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      setFormData(prev => ({
        ...prev,
        report_type: reportType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const requestData: ReportGenerationRequest = {
        report_type: formData.report_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        property_ids: formData.property_ids.length > 0 ? formData.property_ids : undefined,
        owner_ids: formData.owner_ids.length > 0 ? formData.owner_ids : undefined,
        format: formData.format
      };

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      if (formData.format === 'json') {
        const data = await response.json();
        setReport(data.report);
      } else {
        // Handle file download for PDF and CSV
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
          `financial-report-${formData.start_date}-to-${formData.end_date}.${formData.format}`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message for downloads
        setReport({} as FinancialReport); // Placeholder to show success
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => 
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Financial Report</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="report_type"
                  value="monthly"
                  checked={formData.report_type === 'monthly'}
                  onChange={(e) => setDefaultDates(e.target.value as 'monthly')}
                  className="mr-2"
                />
                Monthly Report
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="report_type"
                  value="custom"
                  checked={formData.report_type === 'custom'}
                  onChange={(e) => setDefaultDates(e.target.value as 'custom')}
                  className="mr-2"
                />
                Custom Date Range
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Property Filter */}
          {properties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Properties (optional - leave empty for all)
              </label>
              <select
                multiple
                value={formData.property_ids}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData(prev => ({ ...prev, property_ids: values }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={Math.min(properties.length, 5)}
              >
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple properties
              </p>
            </div>
          )}

          {/* Owner Filter */}
          {owners.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owners (optional - leave empty for all)
              </label>
              <select
                multiple
                value={formData.owner_ids}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData(prev => ({ ...prev, owner_ids: values }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={Math.min(owners.length, 5)}
              >
                {owners.map(owner => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple owners
              </p>
            </div>
          )}

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={formData.format === 'json'}
                  onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as 'json' }))}
                  className="mr-2"
                />
                View Online
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={formData.format === 'pdf'}
                  onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as 'pdf' }))}
                  className="mr-2"
                />
                Download PDF
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={formData.format === 'csv'}
                  onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as 'csv' }))}
                  className="mr-2"
                />
                Download CSV
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Report...' : 'Generate Report'}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Report Display */}
        {report && formData.format === 'json' && (
          <div className="mt-8 space-y-6">
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Financial Report: {formatDate(report.start_date)} - {formatDate(report.end_date)}
              </h3>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800">Total Revenue</h4>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(report.totals.total_revenue)}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800">Total Expenses</h4>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(report.totals.total_expenses)}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${report.totals.net_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <h4 className={`text-sm font-medium ${report.totals.net_profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    Net Profit
                  </h4>
                  <p className={`text-2xl font-bold ${report.totals.net_profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(report.totals.net_profit)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800">Profit Margin</h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.totals.profit_margin.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Property Performance */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Property Performance</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Property
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expenses
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Net Profit
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bookings
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.properties.map((property) => (
                        <tr key={property.property_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {property.property_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(property.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(property.total_expenses)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                            property.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(property.net_profit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {property.booking_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Owner Performance */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Owner Performance</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expenses
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Net Profit
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Properties
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.owners.map((owner) => (
                        <tr key={owner.owner_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {owner.owner_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(owner.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(owner.total_expenses)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                            owner.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(owner.net_profit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {owner.properties.length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success message for downloads */}
        {report && formData.format !== 'json' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">
              Report generated successfully! Your {formData.format.toUpperCase()} file should start downloading shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}