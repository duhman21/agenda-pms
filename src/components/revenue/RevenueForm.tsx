'use client';

import { useState, useEffect } from 'react';
import { Property, Booking } from '@/types';

interface RevenueFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  existingBooking?: Booking;
}

export default function RevenueForm({ onSuccess, onCancel, existingBooking }: RevenueFormProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    booking_id: existingBooking?.id || '',
    property_id: existingBooking?.property_id || '',
    guest_name: existingBooking?.guest_name || '',
    check_in: existingBooking?.check_in || '',
    check_out: existingBooking?.check_out || '',
    revenue: existingBooking?.revenue?.toString() || '',
    source: existingBooking?.source || 'manual'
  });

  const [isNewBooking, setIsNewBooking] = useState(!existingBooking);

  useEffect(() => {
    fetchProperties();
    if (!existingBooking) {
      fetchBookingsWithoutRevenue();
    }
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties');
      if (!response.ok) throw new Error('Failed to fetch properties');
      
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  };

  const fetchBookingsWithoutRevenue = async () => {
    try {
      const response = await fetch('/api/bookings?limit=100');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      
      const data = await response.json();
      // Filter bookings without revenue
      const bookingsWithoutRevenue = (data.bookings || []).filter(
        (booking: Booking) => !booking.revenue || booking.revenue === 0
      );
      setBookings(bookingsWithoutRevenue);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBookingSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bookingId = e.target.value;
    
    if (bookingId === 'new') {
      setIsNewBooking(true);
      setFormData(prev => ({
        ...prev,
        booking_id: '',
        property_id: '',
        guest_name: '',
        check_in: '',
        check_out: '',
        source: 'manual'
      }));
    } else if (bookingId) {
      const selectedBooking = bookings.find(b => b.id === bookingId);
      if (selectedBooking) {
        setIsNewBooking(false);
        setFormData(prev => ({
          ...prev,
          booking_id: selectedBooking.id,
          property_id: selectedBooking.property_id,
          guest_name: selectedBooking.guest_name || '',
          check_in: selectedBooking.check_in,
          check_out: selectedBooking.check_out,
          source: selectedBooking.source || 'manual'
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        booking_id: '',
        property_id: '',
        guest_name: '',
        check_in: '',
        check_out: '',
        source: 'manual'
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.revenue || parseFloat(formData.revenue) <= 0) {
        throw new Error('Revenue amount is required and must be greater than 0');
      }

      if (isNewBooking) {
        if (!formData.property_id || !formData.check_in || !formData.check_out) {
          throw new Error('Property, check-in, and check-out dates are required for new bookings');
        }

        // Validate dates
        const checkIn = new Date(formData.check_in);
        const checkOut = new Date(formData.check_out);
        
        if (checkOut <= checkIn) {
          throw new Error('Check-out date must be after check-in date');
        }
      }

      const payload = {
        ...formData,
        revenue: parseFloat(formData.revenue)
      };

      // Remove empty booking_id for new bookings
      if (isNewBooking) {
        delete payload.booking_id;
      }

      const response = await fetch('/api/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record revenue');
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset form if creating new booking
      if (isNewBooking) {
        setFormData({
          booking_id: '',
          property_id: '',
          guest_name: '',
          check_in: '',
          check_out: '',
          revenue: '',
          source: 'manual'
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record revenue');
    } finally {
      setLoading(false);
    }
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {existingBooking ? 'Update Revenue' : 'Record Revenue'}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!existingBooking && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Booking or Create New
            </label>
            <select
              value={formData.booking_id || (isNewBooking ? 'new' : '')}
              onChange={handleBookingSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select existing booking...</option>
              <option value="new">Create new booking with revenue</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {getPropertyName(booking.property_id)} - {booking.guest_name || 'No guest name'} 
                  ({new Date(booking.check_in).toLocaleDateString()} to {new Date(booking.check_out).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}

        {(isNewBooking || existingBooking) && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property *
              </label>
              <select
                name="property_id"
                value={formData.property_id}
                onChange={handleInputChange}
                required
                disabled={!!existingBooking}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select property...</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guest Name
              </label>
              <input
                type="text"
                name="guest_name"
                value={formData.guest_name}
                onChange={handleInputChange}
                disabled={!!existingBooking}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Enter guest name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Date *
                </label>
                <input
                  type="date"
                  name="check_in"
                  value={formData.check_in}
                  onChange={handleInputChange}
                  required
                  disabled={!!existingBooking}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date *
                </label>
                <input
                  type="date"
                  name="check_out"
                  value={formData.check_out}
                  onChange={handleInputChange}
                  required
                  disabled={!!existingBooking}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                disabled={!!existingBooking}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="manual">Manual Entry</option>
                <option value="airbnb">Airbnb</option>
                <option value="booking.com">Booking.com</option>
                <option value="vrbo">VRBO</option>
                <option value="direct">Direct Booking</option>
                <option value="other">Other</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Revenue Amount * ($)
          </label>
          <input
            type="number"
            name="revenue"
            value={formData.revenue}
            onChange={handleInputChange}
            required
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Recording...' : (existingBooking ? 'Update Revenue' : 'Record Revenue')}
          </button>
        </div>
      </form>
    </div>
  );
}