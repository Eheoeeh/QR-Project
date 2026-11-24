export type SessionStatus = 'OPEN' | 'BILL_REQUESTED' | 'CLOSED';
export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
export type ServiceRequestType = 'CALL_WAITER' | 'WATER' | 'PAY_CASH' | 'OTHER';
export type ServiceRequestStatus = 'PENDING' | 'ON_THE_WAY' | 'DONE';
export type PaymentMethod = 'CASH' | 'ONLINE_DEMO';
export type PaymentStatus = 'PENDING' | 'PAID';
export type PrintJobTarget = 'KITCHEN_KOT' | 'CASHIER_RECEIPT';
export type PrintJobStatus = 'QUEUED' | 'PRINTED' | 'FAILED';

export interface Modifier {
  name: string;
  price_delta: number;
}

export interface RestaurantSettings {
  id: number;
  name: string;
  logo_url: string | null;
  primary_color: string;
  currency_symbol: string;
  tax_percent: number;
  require_seating_pin: boolean;
  kds_enabled: boolean;
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  name_alt: string | null;
  description: string | null;
  base_price: number;
  spice_level: number; // 0: None, 1: Mild, 2: Medium, 3: Hot
  modifiers: Modifier[];
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
}

export interface Table {
  id: number;
  table_number: number;
  label: string;
  current_session_id: string | null;
}

export interface TableSession {
  id: string;
  table_id: number;
  session_token: string;
  seating_pin: string;
  pin_verified: boolean;
  status: SessionStatus;
  opened_at: string;
  closed_at: string | null;
}

export interface CartItem {
  id: string;
  session_id: string;
  menu_item_id: string;
  quantity: number;
  selected_modifiers: Modifier[];
  note: string | null;
  added_by_guest_id: string;
  created_at: string;
  // Joined or resolved properties
  menu_item?: MenuItem;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  selected_modifiers: Modifier[];
  note: string | null;
}

export interface Order {
  id: string;
  order_number: number;
  session_id: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface ServiceRequest {
  id: string;
  session_id: string;
  type: ServiceRequestType;
  note: string | null;
  status: ServiceRequestStatus;
  created_at: string;
  resolved_at: string | null;
  // Optional populated field for waiter views
  table_number?: number;
}

export interface Payment {
  id: string;
  session_id: string;
  split_label: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string | null;
}

export interface PrintJob {
  id: string;
  session_id: string;
  target: PrintJobTarget;
  payload: Record<string, any>;
  status: PrintJobStatus;
  created_at: string;
}
