import { supabase } from './supabaseClient';
import { OrderStatus, OrderItem, PrintJob } from '../types';

export interface KitchenTicket {
  id: string; // Order ID
  order_number: number;
  session_id: string;
  table_number: number;
  table_label: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export const kitchenService = {
  /**
   * Fetches all active kitchen tickets (RECEIVED, PREPARING, READY)
   * joined with table info and order items
   */
  async getActiveTickets(): Promise<KitchenTicket[]> {
    // 1. Fetch active orders with their order items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['RECEIVED', 'PREPARING', 'READY'])
      .order('created_at', { ascending: true });

    if (ordersError || !orders) {
      console.error('Error fetching active kitchen orders:', ordersError);
      return [];
    }

    if (orders.length === 0) return [];

    // 2. Resolve table numbers through sessions
    const sessionIds = Array.from(new Set(orders.map((o) => o.session_id)));
    const [sessionsRes, tablesRes] = await Promise.all([
      supabase.from('table_sessions').select('id, table_id').in('id', sessionIds),
      supabase.from('tables').select('id, table_number, label')
    ]);

    const sessions = sessionsRes.data || [];
    const tables = tablesRes.data || [];

    const tableBySessionId: Record<string, { table_number: number; label: string }> = {};
    for (const sess of sessions) {
      const tbl = tables.find((t) => t.id === sess.table_id);
      if (tbl) {
        tableBySessionId[sess.id] = {
          table_number: tbl.table_number,
          label: tbl.label
        };
      }
    }

    // 3. Map orders into KitchenTicket array
    return orders.map((order) => {
      const tblInfo = tableBySessionId[order.session_id] || {
        table_number: 1,
        label: 'Table'
      };

      return {
        id: order.id,
        order_number: order.order_number,
        session_id: order.session_id,
        table_number: tblInfo.table_number,
        table_label: tblInfo.label,
        status: order.status as OrderStatus,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: (order.order_items || []) as OrderItem[]
      };
    });
  },

  /**
   * Updates an order's status (PREPARING, READY, SERVED)
   */
  async updateTicketStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to update order status:', error);
      return false;
    }
    return true;
  },

  /**
   * Fetches recent print jobs (KOTs & receipts)
   */
  async getPrintJobs(): Promise<PrintJob[]> {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching print jobs:', error);
      return [];
    }
    return (data as PrintJob[]) || [];
  }
};
