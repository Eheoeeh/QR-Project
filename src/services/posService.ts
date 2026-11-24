import { supabase } from './supabaseClient';
import {
  Table,
  TableSession,
  Order,
  ServiceRequest,
  RestaurantSettings
} from '../types';
import { calculateBill } from '../utils/billCalculator';

export type TableUrgency =
  | 'FREE'
  | 'OCCUPIED'
  | 'ORDER_PENDING'
  | 'READY_TO_SERVE'
  | 'SERVICE_PENDING'
  | 'BILL_REQUESTED';

export interface TableFloorState {
  table: Table;
  session: TableSession | null;
  orders: Order[];
  serviceRequests: ServiceRequest[];
  runningTotal: number;
  urgency: TableUrgency;
  urgencyLabel: string;
  seatedDurationMinutes: number;
  hasReadyFood: boolean;
  hasPendingService: boolean;
  hasBillRequest: boolean;
}

export const posService = {
  /**
   * Fetches the entire dining floor state in one clean aggregation
   */
  async getFloorData(): Promise<{
    settings: RestaurantSettings;
    floor: TableFloorState[];
  }> {
    // 1. Fetch settings and tables in parallel
    const [settingsRes, tablesRes] = await Promise.all([
      supabase.from('restaurant_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('tables').select('*').order('table_number', { ascending: true })
    ]);

    const settings: RestaurantSettings = settingsRes.data || {
      id: 1,
      name: 'Spice & Sizzle Bistro',
      logo_url: null,
      primary_color: '#EA580C',
      currency_symbol: 'Rs.',
      tax_percent: 16.0,
      require_seating_pin: false,
      kds_enabled: true
    };

    const tables: Table[] = tablesRes.data || [];

    // 2. Fetch all active sessions
    const { data: activeSessions } = await supabase
      .from('table_sessions')
      .select('*')
      .in('status', ['OPEN', 'BILL_REQUESTED']);

    const sessionList: TableSession[] = activeSessions || [];
    const sessionIds = sessionList.map((s) => s.id);

    // 3. If there are active sessions, fetch their orders and service requests
    let ordersList: Order[] = [];
    let requestsList: ServiceRequest[] = [];

    if (sessionIds.length > 0) {
      const [ordersRes, requestsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(*)')
          .in('session_id', sessionIds)
          .neq('status', 'CANCELLED')
          .order('created_at', { ascending: true }),
        supabase
          .from('service_requests')
          .select('*')
          .in('session_id', sessionIds)
          .in('status', ['PENDING', 'ON_THE_WAY'])
          .order('created_at', { ascending: false })
      ]);

      ordersList = ordersRes.data || [];
      requestsList = requestsRes.data || [];
    }

    // 4. Map each table into its enriched Floor State
    const now = Date.now();
    const floor: TableFloorState[] = tables.map((tbl) => {
      // Find matching session by current_session_id or table_id
      const session =
        sessionList.find((s) => s.id === tbl.current_session_id) ||
        sessionList.find((s) => s.table_id === tbl.id) ||
        null;

      if (!session) {
        return {
          table: tbl,
          session: null,
          orders: [],
          serviceRequests: [],
          runningTotal: 0,
          urgency: 'FREE',
          urgencyLabel: 'Free Table',
          seatedDurationMinutes: 0,
          hasReadyFood: false,
          hasPendingService: false,
          hasBillRequest: false
        };
      }

      // Orders for this session
      const tableOrders = ordersList.filter((o) => o.session_id === session.id);
      const allOrderItems = tableOrders.flatMap((o) => o.order_items || []);
      const billSummary = calculateBill(allOrderItems, settings.tax_percent);

      // Service requests for this session
      const tableRequests = requestsList.filter((r) => r.session_id === session.id);

      // Duration seated
      const openedTime = session.opened_at ? new Date(session.opened_at).getTime() : now;
      const seatedDurationMinutes = Math.max(0, Math.floor((now - openedTime) / 60000));

      // Specific conditions
      const hasBillRequest =
        session.status === 'BILL_REQUESTED' ||
        tableRequests.some((r) => r.type === 'PAY_CASH' && r.status !== 'DONE');

      const hasPendingService = tableRequests.some(
        (r) => (r.type === 'WATER' || r.type === 'CALL_WAITER' || r.type === 'OTHER') && r.status === 'PENDING'
      );

      const hasReadyFood = tableOrders.some((o) => o.status === 'READY');
      const hasCookingFood = tableOrders.some(
        (o) => o.status === 'RECEIVED' || o.status === 'PREPARING'
      );

      // Determine visual urgency hierarchy:
      let urgency: TableUrgency = 'OCCUPIED';
      let urgencyLabel = 'Occupied';

      if (hasPendingService) {
        urgency = 'SERVICE_PENDING';
        urgencyLabel = 'Needs Attention';
      } else if (hasBillRequest) {
        urgency = 'BILL_REQUESTED';
        urgencyLabel = 'Bill Requested';
      } else if (hasReadyFood) {
        urgency = 'READY_TO_SERVE';
        urgencyLabel = 'Ready to Serve';
      } else if (hasCookingFood) {
        urgency = 'ORDER_PENDING';
        urgencyLabel = 'Food Cooking';
      }

      return {
        table: tbl,
        session,
        orders: tableOrders,
        serviceRequests: tableRequests,
        runningTotal: billSummary.grandTotal,
        urgency,
        urgencyLabel,
        seatedDurationMinutes,
        hasReadyFood,
        hasPendingService,
        hasBillRequest
      };
    });

    return { settings, floor };
  },

  /**
   * Seat a walk-in table manually from POS: generates fresh PIN and opens session
   */
  async seatTableManually(tableId: number, _tableNumber?: number): Promise<TableSession> {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();

    const { data: newSession, error: createError } = await supabase
      .from('table_sessions')
      .insert({
        table_id: tableId,
        seating_pin: randomPin,
        pin_verified: true, // Waiter seated them directly
        status: 'OPEN'
      })
      .select()
      .single();

    if (createError || !newSession) {
      throw createError || new Error('Failed to seat table');
    }

    await supabase
      .from('tables')
      .update({ current_session_id: newSession.id })
      .eq('id', tableId);

    return newSession as TableSession;
  },

  /**
   * Close a table session and reset the table
   */
  async closeSession(sessionId: string, tableId: number): Promise<void> {
    await supabase
      .from('table_sessions')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    await supabase
      .from('tables')
      .update({ current_session_id: null })
      .eq('id', tableId);
  }
};
