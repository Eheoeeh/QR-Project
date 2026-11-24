import { supabase } from './supabaseClient';
import { PrintJobTarget } from '../types';

export const printService = {
  /**
   * Dispatches a print job to the database queue
   */
  async queuePrintJob(sessionId: string, target: PrintJobTarget, payload: Record<string, any>) {
    return await supabase
      .from('print_jobs')
      .insert({
        session_id: sessionId,
        target,
        payload,
        status: 'QUEUED'
      });
  }
};
