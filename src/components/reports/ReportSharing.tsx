'use client';

import { useState, useEffect } from 'react';
import { SharedReport, EmailReportSchedule, FinancialReport } from '@/types';

interface ReportSharingProps {
  report?: FinancialReport;
  owners?: Array<{ id: string; name: string; email?: string }>;
  properties?: Array<{ id: string; name: string }>;
}

export default function ReportSharing({ report, owners = [], properties = [] }: ReportSharingProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'schedules'>('share');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Share report state
  const [shareData, setShareData] = useState({
    shared_with_email: '',
    expires_in_days: 30,
    max_access_count: 10,
    format: 'pdf' as 'pdf' | 'csv' | 'json'
  });
  const [sharedReports, setSharedReports] = useState<SharedReport[]>([]);

  // Email schedule state
  const [scheduleData, setScheduleData] = useState({
    owner_id: '',
    property_ids: [] as string[],
    schedule_type: 'monthly' as 'monthly' | 'weekly' | 'quarterly',
    day_of_month: 1,
    day_of_week: 1,
    format: 'pdf' as 'pdf' | 'csv'
  });
  const [emailSchedules, setEmailSchedules] = useState<EmailReportSchedule[]>([]);

  useEffect(() => {
    if (activeTab === 'share') {
      fetchSharedReports();
    } else {
      fetchEmailSchedules();
    }
  }, [activeTab]);

  const fetchSharedReports = async () => {
    try {
      const response = await fetch('/api/reports/share');
      if (response.ok) {
        const data = await response.json();
        setSharedReports(data.shared_reports || []);
      }
    } catch (err) {
      console.error('Error fetching shared reports:', err);
    }
  };

  const fetchEmailSchedules = async () => {
    try {
      const response = await fetch('/api/reports/email-schedule');
      if (response.ok) {
        const data = await response.json();
        setEmailSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error('Error fetching email schedules:', err);
    }
  };

  const handleShareReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) {
      setError('No report to share');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_data: report,
          ...shareData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share report');
      }

      const data = await response.json();
      setSuccess(`Report shared successfully! Share URL: ${data.share_url}`);
      setShareData({
        shared_with_email: '',
        expires_in_days: 30,
        max_access_count: 10,
        format: 'pdf'
      });
      fetchSharedReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/reports/email-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create email schedule');
      }

      setSuccess('Email schedule created successfully!');
      setScheduleData({
        owner_id: '',
        property_ids: [],
        schedule_type: 'monthly',
        day_of_month: 1,
        day_of_week: 1,
        format: 'pdf'
      });
      fetchEmailSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleScheduleStatus = async (scheduleId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/reports/email-schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: scheduleId,
          is_active: !isActive
        }),
      });

      if (response.ok) {
        fetchEmailSchedules();
      }
    } catch (err) {
      console.error('Error toggling schedule status:', err);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this email schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/email-schedule?id=${scheduleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEmailSchedules();
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const getScheduleDescription = (schedule: EmailReportSchedule) => {
    switch (schedule.schedule_type) {
      case 'monthly':
        return `Monthly on day ${schedule.day_of_month}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[schedule.day_of_week || 0]}`;
      case 'quarterly':
        return `Quarterly on day ${schedule.day_of_month}`;
      default:
        return schedule.schedule_type;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('share')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'share'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Share Reports
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'schedules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Email Schedules
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Share Reports Tab */}
          {activeTab === 'share' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Report</h3>
                
                {!report && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                    <p className="text-yellow-800">Generate a report first to enable sharing</p>
                  </div>
                )}

                <form onSubmit={handleShareReport} className="space-y-4">
                  <div>
                    <label htmlFor="shared_with_email" className="block text-sm font-medium text-gray-700 mb-2">
                      Share with Email (optional)
                    </label>
                    <input
                      type="email"
                      id="shared_with_email"
                      value={shareData.shared_with_email}
                      onChange={(e) => setShareData(prev => ({ ...prev, shared_with_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="recipient@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="expires_in_days" className="block text-sm font-medium text-gray-700 mb-2">
                        Expires in Days
                      </label>
                      <input
                        type="number"
                        id="expires_in_days"
                        min="1"
                        max="365"
                        value={shareData.expires_in_days}
                        onChange={(e) => setShareData(prev => ({ ...prev, expires_in_days: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="max_access_count" className="block text-sm font-medium text-gray-700 mb-2">
                        Max Access Count
                      </label>
                      <input
                        type="number"
                        id="max_access_count"
                        min="1"
                        max="100"
                        value={shareData.max_access_count}
                        onChange={(e) => setShareData(prev => ({ ...prev, max_access_count: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                      <select
                        value={shareData.format}
                        onChange={(e) => setShareData(prev => ({ ...prev, format: e.target.value as 'pdf' | 'csv' | 'json' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pdf">PDF</option>
                        <option value="csv">CSV</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !report}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sharing...' : 'Share Report'}
                  </button>
                </form>
              </div>

              {/* Shared Reports List */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Shared Reports</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shared With
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expires
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Access Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sharedReports.map((sharedReport) => (
                        <tr key={sharedReport.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sharedReport.shared_with_email || 'Public link'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sharedReport.expires_at ? formatDate(sharedReport.expires_at) : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sharedReport.access_count}
                            {sharedReport.max_access_count && ` / ${sharedReport.max_access_count}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              sharedReport.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {sharedReport.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(sharedReport.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Email Schedules Tab */}
          {activeTab === 'schedules' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Email Schedule</h3>
                
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                  <div>
                    <label htmlFor="owner_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Property Owner *
                    </label>
                    <select
                      id="owner_id"
                      value={scheduleData.owner_id}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, owner_id: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an owner</option>
                      {owners.map(owner => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name} {owner.email && `(${owner.email})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Properties (optional - leave empty for all)
                    </label>
                    <select
                      multiple
                      value={scheduleData.property_ids}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setScheduleData(prev => ({ ...prev, property_ids: values }));
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type</label>
                      <select
                        value={scheduleData.schedule_type}
                        onChange={(e) => setScheduleData(prev => ({ 
                          ...prev, 
                          schedule_type: e.target.value as 'monthly' | 'weekly' | 'quarterly' 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>

                    {scheduleData.schedule_type === 'weekly' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                        <select
                          value={scheduleData.day_of_week}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={scheduleData.day_of_month}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, day_of_month: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                      <select
                        value={scheduleData.format}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, format: e.target.value as 'pdf' | 'csv' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pdf">PDF</option>
                        <option value="csv">CSV</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Schedule'}
                  </button>
                </form>
              </div>

              {/* Email Schedules List */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Email Schedules</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Schedule
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Format
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Next Send
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {emailSchedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {schedule.user_profiles?.first_name} {schedule.user_profiles?.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getScheduleDescription(schedule)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 uppercase">
                            {schedule.format}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(schedule.next_send)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {schedule.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => toggleScheduleStatus(schedule.id, schedule.is_active)}
                              className={`${
                                schedule.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {schedule.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteSchedule(schedule.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}