import { supabase } from './supabaseClient';
import { Table, TableSession, RestaurantSettings, ServiceRequest, ServiceRequestType, ServiceRequestStatus } from '../types';

export const sessionService = {
  /**
   * Generates or retrieves a persistent anonymous guest ID for this browser
   */
  getOrCreateGuestId(): string {
    const KEY = 'qr_guest_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(KEY, id);
    }
    return id;
  },

  /**
   * Fetches single-row restaurant configuration
   */
  async getRestaurantSettings(): Promise<RestaurantSettings> {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return {
        id: 1,
        name: 'Spice & Sizzle Bistro',
        logo_url: null,
        primary_color: '#EA580C',
        currency_symbol: 'Rs.',
        tax_percent: 16.0,
        require_seating_pin: false,
        kds_enabled: true
      };
    }
    return data as RestaurantSettings;
  },

  /**
   * Looks up a table by its physical printed table number
   */
  async getTableByNumber(tableNumber: number): Promise<Table | null> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('table_number', tableNumber)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as Table;
  },

  /**
   * Checks if the local browser has a stored session token that has since been closed
   */
  async checkStoredSessionStatus(tableNumber: number): Promise<{ isClosed: boolean; session: TableSession | null }> {
    const tokenKey = `qr_session_token_${tableNumber}`;
    const storedToken = localStorage.getItem(tokenKey);

    if (!storedToken) {
      return { isClosed: false, session: null };
    }

    const { data } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('session_token', storedToken)
      .maybeSingle();

    if (data && data.status === 'CLOSED') {
      return { isClosed: true, session: data as TableSession };
    }

    return { isClosed: false, session: data ? (data as TableSession) : null };
  },

  /**
   * Resolves the active table session, or creates a new one if none exists.
   */
  async resolveOrCreateTableSession(table: Table, requirePin: boolean): Promise<TableSession> {
    const tokenKey = `qr_session_token_${table.table_number}`;

    // 1. Check if the table pointer has an active session
    if (table.current_session_id) {
      const { data: activeSession } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('id', table.current_session_id)
        .in('status', ['OPEN', 'BILL_REQUESTED'])
        .maybeSingle();

      if (activeSession) {
        localStorage.setItem(tokenKey, activeSession.session_token);
        return activeSession as TableSession;
      }
    }

    // 2. Double check directly in table_sessions for any open session for this table_id
    const { data: existingSession } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('table_id', table.id)
      .in('status', ['OPEN', 'BILL_REQUESTED'])
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSession) {
      await supabase
        .from('tables')
        .update({ current_session_id: existingSession.id })
        .eq('id', table.id);

      localStorage.setItem(tokenKey, existingSession.session_token);
      return existingSession as TableSession;
    }

    // 3. No active session exists — create a brand new session
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const { data: newSession, error: createError } = await supabase
      .from('table_sessions')
      .insert({
        table_id: table.id,
        seating_pin: randomPin,
        pin_verified: !requirePin,
        status: 'OPEN'
      })
      .select()
      .single();

    if (createError || !newSession) {
      throw createError || new Error('Failed to create table session');
    }

    await supabase
      .from('tables')
      .update({ current_session_id: newSession.id })
      .eq('id', table.id);

    localStorage.setItem(tokenKey, newSession.session_token);
    return newSession as TableSession;
  },

  /**
   * Refreshes the session directly from the database (used on resume/wake-up)
   */
  async refreshSession(sessionId: string): Promise<TableSession | null> {
    const { data, error } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) return null;
    return data as TableSession;
  },

  /**
   * Verifies the 4-digit seating PIN entered by the guest
   */
  async verifySeatingPin(sessionId: string, enteredPin: string): Promise<{ success: boolean; message?: string }> {
    const { data: session, error } = await supabase
      .from('table_sessions')
      .select('seating_pin')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !session) {
      return { success: false, message: 'Session not found. Please refresh.' };
    }

    if (session.seating_pin.trim() !== enteredPin.trim()) {
      return { success: false, message: 'Incorrect 4-digit PIN. Please check your table card.' };
    }

    const { error: updateError } = await supabase
      .from('table_sessions')
      .update({ pin_verified: true })
      .eq('id', sessionId);

    if (updateError) {
      return { success: false, message: 'Could not unlock session. Please try again.' };
    }

    return { success: true };
  },

  /**
   * Clears the stored session token from browser localStorage
   */
  clearStoredToken(tableNumber: number) {
    localStorage.removeItem(`qr_session_token_${tableNumber}`);
  },

  /**
   * Retrieves active service requests for the session
   */
  async getActiveServiceRequests(sessionId: string): Promise<ServiceRequest[]> {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('session_id', sessionId)
      .in('status', ['PENDING', 'ON_THE_WAY'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching service requests:', error);
      return [];
    }
    return (data as ServiceRequest[]) || [];
  },

  /**
   * Submits a service call with database anti-spam protection
   */
  async submitServiceRequest(sessionId: string, type: ServiceRequestType, note?: string) {
    return await supabase
      .from('service_requests')
      .insert({
        session_id: sessionId,
        type,
        note: note || null,
        status: 'PENDING'
      });
  },

  /**
   * Updates service request status (e.g., ON_THE_WAY, DONE)
   */
  async updateServiceRequestStatus(requestId: string, status: ServiceRequestStatus) {
    const updates: Record<string, any> = { status };
    if (status === 'DONE') {
      updates.resolved_at = new Date().toISOString();
    }
    return await supabase
      .from('service_requests')
      .update(updates)
      .eq('id', requestId);
  }
};
