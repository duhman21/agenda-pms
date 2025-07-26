import { Booking } from '@/types';

export interface ICalEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

export class ICalGenerator {
  /**
   * Generate iCal content from bookings
   */
  static generateICalContent(bookings: Booking[], propertyName: string): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//Property Management System//Property ${propertyName}//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${propertyName} Bookings`,
      `X-WR-CALDESC:Booking calendar for ${propertyName}`,
      'X-WR-TIMEZONE:UTC'
    ].join('\r\n');

    for (const booking of bookings) {
      const event = this.bookingToICalEvent(booking);
      icalContent += '\r\n' + this.generateEventContent(event, timestamp);
    }

    icalContent += '\r\nEND:VCALENDAR';
    
    return icalContent;
  }

  /**
   * Convert booking to iCal event format
   */
  private static bookingToICalEvent(booking: Booking): ICalEvent {
    const checkIn = new Date(booking.check_in + 'T15:00:00Z'); // 3 PM UTC check-in
    const checkOut = new Date(booking.check_out + 'T11:00:00Z'); // 11 AM UTC check-out

    return {
      uid: booking.ical_uid || `booking-${booking.id}@pms.local`,
      summary: booking.guest_name || 'Booking',
      start: checkIn,
      end: checkOut,
      description: this.generateEventDescription(booking),
      location: undefined // Could be added if property address is available
    };
  }

  /**
   * Generate event description with booking details
   */
  private static generateEventDescription(booking: Booking): string {
    const parts = [];
    
    if (booking.guest_name) {
      parts.push(`Guest: ${booking.guest_name}`);
    }
    
    if (booking.source) {
      parts.push(`Source: ${booking.source}`);
    }
    
    if (booking.revenue) {
      parts.push(`Revenue: $${booking.revenue.toFixed(2)}`);
    }
    
    parts.push(`Check-in: ${booking.check_in}`);
    parts.push(`Check-out: ${booking.check_out}`);
    
    return parts.join('\\n');
  }

  /**
   * Generate individual event content
   */
  private static generateEventContent(event: ICalEvent, timestamp: string): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };

    const lines = [
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${formatDate(event.start)}`,
      `DTEND:${formatDate(event.end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE'
    ];

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }

    lines.push('END:VEVENT');

    return lines.join('\r\n');
  }

  /**
   * Generate iCal content for a date range
   */
  static generateICalForDateRange(
    bookings: Booking[],
    propertyName: string,
    startDate?: Date,
    endDate?: Date
  ): string {
    let filteredBookings = bookings;

    if (startDate || endDate) {
      filteredBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.check_in);
        const bookingEnd = new Date(booking.check_out);

        if (startDate && bookingEnd < startDate) {
          return false;
        }

        if (endDate && bookingStart > endDate) {
          return false;
        }

        return true;
      });
    }

    return this.generateICalContent(filteredBookings, propertyName);
  }

  /**
   * Validate iCal content format
   */
  static validateICalContent(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\r\n');

    // Check basic structure
    if (!lines.includes('BEGIN:VCALENDAR')) {
      errors.push('Missing BEGIN:VCALENDAR');
    }

    if (!lines.includes('END:VCALENDAR')) {
      errors.push('Missing END:VCALENDAR');
    }

    // Check for required properties
    const hasVersion = lines.some(line => line.startsWith('VERSION:'));
    if (!hasVersion) {
      errors.push('Missing VERSION property');
    }

    const hasProdId = lines.some(line => line.startsWith('PRODID:'));
    if (!hasProdId) {
      errors.push('Missing PRODID property');
    }

    // Check event structure
    const eventStarts = lines.filter(line => line === 'BEGIN:VEVENT').length;
    const eventEnds = lines.filter(line => line === 'END:VEVENT').length;

    if (eventStarts !== eventEnds) {
      errors.push('Mismatched BEGIN:VEVENT and END:VEVENT');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}