import { createServerSupabaseClient } from '@/lib/supabase';
import { ICalParser, BookingOverlapDetector, ParsedBooking } from '@/lib/ical-parser';
import { Booking, Property } from '@/types';

export interface SyncResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  overlaps: Array<{
    booking1: ParsedBooking;
    booking2: ParsedBooking;
  }>;
}

export interface SyncStatus {
  property_id: string;
  last_sync: string | null;
  last_sync_status: 'success' | 'error' | 'in_progress';
  last_error?: string;
  next_sync?: string;
}

export class ICalSyncService {
  private supabase;

  constructor() {
    this.supabase = createServerSupabaseClient();
  }

  /**
   * Sync iCal feed for a specific property
   */
  async syncProperty(propertyId: string, tenantId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      overlaps: []
    };

    try {
      // Update sync status to in_progress
      await this.updateSyncStatus(propertyId, 'in_progress');

      // Get property with iCal URL
      const { data: property, error: propertyError } = await this.supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('tenant_id', tenantId)
        .single();

      if (propertyError || !property) {
        result.errors.push('Property not found or access denied');
        await this.updateSyncStatus(propertyId, 'error', 'Property not found');
        return result;
      }

      if (!property.ical_import_url) {
        result.errors.push('No iCal import URL configured for this property');
        await this.updateSyncStatus(propertyId, 'error', 'No iCal URL configured');
        return result;
      }

      // Parse iCal feed
      const parseResult = await ICalParser.parseFromUrl(property.ical_import_url);
      
      if (parseResult.errors.length > 0) {
        result.errors.push(...parseResult.errors);
      }

      if (parseResult.bookings.length === 0) {
        result.success = true;
        await this.updateSyncStatus(propertyId, 'success');
        return result;
      }

      // Get existing bookings for this property
      const { data: existingBookings, error: bookingsError } = await this.supabase
        .from('bookings')
        .select('*')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId);

      if (bookingsError) {
        result.errors.push(`Failed to fetch existing bookings: ${bookingsError.message}`);
        await this.updateSyncStatus(propertyId, 'error', bookingsError.message);
        return result;
      }

      // Convert existing bookings to ParsedBooking format for overlap detection
      const existingParsedBookings: ParsedBooking[] = (existingBookings || []).map(booking => ({
        uid: booking.ical_uid || booking.id,
        summary: booking.guest_name || 'Unknown Guest',
        start: new Date(booking.check_in),
        end: new Date(booking.check_out),
        description: undefined,
        location: undefined
      }));

      // Check for overlaps within new bookings
      const internalOverlaps = BookingOverlapDetector.findOverlaps(parseResult.bookings);
      result.overlaps.push(...internalOverlaps);

      // Process each parsed booking
      for (const parsedBooking of parseResult.bookings) {
        try {
          // Check for overlaps with existing bookings
          const overlappingExisting = BookingOverlapDetector.checkNewBookingOverlap(
            parsedBooking,
            existingParsedBookings
          );

          if (overlappingExisting.length > 0) {
            result.errors.push(
              `Booking ${parsedBooking.uid} overlaps with existing booking(s)`
            );
            result.skipped++;
            continue;
          }

          // Check if booking already exists (by ical_uid)
          const existingBooking = existingBookings?.find(
            b => b.ical_uid === parsedBooking.uid
          );

          const bookingData = ICalParser.convertToBooking(
            parsedBooking,
            propertyId,
            tenantId,
            'ical'
          );

          if (existingBooking) {
            // Update existing booking
            const { error: updateError } = await this.supabase
              .from('bookings')
              .update({
                guest_name: bookingData.guest_name,
                check_in: bookingData.check_in,
                check_out: bookingData.check_out,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingBooking.id)
              .eq('tenant_id', tenantId);

            if (updateError) {
              result.errors.push(`Failed to update booking ${parsedBooking.uid}: ${updateError.message}`);
              result.skipped++;
            } else {
              result.updated++;
            }
          } else {
            // Create new booking
            const { data: newBooking, error: insertError } = await this.supabase
              .from('bookings')
              .insert(bookingData)
              .select()
              .single();

            if (insertError) {
              result.errors.push(`Failed to create booking ${parsedBooking.uid}: ${insertError.message}`);
              result.skipped++;
            } else {
              result.imported++;
              
              // Generate tasks for the new booking
              try {
                await this.generateBookingTasks(newBooking, tenantId);
              } catch (taskError) {
                console.error('Error generating tasks for imported booking:', taskError);
                // Don't fail the sync if task generation fails
              }
            }
          }
        } catch (error) {
          result.errors.push(
            `Error processing booking ${parsedBooking.uid}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          result.skipped++;
        }
      }

      // Update sync status
      const status = result.errors.length === 0 ? 'success' : 'error';
      const errorMessage = result.errors.length > 0 ? result.errors.join('; ') : undefined;
      await this.updateSyncStatus(propertyId, status, errorMessage);

      result.success = status === 'success' || (result.imported + result.updated) > 0;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Sync failed: ${errorMessage}`);
      await this.updateSyncStatus(propertyId, 'error', errorMessage);
    }

    return result;
  }

  /**
   * Sync all properties for a tenant
   */
  async syncAllProperties(tenantId: string): Promise<Record<string, SyncResult>> {
    const results: Record<string, SyncResult> = {};

    try {
      // Get all properties with iCal URLs
      const { data: properties, error } = await this.supabase
        .from('properties')
        .select('id, name, ical_import_url')
        .eq('tenant_id', tenantId)
        .not('ical_import_url', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch properties: ${error.message}`);
      }

      // Sync each property
      for (const property of properties || []) {
        results[property.id] = await this.syncProperty(property.id, tenantId);
      }
    } catch (error) {
      // If we can't even fetch properties, create a generic error result
      const errorResult: SyncResult = {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        overlaps: []
      };
      results['error'] = errorResult;
    }

    return results;
  }

  /**
   * Get sync status for properties
   */
  async getSyncStatus(tenantId: string, propertyId?: string): Promise<SyncStatus[]> {
    let query = this.supabase
      .from('ical_sync_status')
      .select('*')
      .eq('tenant_id', tenantId);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch sync status: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update sync status for a property
   */
  private async updateSyncStatus(
    propertyId: string,
    status: 'success' | 'error' | 'in_progress',
    errorMessage?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const nextSync = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes from now

    const statusData = {
      property_id: propertyId,
      last_sync: now,
      last_sync_status: status,
      last_error: errorMessage || null,
      next_sync: status === 'success' ? nextSync : null,
      updated_at: now
    };

    // Try to update first, then insert if not exists
    const { error: updateError } = await this.supabase
      .from('ical_sync_status')
      .upsert(statusData, {
        onConflict: 'property_id'
      });

    if (updateError) {
      console.error('Failed to update sync status:', updateError);
    }
  }

  /**
   * Schedule automatic sync for properties that need it
   */
  async getPropertiesNeedingSync(tenantId: string): Promise<string[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await this.supabase
      .from('ical_sync_status')
      .select('property_id')
      .eq('tenant_id', tenantId)
      .or(`next_sync.is.null,next_sync.lt.${now}`)
      .eq('last_sync_status', 'success');

    if (error) {
      console.error('Failed to fetch properties needing sync:', error);
      return [];
    }

    return (data || []).map(item => item.property_id);
  }

  /**
   * Generate automatic tasks for a booking
   */
  private async generateBookingTasks(booking: Booking, tenantId: string): Promise<void> {
    const checkOutDate = new Date(booking.check_out);
    
    // Generate cleaning task for checkout day
    const cleaningTask = {
      tenant_id: tenantId,
      property_id: booking.property_id,
      title: `Cleaning after ${booking.guest_name || 'Guest'} checkout`,
      description: `Clean property after guest checkout. Booking: ${booking.check_in} to ${booking.check_out}`,
      due_date: new Date(checkOutDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours after checkout
      status: 'pending',
      auto_generated: true
    };

    // Generate maintenance check task for checkout day
    const maintenanceTask = {
      tenant_id: tenantId,
      property_id: booking.property_id,
      title: `Maintenance check after ${booking.guest_name || 'Guest'} checkout`,
      description: `Perform maintenance check after guest checkout. Booking: ${booking.check_in} to ${booking.check_out}`,
      due_date: new Date(checkOutDate.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours after checkout
      status: 'pending',
      auto_generated: true
    };

    // Insert both tasks
    const { error: tasksError } = await this.supabase
      .from('tasks')
      .insert([cleaningTask, maintenanceTask]);

    if (tasksError) {
      console.error('Error creating auto-generated tasks:', tasksError);
      throw tasksError;
    }

    console.log(`Generated 2 tasks for booking ${booking.id}`);
  }
}