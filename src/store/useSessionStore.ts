import { create } from 'zustand';
import { TableSession, Table, RestaurantSettings, CartItem, Order, ServiceRequest, Payment } from '../types';

interface SessionState {
  guestId: string;
  table: Table | null;
  settings: RestaurantSettings | null;
  currentSession: TableSession | null;
  isSessionExpired: boolean;
  cartItems: CartItem[];
  orders: Order[];
  activeRequests: ServiceRequest[];
  payments: Payment[];

  setGuestId: (id: string) => void;
  setTable: (table: Table | null) => void;
  setSettings: (settings: RestaurantSettings | null) => void;
  setCurrentSession: (session: TableSession | null) => void;
  setIsSessionExpired: (expired: boolean) => void;
  setCartItems: (items: CartItem[]) => void;
  setOrders: (orders: Order[]) => void;
  setActiveRequests: (requests: ServiceRequest[]) => void;
  setPayments: (payments: Payment[]) => void;
  resetSessionState: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  guestId: '',
  table: null,
  settings: null,
  currentSession: null,
  isSessionExpired: false,
  cartItems: [],
  orders: [],
  activeRequests: [],
  payments: [],

  setGuestId: (guestId) => set({ guestId }),
  setTable: (table) => set({ table }),
  setSettings: (settings) => set({ settings }),
  setCurrentSession: (currentSession) => set({ currentSession }),
  setIsSessionExpired: (isSessionExpired) => set({ isSessionExpired }),
  setCartItems: (cartItems) => set({ cartItems }),
  setOrders: (orders) => set({ orders }),
  setActiveRequests: (activeRequests) => set({ activeRequests }),
  setPayments: (payments) => set({ payments }),
  resetSessionState: () => set({
    currentSession: null,
    isSessionExpired: false,
    cartItems: [],
    orders: [],
    activeRequests: [],
    payments: []
  })
}));
