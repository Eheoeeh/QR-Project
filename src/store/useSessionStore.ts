import { create } from 'zustand';
import { TableSession, CartItem, Order, ServiceRequest, Payment } from '../types';

interface SessionState {
  currentSession: TableSession | null;
  cartItems: CartItem[];
  orders: Order[];
  activeRequests: ServiceRequest[];
  payments: Payment[];
  setCurrentSession: (session: TableSession | null) => void;
  setCartItems: (items: CartItem[]) => void;
  setOrders: (orders: Order[]) => void;
  setActiveRequests: (requests: ServiceRequest[]) => void;
  setPayments: (payments: Payment[]) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  cartItems: [],
  orders: [],
  activeRequests: [],
  payments: [],
  setCurrentSession: (session) => set({ currentSession: session }),
  setCartItems: (cartItems) => set({ cartItems }),
  setOrders: (orders) => set({ orders }),
  setActiveRequests: (activeRequests) => set({ activeRequests }),
  setPayments: (payments) => set({ payments }),
}));
