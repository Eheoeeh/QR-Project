import { create } from 'zustand';
import { Table, ServiceRequest, Order, PrintJob } from '../types';

interface StaffState {
  tables: Table[];
  serviceRequests: ServiceRequest[];
  activeOrders: Order[];
  printQueue: PrintJob[];
  setTables: (tables: Table[]) => void;
  setServiceRequests: (requests: ServiceRequest[]) => void;
  setActiveOrders: (orders: Order[]) => void;
  setPrintQueue: (jobs: PrintJob[]) => void;
}

export const useStaffStore = create<StaffState>((set) => ({
  tables: [],
  serviceRequests: [],
  activeOrders: [],
  printQueue: [],
  setTables: (tables) => set({ tables }),
  setServiceRequests: (serviceRequests) => set({ serviceRequests }),
  setActiveOrders: (activeOrders) => set({ activeOrders }),
  setPrintQueue: (printQueue) => set({ printQueue }),
}));
