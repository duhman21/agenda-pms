import { ICalGenerator } from '../ical-generator';
import { Booking } from '@/types';

const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    tenant_id: 'tenant-1',
    property_id: 'property-1',
    guest_name: 'John Doe',
    check_in: '2025-02-01',
    check_out: '2025-02-03',
    revenue: 250.00,
    source: 'airbnb',
    ical_uid: 'booking-1@airbnb.com',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'booking-2',
    tenant_id: 'tenant-1',
    property_id: 'property-1',
    guest_name: 'Jane Smith',
    check_in: '2025-02-05',
    check_out: '2025-02-07',
    revenue: 300.00,
    source: 'booking.com',
    ical_uid: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

describe('ICalGenerator', () => {
  describe('generateICalContent', () => {
    it('should generate valid iCal content', () => {
      const icalContent = ICalGenerator.generateICalContent(mockBookings, 'Test Property');
      
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      expect(icalContent).toContain('VERSION:2.0');
      expect(icalContent).toContain('PRODID:-//Property Management System//Property Test Property//EN');
      expect(icalContent).toContain('X-WR-CALNAME:Test Property Bookings');
    });

    it('should include all bookings as events', () => {
      const icalContent = ICalGenerator.generateICalContent(mockBookings, 'Test Property');
      
      // Should have 2 VEVENT blocks
      const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(2);
      
      // Should contain booking details
      expect(icalContent).toContain('John Doe');
      expect(icalContent).toContain('Jane Smith');
      expect(icalContent).toContain('booking-1@airbnb.com');
      expect(icalContent).toContain('booking-booking-2@pms.local'); // Generated UID
    });

    it('should handle empty bookings array', () => {
      const icalContent = ICalGenerator.generateICalContent([], 'Test Property');
      
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      
      // Should have no events
      const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(0);
    });

    it('should properly escape special characters', () => {
      const bookingWithSpecialChars: Booking = {
        ...mockBookings[0],
        guest_name: 'John; Doe, Jr.\nWith newline',
        id: 'booking-special'
      };
      
      const icalContent = ICalGenerator.generateICalContent([bookingWithSpecialChars], 'Test Property');
      
      // Special characters should be escaped
      expect(icalContent).toContain('John\\; Doe\\, Jr.\\nWith newline');
    });
  });

  describe('generateICalForDateRange', () => {
    it('should filter bookings by date range', () => {
      const startDate = new Date('2025-02-04');
      const endDate = new Date('2025-02-08');
      
      const icalContent = ICalGenerator.generateICalForDateRange(
        mockBookings,
        'Test Property',
        startDate,
        endDate
      );
      
      // Should only include the second booking (Feb 5-7)
      expect(icalContent).toContain('Jane Smith');
      expect(icalContent).not.toContain('John Doe');
      
      const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(1);
    });

    it('should include all bookings when no date range specified', () => {
      const icalContent = ICalGenerator.generateICalForDateRange(
        mockBookings,
        'Test Property'
      );
      
      const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(2);
    });

    it('should handle bookings that partially overlap with date range', () => {
      const startDate = new Date('2025-02-02'); // Middle of first booking
      const endDate = new Date('2025-02-06'); // Middle of second booking
      
      const icalContent = ICalGenerator.generateICalForDateRange(
        mockBookings,
        'Test Property',
        startDate,
        endDate
      );
      
      // Should include both bookings as they overlap with the range
      const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(2);
    });
  });

  describe('validateICalContent', () => {
    it('should validate correct iCal content', () => {
      const icalContent = ICalGenerator.generateICalContent(mockBookings, 'Test Property');
      const validation = ICalGenerator.validateICalContent(icalContent);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required properties', () => {
      const invalidContent = `BEGIN:VCALENDAR
END:VCALENDAR`;
      
      const validation = ICalGenerator.validateICalContent(invalidContent);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing VERSION property');
      expect(validation.errors).toContain('Missing PRODID property');
    });

    it('should detect mismatched VEVENT blocks', () => {
      const invalidContent = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:test\r
BEGIN:VEVENT\r
UID:test\r
SUMMARY:Test\r
DTSTART:20250201T140000Z\r
DTEND:20250203T110000Z\r
BEGIN:VEVENT\r
UID:test2\r
SUMMARY:Test2\r
DTSTART:20250205T140000Z\r
DTEND:20250207T110000Z\r
END:VEVENT\r
END:VCALENDAR`;
      
      const validation = ICalGenerator.validateICalContent(invalidContent);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Mismatched BEGIN:VEVENT and END:VEVENT');
    });

    it('should detect missing calendar boundaries', () => {
      const invalidContent = `VERSION:2.0
PRODID:test`;
      
      const validation = ICalGenerator.validateICalContent(invalidContent);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing BEGIN:VCALENDAR');
      expect(validation.errors).toContain('Missing END:VCALENDAR');
    });
  });
});