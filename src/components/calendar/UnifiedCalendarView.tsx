'use client';

import { useState, useEffect } from 'react';
import { Booking, Property } from '@/types';

interface CalendarDay {
  date: Date;
  bookings: Booking[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface UnifiedCalendarViewProps {
  properties?: Property[];
  selectedPropertyId?: string;
  onBookingClick?: (booking: Booking) => void;
}

export default function UnifiedCalendarView({ 
  properties = [], 
  selectedPropertyId,
  onBookingClick 
}: UnifiedCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [currentDate, selectedPropertyId]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      let url = `/api/bookings?start=${startOfMonth.toISOString().split('T')[0]}&end=${endOfMonth.toISOString().split('T')[0]}`;
      
      if (selectedPropertyId) {
        url += `&property_id=${selectedPropertyId}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setBookings(data.bookings || []);
      } else {
        setError(data.error || 'Failed to fetch bookings');
      }
    } catch (error) {
      setError('Failed to fetch bookings');
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(firstDayOfMonth);
      date.setDate(date.getDate() - (i + 1));
      days.push({
        date,
        bookings: getBookingsForDate(date),
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Add days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        bookings: getBookingsForDate(date),
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime()
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        bookings: getBookingsForDate(date),
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  };

  const getBookingsForDate = (date: Date): Booking[] => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      const checkIn = booking.check_in;
      const checkOut = booking.check_out;
      return dateStr >= checkIn && dateStr < checkOut;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getPropertyName = (propertyId: string): string => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  const getBookingColor = (booking: Booking): string => {
    // Color code by source
    switch (booking.source?.toLowerCase()) {
      case 'airbnb': return 'bg-red-100 border-red-300 text-red-800';
      case 'booking.com': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'vrbo': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'direct': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const calendarDays = generateCalendarDays();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">
          {selectedPropertyId ? `${getPropertyName(selectedPropertyId)} Calendar` : 'All Properties Calendar'}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-md"
              disabled={loading}
            >
              ←
            </button>
            <span className="font-medium min-w-[150px] text-center">{monthYear}</span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-md"
              disabled={loading}
            >
              →
            </button>
          </div>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[100px] p-1 border rounded-md ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${day.isToday ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.date.getDate()}
              </div>
              
              {/* Bookings for this day */}
              <div className="space-y-1">
                {day.bookings.slice(0, 3).map((booking, bookingIndex) => (
                  <div
                    key={booking.id}
                    onClick={() => onBookingClick?.(booking)}
                    className={`text-xs p-1 rounded border cursor-pointer hover:opacity-80 ${getBookingColor(booking)}`}
                    title={`${booking.guest_name || 'Guest'} - ${getPropertyName(booking.property_id)}`}
                  >
                    <div className="truncate font-medium">
                      {booking.guest_name || 'Guest'}
                    </div>
                    {!selectedPropertyId && (
                      <div className="truncate text-xs opacity-75">
                        {getPropertyName(booking.property_id)}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Show "more" indicator if there are additional bookings */}
                {day.bookings.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.bookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>Airbnb</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Booking.com</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>VRBO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Direct</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Other</span>
          </div>
        </div>
      </div>
    </div>
  );
}