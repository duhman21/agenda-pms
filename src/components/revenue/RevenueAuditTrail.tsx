'use client';

import { useState, useEffect } from 'react';
import { AuditLog, UserProfile } from '@/types';

interface RevenueAuditTrailProps {
  userProfile: UserProfile;
}

export default function RevenueAuditTrail({ userProfile }: RevenueAuditTrailProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAction, setSelectedAction] = useState<string>('');

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, selectedAction]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        table_name: 'bookings' // Focus on booking changes which affect revenue
      });

      if (selectedAction) {
        params.append('action', selectedAction);
      }

      const response = await fetch(`/api/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data = await response.json();
      setAuditLogs(data.audit_logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRevenueChange = (log: AuditLog) => {
    if (log.action === 'INSERT' && log.new_values) {
      const newRevenue = (log.new_values as any).revenue;
      return newRevenue ? `Added ${formatCurrency(newRevenue)}` : 'No revenue';
    }
    
    if (log.action === 'UPDATE' && log.old_values && log.new_values) {
      const oldRevenue = (log.old_values as any).revenue || 0;
      const newRevenue = (log.new_values as any).revenue || 0;
      
      if (oldRevenue !== newRevenue) {
        const change = newRevenue - oldRevenue;
        return `${change > 0 ? '+' : ''}${formatCurrency(change)} (${formatCurrency(oldRevenue)} → ${formatCurrency(newRevenue)})`;
      }
    }
    
    if (log.action === 'DELETE' && log.old_values) {
      const oldRevenue = (log.old_values as any).revenue;
      return oldRevenue ? `Removed ${formatCurrency(oldRevenue)}` : 'No revenue impact';
    }
    
    return 'No revenue change';
  };

  const getBookingDetails = (log: AuditLog) => {
    const values = log.new_values || log.old_values;
    if (!values) return 'Unknown booking';
    
    const booking = values as any;
    const guestName = booking.guest_name || 'Unknown guest';
    const checkIn = booking.check_in ? new Date(booking.check_in).toLocaleDateString() : 'Unknown';
    const checkOut = booking.check_out ? new Date(booking.check_out).toLocaleDateString() : 'Unknown';
    
    return `${guestName} (${checkIn} - ${checkOut})`;
  };

  if (loading && auditLogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Revenue Audit Trail</h2>
        <div className="flex space-x-4">
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            <option value="INSERT">Created</option>
            <option value="UPDATE">Updated</option>
            <option value="DELETE">Deleted</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        {auditLogs.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No audit logs found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue Impact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {getBookingDetails(log)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">
                        {getRevenueChange(log)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.user_id ? 'System User' : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {auditLogs.filter(log => log.action === 'INSERT').length}
            </div>
            <div className="text-sm text-gray-500">Records Created</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {auditLogs.filter(log => log.action === 'UPDATE').length}
            </div>
            <div className="text-sm text-gray-500">Records Updated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {auditLogs.filter(log => log.action === 'DELETE').length}
            </div>
            <div className="text-sm text-gray-500">Records Deleted</div>
          </div>
        </div>
      </div>
    </div>
  );
}