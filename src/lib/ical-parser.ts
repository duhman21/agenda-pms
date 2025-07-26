import * as ical from 'node-ical';
import { Booking } from '@/types';

export interface ParsedBooking {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

export interface ICalParseResult {
  bookings: ParsedBooking[];
  errors: string[];
}

export class ICalParser {
  /**
   * Parse iCal data from a URL or string content
   */
  static async parseFromUrl(url: string): Promise<ICalParseResult> {
    try {
      const events = await ical.fromURL(url);
      return this.processEvents(events);
    } catch (error) {
      return {
        bookings: [],
        errors: [`Failed to fetch iCal from URL: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  static async parseFromString(icalData: string): Promise<ICalParseResult> {
    try {
      const events = ical.parseICS(icalData);
      return this.processEvents(events);
    } catch (error) {
      return {
        bookings: [],
        errors: [`Failed to parse iCal data: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private static processEvents(events: any): ICalParseResult {
    const bookings: ParsedBooking[] = [];
    const errors: string[] = [];

    for (const key in events) {
      const event = events[key];
      
      // Only process VEVENT components
      if (event.type !== 'VEVENT') {
        continue;
      }

      try {
        // Skip events without required fields
        if (!event.uid || !event.start || !event.end) {
          errors.push(`Skipping event without required fields: ${event.uid || 'unknown'}`);
          continue;
        }

        // Convert dates to proper Date objects
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);

        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          errors.push(`Invalid dates for event: ${event.uid}`);
          continue;
        }

        // Skip events that end before they start
        if (endDate <= startDate) {
          errors.push(`Invalid date range for event: ${event.uid}`);
          continue;
        }

        bookings.push({
          uid: event.uid,
          summary: event.summary || 'Untitled Booking',
          start: startDate,
          end: endDate,
          description: event.description,
          location: event.location
        });
      } catch (error) {
        errors.push(`Error processing event ${event.uid}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { bookings, errors };
  }

  /**
   * Convert parsed booking to database booking format
   */
  static convertToBooking(
    parsedBooking: ParsedBooking,
    propertyId: string,
    tenantId: string,
    source: string = 'ical'
  ): Omit<Booking, 'id' | 'created_at' | 'updated_at'> {
    return {
      tenant_id: tenantId,
      property_id: propertyId,
      guest_name: parsedBooking.summary,
      check_in: parsedBooking.start.toISOString().split('T')[0],
      check_out: parsedBooking.end.toISOString().split('T')[0],
      source,
      ical_uid: parsedBooking.uid
    };
  }
}

/**
 * Detect booking overlaps
 */
export class BookingOverlapDetector {
  /**
   * Check if two bookings overlap
   */
  static doBookingsOverlap(booking1: ParsedBooking, booking2: ParsedBooking): boolean {
    return booking1.start < booking2.end && booking2.start < booking1.end;
  }

  /**
   * Find overlapping bookings in a list
   */
  static findOverlaps(bookings: ParsedBooking[]): Array<{
    booking1: ParsedBooking;
    booking2: ParsedBooking;
  }> {
    const overlaps: Array<{ booking1: ParsedBooking; booking2: ParsedBooking }> = [];
    
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        if (this.doBookingsOverlap(bookings[i], bookings[j])) {
          overlaps.push({
            booking1: bookings[i],
            booking2: bookings[j]
          });
        }
      }
    }
    
    return overlaps;
  }

  /**
   * Check if a new booking overlaps with existing bookings
   */
  static checkNewBookingOverlap(
    newBooking: ParsedBooking,
    existingBookings: ParsedBooking[]
  ): ParsedBooking[] {
    return existingBookings.filter(existing => 
      this.doBookingsOverlap(newBooking, existing)
    );
  }
}