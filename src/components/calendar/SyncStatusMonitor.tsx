'use client';

import { useState, useEffect } from 'react';
import { Property, ICalSyncStatus } from '@/types';

interface SyncStatusMonitorProps {
  properties: Property[];
  refreshInterval?: number; // in milliseconds, default 30 seconds
}

interface SyncStatusWithProperty extends ICalSyncStatus {
  property_name: string;
}

export default function SyncStatusMonitor({ 
  properties, 
  refreshInterval = 30000 
}: SyncStatusMonitorProps) {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatusWithProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchSyncStatuses();
    
    // Set up periodic refresh
    const interval = setInterval(fetchSyncStatuses, refreshInterval);
    
    return () => clearInterval(interval);
  }, [properties, refreshInterval]);

  const fetchSyncStatuses = async () => {
    if (properties.length === 0) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/calendar/sync');
      const data = await response.json();
      
      if (data.success) {
        // Combine sync status with property names
        const statusesWithNames = data.sync_status.map((status: ICalSyncStatus) => {
          const property = properties.find(p => p.id === status.property_id);
          return {
            ...status,
            property_name: property?.name || 'Unknown Property'
          };
        });
        
        setSyncStatuses(statusesWithNames);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch sync statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="text-green-500">✓</span>;
      case 'error':
        return <span className="text-red-500">✗</span>;
      case 'in_progress':
        return <span className="text-yellow-500 animate-spin">⟳</span>;
      default:
        return <span className="text-gray-400">-</span>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'in_progress': return 'Syncing...';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getNextSyncText = (nextSync: string | null) => {
    if (!nextSync) return 'Not scheduled';
    
    const nextSyncDate = new Date(nextSync);
    const now = new Date();
    const diffMs = nextSyncDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Due now';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) return `In ${diffMinutes} minutes`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `In ${diffHours} hours`;
  };

  const hasErrors = syncStatuses.some(status => status.last_sync_status === 'error');
  const hasInProgress = syncStatuses.some(status => status.last_sync_status === 'in_progress');

  // Filter properties that have iCal URLs configured
  const propertiesWithIcal = properties.filter(p => p.ical_import_url);
  
  if (propertiesWithIcal.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">ℹ</span>
          <span className="text-blue-800 text-sm">
            No properties have iCal sync configured. Add iCal URLs to your properties to enable automatic calendar synchronization.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Calendar Sync Status</h3>
          {hasErrors && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              Errors
            </span>
          )}
          {hasInProgress && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              Syncing
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {lastUpdated && (
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={fetchSyncStatuses}
            disabled={loading}
            className="p-1 hover:bg-gray-100 rounded"
            title="Refresh status"
          >
            <span className={loading ? 'animate-spin' : ''}>⟳</span>
          </button>
        </div>
      </div>

      <div className="divide-y">
        {propertiesWithIcal.map(property => {
          const status = syncStatuses.find(s => s.property_id === property.id);
          
          return (
            <div key={property.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{property.name}</h4>
                    {status && getStatusIcon(status.last_sync_status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Status:</span>
                      <span className="ml-1">
                        {status ? getStatusText(status.last_sync_status) : 'No sync data'}
                      </span>
                    </div>
                    
                    <div>
                      <span className="font-medium">Last Sync:</span>
                      <span className="ml-1">
                        {formatDate(status?.last_sync || null)}
                      </span>
                    </div>
                    
                    <div>
                      <span className="font-medium">Next Sync:</span>
                      <span className="ml-1">
                        {getNextSyncText(status?.next_sync || null)}
                      </span>
                    </div>
                  </div>
                  
                  {status?.last_error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <span className="font-medium text-red-800">Error:</span>
                      <span className="ml-1 text-red-700">{status.last_error}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 border-t text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>
            {propertiesWithIcal.length} properties configured for sync
          </span>
          <span>
            Auto-sync runs every 15 minutes
          </span>
        </div>
      </div>
    </div>
  );
}