import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat,
  Printer,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  Search,
  Clock,
  Flame,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { kitchenService, KitchenTicket } from '../services/kitchenService';
import { sessionService } from '../services/sessionService';
import { OrderTicketCard } from '../components/kitchen/OrderTicketCard';
import { ThermalSlipDrawer, ThermalPrinterPanel } from '../components/kitchen/ThermalSlipDrawer';
import { soundAlert } from '../utils/soundAlert';
import { PrintJob, RestaurantSettings } from '../types';

export const KitchenPage: React.FC = () => {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(soundAlert.getStatus());
  const [filter, setFilter] = useState<'ALL' | 'RECEIVED' | 'PREPARING' | 'READY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSlipDrawer, setShowSlipDrawer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<KitchenTicket | null>(null);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  // Load tickets, print jobs, and restaurant branding settings
  const fetchTickets = useCallback(async () => {
    try {
      const [active, jobs, fetchedSettings] = await Promise.all([
        kitchenService.getActiveTickets(),
        kitchenService.getPrintJobs(),
        sessionService.getRestaurantSettings()
      ]);
      setTickets(active);
      setPrintJobs(jobs);
      setSettings(fetchedSettings);
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

    // 3. Subscribe to print_jobs and live restaurant_settings branding
    const printJobsChannel = supabase
      .channel('kitchen-print-jobs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'print_jobs' },
        () => {
          kitchenService.getPrintJobs().then(setPrintJobs);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurant_settings', filter: 'id=eq.1' },
        (payload) => {
          if (payload.new) {
            setSettings(payload.new as RestaurantSettings);
          }
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
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchesTab = filter === 'ALL' || t.status === filter;
      const matchesSearch =
        !q ||
        `#${t.order_number}`.includes(q) ||
        `table ${t.table_number}`.includes(q) ||
        t.items.some((i) => i.item_name.toLowerCase().includes(q));
      return matchesTab && matchesSearch;
    });
  }, [tickets, filter, searchQuery]);

  const countReceived = tickets.filter((t) => t.status === 'RECEIVED').length;
  const countPreparing = tickets.filter((t) => t.status === 'PREPARING').length;
  const countReady = tickets.filter((t) => t.status === 'READY').length;

  return (
    <div className="min-h-screen bg-[#111214] text-zinc-100 p-4 sm:p-6 select-none">
      <div className="max-w-[1800px] mx-auto space-y-5">
        {/* Floating New Order Banner */}
        {newOrderAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-zinc-950 font-extrabold px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce border border-amber-300">
            <Sparkles className="w-4 h-4" />
            <span>{newOrderAlert}</span>
          </div>
        )}

        {/* Header */}
        <header className="bg-[#18191C] rounded-[22px] p-4 sm:px-5 border border-white/[0.08] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                  {settings?.name || 'Spice & Sizzle Bistro'}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Kitchen Display System (KDS)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/"
              className="px-3.5 py-2 rounded-full bg-[#111214] hover:bg-white/[0.05] border border-white/[0.1] text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              QR Portal
            </Link>
            <Link
              to="/waiter"
              className="px-3.5 py-2 rounded-full bg-[#111214] hover:bg-white/[0.05] border border-white/[0.1] text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              Waiter POS
            </Link>

            <button
              onClick={toggleSound}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition ${
                soundEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : 'bg-[#111214] text-zinc-400 border-white/[0.1] hover:text-white'
              }`}
              title="Toggle audio alerts for incoming orders"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                  <span>Sound Off</span>
                </>
              )}
            </button>

            <button
              onClick={fetchTickets}
              className="p-2.5 rounded-full bg-[#111214] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.1] transition"
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
              className="xl:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold transition shadow-md shadow-amber-500/15"
            >
              <Printer className="w-4 h-4" />
              <span>{showSlipDrawer ? 'Hide Printer' : 'Thermal Printer'}</span>
            </button>
          </div>
        </header>

        {/* Main Workspace Split: Left Tinted KPI Row + Filter Bar + Tickets Grid + Right Pinned Thermal Printer */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* Left Column */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Top 3 Tinted Glass Queue Cards (Exact Reference Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Rose Card: New Orders */}
              <div className="rounded-[22px] p-4 bg-gradient-to-br from-rose-950/45 via-[#1B181B] to-[#18191C] border border-rose-500/20 flex flex-col justify-between gap-3 shadow-lg">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-rose-400">New Queue</h3>
                    <p className="text-[11px] text-zinc-400">Fresh incoming tickets waiting on stove</p>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {countReceived} tickets
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFilter('RECEIVED')}
                  className="w-full py-2 px-3 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <span>Filter New</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Indigo Card: Currently Cooking */}
              <div className="rounded-[22px] p-4 bg-gradient-to-br from-indigo-950/45 via-[#181921] to-[#18191C] border border-indigo-500/20 flex flex-col justify-between gap-3 shadow-lg">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-indigo-400">On the Stove</h3>
                    <p className="text-[11px] text-zinc-400">Actively preparing across stations</p>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {countPreparing} cooking
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFilter('PREPARING')}
                  className="w-full py-2 px-3 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/25 text-indigo-300 text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <span>Filter Cooking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Emerald Card: Ready at Pass */}
              <div className="rounded-[22px] p-4 bg-gradient-to-br from-emerald-950/45 via-[#171C1B] to-[#18191C] border border-emerald-500/20 flex flex-col justify-between gap-3 shadow-lg">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-400">Ready at Pass</h3>
                    <p className="text-[11px] text-zinc-400">Plated orders ready for server pickup</p>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {countReady} ready
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFilter('READY')}
                  className="w-full py-2 px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <span>Filter Ready</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Pill Filter Navigation & Search Pill */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 ${
                    filter === 'ALL'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-[#18191C] text-zinc-300 border border-white/[0.1] hover:border-white/25'
                  }`}
                >
                  <span>All Active ({tickets.length})</span>
                </button>

                <button
                  onClick={() => setFilter('RECEIVED')}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 ${
                    filter === 'RECEIVED'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-[#18191C] text-zinc-300 border border-white/[0.1] hover:border-white/25'
                  }`}
                >
                  <span>New</span>
                  {countReceived > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'RECEIVED' ? 'bg-zinc-950 text-amber-400' : 'bg-rose-500 text-white animate-pulse'}`}>
                      {countReceived}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setFilter('PREPARING')}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 ${
                    filter === 'PREPARING'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-[#18191C] text-zinc-300 border border-white/[0.1] hover:border-white/25'
                  }`}
                >
                  <span>Cooking</span>
                  {countPreparing > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'PREPARING' ? 'bg-zinc-950 text-amber-400' : 'bg-indigo-500 text-white'}`}>
                      {countPreparing}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setFilter('READY')}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 ${
                    filter === 'READY'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-[#18191C] text-zinc-300 border border-white/[0.1] hover:border-white/25'
                  }`}
                >
                  <span>Ready</span>
                  {countReady > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'READY' ? 'bg-zinc-950 text-amber-400' : 'bg-emerald-500 text-white'}`}>
                      {countReady}
                    </span>
                  )}
                </button>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ticket, table, dish..."
                  className="w-full pl-9 pr-4 py-2 rounded-full bg-[#18191C] border border-white/[0.1] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 transition"
                />
              </div>
            </div>

            {/* Auto-Fitting Card Grid: 1 col phone, 2 cols tablet, 3+ cols laptop/monitor */}
            {loading ? (
              <div className="py-20 text-center text-zinc-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
                <p className="text-sm font-semibold">Connecting to kitchen pass stream...</p>
              </div>
            ) : filteredTickets.length > 0 ? (
              <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,284px),1fr))]">
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
              <div className="bg-[#18191C] rounded-[22px] border border-white/[0.08] p-12 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/25">
                  <ChefHat className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Pass is Clear — All Orders Served!
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  There are currently no active tickets in the kitchen. When customers or waiters place an order from any table, it appears here instantly with live cook timers.
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111214] text-zinc-300 text-xs border border-white/[0.08]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Kitchen channel listening in real time</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pinned 80mm Virtual Thermal Printer on Wide Screens (xl+) */}
          <div className="hidden xl:block w-[320px] 2xl:w-[360px] shrink-0 sticky top-5">
            <ThermalPrinterPanel
              selectedTicket={selectedTicket}
              activeTickets={tickets}
              printJobs={printJobs}
              restaurantName={settings?.name}
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
          restaurantName={settings?.name}
        />
      </div>
    </div>
  );
};

export default KitchenPage;
