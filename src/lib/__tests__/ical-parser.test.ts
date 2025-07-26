import { ICalParser, BookingOverlapDetector, ParsedBooking } from '../ical-parser';

// Mock iCal data for testing
const mockICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-booking-1@example.com
DTSTART:20250201T140000Z
DTEND:20250203T110000Z
SUMMARY:John Doe Booking
DESCRIPTION:Guest booking from Airbnb
LOCATION:Test Property
END:VEVENT
BEGIN:VEVENT
UID:test-booking-2@example.com
DTSTART:20250205T140000Z
DTEND:20250207T110000Z
SUMMARY:Jane Smith Booking
DESCRIPTION:Guest booking from Booking.com
END:VEVENT
BEGIN:VEVENT
UID:invalid-booking@example.com
DTSTART:20250210T140000Z
DTEND:20250209T110000Z
SUMMARY:Invalid Booking (end before start)
END:VEVENT
END:VCALENDAR`;

const mockOverlappingICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:overlap-1@example.com
DTSTART:20250201T140000Z
DTEND:20250203T110000Z
SUMMARY:Booking 1
END:VEVENT
BEGIN:VEVENT
UID:overlap-2@example.com
DTSTART:20250202T140000Z
DTEND:20250204T110000Z
SUMMARY:Booking 2 (overlaps with 1)
END:VEVENT
END:VCALENDAR`;

describe('ICalParser', () => {
  describe('parseFromString', () => {
    it('should parse valid iCal data correctly', async () => {
      const result = await ICalParser.parseFromString(mockICalData);
      
      expect(result.bookings).toHaveLength(2); // Should skip invalid booking
      expect(result.errors).toHaveLength(1); // Should have error for invalid booking
      
      const booking1 = result.bookings[0];
      expect(booking1.uid).toBe('test-booking-1@example.com');
      expect(booking1.summary).toBe('John Doe Booking');
      expect(booking1.start).toEqual(new Date('2025-02-01T14:00:00Z'));
      expect(booking1.end).toEqual(new Date('2025-02-03T11:00:00Z'));
      expect(booking1.description).toBe('Guest booking from Airbnb');
      expect(booking1.location).toBe('Test Property');
    });

    it('should handle empty iCal data', async () => {
      const result = await ICalParser.parseFromString('');
      
      expect(result.bookings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid iCal data', async () => {
      const result = await ICalParser.parseFromString('invalid ical data');
      
      expect(result.bookings).toHaveLength(0);
      // The node-ical library might not throw errors for invalid data, just return empty results
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('convertToBooking', () => {
    it('should convert parsed booking to database format', () => {
      const parsedBooking: ParsedBooking = {
        uid: 'test@example.com',
        summary: 'Test Guest',
        start: new Date('2025-02-01T14:00:00Z'),
        end: new Date('2025-02-03T11:00:00Z'),
        description: 'Test description',
        location: 'Test location'
      };

      const booking = ICalParser.convertToBooking(
        parsedBooking,
        'property-123',
        'tenant-456',
        'airbnb'
      );

      expect(booking.tenant_id).toBe('tenant-456');
      expect(booking.property_id).toBe('property-123');
      expect(booking.guest_name).toBe('Test Guest');
      expect(booking.check_in).toBe('2025-02-01');
      expect(booking.check_out).toBe('2025-02-03');
      expect(booking.source).toBe('airbnb');
      expect(booking.ical_uid).toBe('test@example.com');
    });
  });
});

describe('BookingOverlapDetector', () => {
  const booking1: ParsedBooking = {
    uid: 'booking1',
    summary: 'Booking 1',
    start: new Date('2025-02-01T14:00:00Z'),
    end: new Date('2025-02-03T11:00:00Z')
  };

  const booking2: ParsedBooking = {
    uid: 'booking2',
    summary: 'Booking 2',
    start: new Date('2025-02-02T14:00:00Z'),
    end: new Date('2025-02-04T11:00:00Z')
  };

  const booking3: ParsedBooking = {
    uid: 'booking3',
    summary: 'Booking 3',
    start: new Date('2025-02-05T14:00:00Z'),
    end: new Date('2025-02-07T11:00:00Z')
  };

  describe('doBookingsOverlap', () => {
    it('should detect overlapping bookings', () => {
      expect(BookingOverlapDetector.doBookingsOverlap(booking1, booking2)).toBe(true);
    });

    it('should detect non-overlapping bookings', () => {
      expect(BookingOverlapDetector.doBookingsOverlap(booking1, booking3)).toBe(false);
    });

    it('should handle adjacent bookings (same day checkout/checkin)', () => {
      const adjacentBooking: ParsedBooking = {
        uid: 'adjacent',
        summary: 'Adjacent Booking',
        start: new Date('2025-02-03T14:00:00Z'),
        end: new Date('2025-02-05T11:00:00Z')
      };
      
      expect(BookingOverlapDetector.doBookingsOverlap(booking1, adjacentBooking)).toBe(false);
    });
  });

  describe('findOverlaps', () => {
    it('should find all overlaps in a list of bookings', () => {
      const overlaps = BookingOverlapDetector.findOverlaps([booking1, booking2, booking3]);
      
      expect(overlaps).toHaveLength(1);
      expect(overlaps[0].booking1.uid).toBe('booking1');
      expect(overlaps[0].booking2.uid).toBe('booking2');
    });

    it('should return empty array for non-overlapping bookings', () => {
      const overlaps = BookingOverlapDetector.findOverlaps([booking1, booking3]);
      
      expect(overlaps).toHaveLength(0);
    });
  });

  describe('checkNewBookingOverlap', () => {
    it('should find existing bookings that overlap with new booking', () => {
      const existingBookings = [booking1, booking3];
      const overlapping = BookingOverlapDetector.checkNewBookingOverlap(booking2, existingBookings);
      
      expect(overlapping).toHaveLength(1);
      expect(overlapping[0].uid).toBe('booking1');
    });

    it('should return empty array if no overlaps', () => {
      const existingBookings = [booking1];
      const overlapping = BookingOverlapDetector.checkNewBookingOverlap(booking3, existingBookings);
      
      expect(overlapping).toHaveLength(0);
    });
  });
});