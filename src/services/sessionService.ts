import { supabase } from './supabaseClient';
import { TableSession, ServiceRequestType, ServiceRequestStatus } from '../types';

export const sessionService = {
  /**
   * Retrieves active or bill-requested session for a given table
   */
  async getActiveSessionByTable(tableNumber: number): Promise<TableSession | null> {
    const { data: tableData, error: tableError } = await supabase
      .from('tables')
      .select('id, current_session_id')
      .eq('table_number', tableNumber)
      .maybeSingle();

    if (tableError || !tableData || !tableData.current_session_id) {
      return null;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('id', tableData.current_session_id)
      .in('status', ['OPEN', 'BILL_REQUESTED'])
      .maybeSingle();

    if (sessionError || !sessionData) {
      return null;
    }

    return sessionData as TableSession;
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
