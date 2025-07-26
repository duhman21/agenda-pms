'use client';

import { useState, useEffect } from 'react';
import { Property } from '@/types';

interface ICalSyncSettingsProps {
  property: Property;
  onUpdate?: (property: Property) => void;
}

interface SyncStatus {
  property_id: string;
  last_sync: string | null;
  last_sync_status: 'success' | 'error' | 'in_progress';
  last_error?: string;
  next_sync?: string;
}

export default function ICalSyncSettings({ property, onUpdate }: ICalSyncSettingsProps) {
  const [icalUrl, setIcalUrl] = useState(property.ical_import_url || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSyncStatus();
  }, [property.id]);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`/api/calendar/sync?property_id=${property.id}`);
      const data = await response.json();
      
      if (data.success && data.sync_status.length > 0) {
        setSyncStatus(data.sync_status[0]);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const handleUpdateUrl = async () => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/properties/${property.id}/ical`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ical_import_url: icalUrl.trim() || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'iCal URL updated successfully' });
        onUpdate?.(data.property);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update iCal URL' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update iCal URL' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSync = async () => {
    if (!property.ical_import_url) {
      setMessage({ type: 'error', text: 'Please set an iCal URL first' });
      return;
    }

    setIsSyncing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result = data.result;
        setMessage({ 
          type: 'success', 
          text: `Sync completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped` 
        });
        fetchSyncStatus(); // Refresh status
      } else {
        const errors = data.result?.errors || ['Sync failed'];
        setMessage({ type: 'error', text: errors.join(', ') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync calendar' });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'in_progress': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">iCal Sync Settings</h3>
      
      {/* iCal URL Input */}
      <div className="mb-4">
        <label htmlFor="ical-url" className="block text-sm font-medium text-gray-700 mb-2">
          iCal Import URL
        </label>
        <div className="flex gap-2">
          <input
            id="ical-url"
            type="url"
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://example.com/calendar.ics"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleUpdateUrl}
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Enter the iCal feed URL from your OTA platform (Airbnb, Booking.com, etc.)
        </p>
      </div>

      {/* Export URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          iCal Export URL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={`${window.location.origin}/api/properties/${property.id}/ical/export?token=${property.ical_export_token}`}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/api/properties/${property.id}/ical/export?token=${property.ical_export_token}`);
              setMessage({ type: 'success', text: 'Export URL copied to clipboard' });
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Copy
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Use this URL to sync your bookings to OTA platforms
        </p>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sync Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Last Sync:</span>
              <span className="ml-2">{formatDate(syncStatus.last_sync)}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-medium ${getStatusColor(syncStatus.last_sync_status)}`}>
                {syncStatus.last_sync_status}
              </span>
            </div>
            {syncStatus.next_sync && (
              <div>
                <span className="text-gray-600">Next Sync:</span>
                <span className="ml-2">{formatDate(syncStatus.next_sync)}</span>
              </div>
            )}
            {syncStatus.last_error && (
              <div className="col-span-2">
                <span className="text-gray-600">Last Error:</span>
                <span className="ml-2 text-red-600">{syncStatus.last_error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Button */}
      <div className="mb-4">
        <button
          onClick={handleSync}
          disabled={isSyncing || !property.ical_import_url}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
        <p className="text-sm text-gray-500 mt-1">
          Manually trigger a sync of the iCal feed. Automatic sync runs every 15 minutes.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}