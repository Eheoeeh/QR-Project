import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Printer, Volume2, VolumeX, RefreshCw, Sparkles, Filter } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { kitchenService, KitchenTicket } from '../services/kitchenService';
import { OrderTicketCard } from '../components/kitchen/OrderTicketCard';
import { ThermalSlipDrawer, ThermalPrinterPanel } from '../components/kitchen/ThermalSlipDrawer';
import { soundAlert } from '../utils/soundAlert';
import { PrintJob } from '../types';

export const KitchenPage: React.FC = () => {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(soundAlert.getStatus());
  const [filter, setFilter] = useState<'ALL' | 'RECEIVED' | 'PREPARING' | 'READY'>('ALL');
  const [showSlipDrawer, setShowSlipDrawer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<KitchenTicket | null>(null);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  // Load tickets and print jobs
  const fetchTickets = useCallback(async () => {
    try {
      const [active, jobs] = await Promise.all([
        kitchenService.getActiveTickets(),
        kitchenService.getPrintJobs()
      ]);
      setTickets(active);
      setPrintJobs(jobs);
    } catch (err) {
      console.error('Failed to load kitchen tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce ticket refetching to prevent jitter during local status transitions
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const debouncedFetchTickets = useCallback(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchTickets();
    }, 150);
  }, [fetchTickets]);

  useEffect(() => {
    fetchTickets();

    // 1. Subscribe to orders table changes
    const ordersChannel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          soundAlert.playChime(true);
          const orderNum = payload.new.order_number;
          setNewOrderAlert(`New Order #${orderNum} received!`);
          setTimeout(() => setNewOrderAlert(null), 4000);
          debouncedFetchTickets();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          debouncedFetchTickets();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        () => {
          debouncedFetchTickets();
        }
      )
      .subscribe();

    // 2. Subscribe to order_items insertions
    const itemsChannel = supabase
      .channel('kitchen-items-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        () => {
          debouncedFetchTickets();
        }
      )
      .subscribe();

    // 3. Subscribe to print_jobs
    const printJobsChannel = supabase
      .channel('kitchen-print-jobs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'print_jobs' },
        () => {
          kitchenService.getPrintJobs().then(setPrintJobs);
        }
      )
      .subscribe();

    // Visibility wake up listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTickets();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(printJobsChannel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTickets, debouncedFetchTickets]);

  // Status transitions
  const handleStartPreparing = async (ticketId: string) => {
    // Optimistic local update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'PREPARING' } : t))
    );
    await kitchenService.updateTicketStatus(ticketId, 'PREPARING');
  };

  const handleMarkReady = async (ticketId: string) => {
    // Optimistic local update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'READY' } : t))
    );
    await kitchenService.updateTicketStatus(ticketId, 'READY');
  };

  const handleMarkServed = async (ticketId: string) => {
    // Optimistic local update: remove from active pass
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    await kitchenService.updateTicketStatus(ticketId, 'SERVED');
  };

  const handlePrintKOT = (ticket: KitchenTicket) => {
    setSelectedTicket(ticket);
    // On narrow tablets & phones (< xl), slide out the virtual printer drawer
    if (window.innerWidth < 1280) {
      setShowSlipDrawer(true);
    }
  };

  const toggleSound = () => {
    if (soundEnabled) {
      soundAlert.disable();
      setSoundEnabled(false);
    } else {
      const ok = soundAlert.enable();
      setSoundEnabled(ok);
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  const countReceived = tickets.filter((t) => t.status === 'RECEIVED').length;
  const countPreparing = tickets.filter((t) => t.status === 'PREPARING').length;
  const countReady = tickets.filter((t) => t.status === 'READY').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-5 lg:p-6 select-none">
      <div className="max-w-[1800px] mx-auto space-y-5">
        {/* Floating New Order Banner */}
        {newOrderAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-600 text-white font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce border border-orange-400">
            <Sparkles className="w-4 h-4" />
            <span>{newOrderAlert}</span>
          </div>
        )}

        {/* Header */}
        <header className="bg-slate-900 rounded-2xl p-4 sm:px-5 border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Kitchen Display System (KDS)
                </h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Incoming kitchen tickets & 80mm Virtual Thermal Printer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle audio alerts for incoming orders"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Sound Off</span>
                </>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchTickets}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Refresh tickets"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* 80mm Virtual Thermal Printer Toggle Button (tucked drawer on phones & narrow tablets) */}
            <button
              onClick={() => {
                setSelectedTicket(null);
                setShowSlipDrawer(!showSlipDrawer);
              }}
              className="xl:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>{showSlipDrawer ? 'Hide Thermal Printer' : '80mm Thermal Printer'}</span>
            </button>
          </div>
        </header>

        {/* Main Workspace Split: Left Auto-Fitting Ticket Grid + Right Pinned Thermal Printer (xl+) */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* Left Column: Filter Controls & Auto-Fitting Ticket Grid */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Filter Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto max-w-full">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                    filter === 'ALL'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>All Active</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/60 text-slate-200">
                    {tickets.length}
                  </span>
                </button>

                <button
                  onClick={() => setFilter('RECEIVED')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                    filter === 'RECEIVED'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>New</span>
                  {countReceived > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-500 text-white animate-pulse">
                      {countReceived}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setFilter('PREPARING')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                    filter === 'PREPARING'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Cooking</span>
                  {countPreparing > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-white">
                      {countPreparing}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setFilter('READY')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                    filter === 'READY'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Ready</span>
                  {countReady > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white">
                      {countReady}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Showing {filteredTickets.length} tickets</span>
              </div>
            </div>

            {/* Auto-Fitting Card Grid: 1 col phone, 2 cols tablet, 3+ cols laptop/monitor */}
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
                <p className="text-sm font-semibold">Connecting to kitchen pass stream...</p>
              </div>
            ) : filteredTickets.length > 0 ? (
              <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,268px),1fr))]">
                {filteredTickets.map((ticket) => (
                  <OrderTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onStartPreparing={handleStartPreparing}
                    onMarkReady={handleMarkReady}
                    onMarkServed={handleMarkServed}
                    onPrintKOT={handlePrintKOT}
                  />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-12 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <ChefHat className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Pass is Clear — All Orders Served!
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  There are currently no active tickets in the kitchen. When customers or waiters place an order from any table, it will appear here instantly with live cook timers and an audio chime.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Kitchen channel listening in real time</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pinned 80mm Virtual Thermal Printer on Wide Screens (xl+) */}
          <div className="hidden xl:block w-[336px] 2xl:w-[372px] shrink-0 sticky top-5">
            <ThermalPrinterPanel
              selectedTicket={selectedTicket}
              activeTickets={tickets}
              printJobs={printJobs}
            />
          </div>
        </div>

        {/* 80mm Virtual Monospace Thermal Slip Drawer (Narrow Tablets & Phones) */}
        <ThermalSlipDrawer
          isOpen={showSlipDrawer}
          onClose={() => setShowSlipDrawer(false)}
          selectedTicket={selectedTicket}
          activeTickets={tickets}
          printJobs={printJobs}
        />
      </div>
    </div>
  );
};

export default KitchenPage;
