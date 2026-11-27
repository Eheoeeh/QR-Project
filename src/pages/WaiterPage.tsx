import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { posService, TableFloorState } from '../services/posService';
import { RestaurantSettings } from '../types';
import { TableCard } from '../components/waiter/TableCard';
import { ServiceRequestQueue, EnrichedServiceRequest } from '../components/waiter/ServiceRequestQueue';
import { soundAlert } from '../utils/soundAlert';
import {
  Users,
  Volume2,
  VolumeX,
  RefreshCw,
  X,
  Droplets,
  Bell,
  DollarSign,
  Search,
  CheckCircle2,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

type FilterTab = 'ALL' | 'OCCUPIED' | 'ATTENTION';

export const WaiterPage: React.FC = () => {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [floor, setFloor] = useState<TableFloorState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableFloorState | null>(null);

  // Fetch complete dining floor data
  const loadFloor = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const res = await posService.getFloorData();
      setSettings(res.settings);
      setFloor(res.floor);
    } catch (err) {
      console.error('Failed to load floor data:', err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFloor(true);
  }, [loadFloor]);

  // Debounced floor reload to prevent multiple rapid-fire re-renders
  const reloadTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const debouncedLoadFloor = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      loadFloor();
    }, 120);
  }, [loadFloor]);

  // Real-time Supabase subscriptions for dining room changes
  useEffect(() => {
    const channel = supabase
      .channel('pos-realtime-floor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_sessions' },
        () => debouncedLoadFloor()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => debouncedLoadFloor()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          debouncedLoadFloor();
          soundAlert.playChime(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        (payload) => {
          debouncedLoadFloor();
          if (payload.eventType === 'INSERT') {
            soundAlert.playChime(true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurant_settings' },
        () => debouncedLoadFloor()
      )
      .subscribe();

    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [debouncedLoadFloor]);

  // Periodic ticking timer (refreshes seated duration every 60s)
  useEffect(() => {
    const timer = setInterval(() => {
      loadFloor();
    }, 60000);
    return () => clearInterval(timer);
  }, [loadFloor]);

  // Sound toggle handler
  const handleToggleSound = () => {
    if (isSoundEnabled) {
      soundAlert.disable();
      setIsSoundEnabled(false);
    } else {
      const ok = soundAlert.enable();
      setIsSoundEnabled(ok);
    }
  };

  // Manual table seat action
  const handleSeatTable = async (tableId: number, tableNumber: number) => {
    try {
      await posService.seatTableManually(tableId, tableNumber);
      await loadFloor();
    } catch (err) {
      console.error('Failed to seat table:', err);
      alert('Could not seat table. Please try again.');
    }
  };

  // Quick action: resolve service request directly from POS
  const handleResolveServiceRequest = async (requestId: string) => {
    try {
      await supabase
        .from('service_requests')
        .update({ status: 'DONE', resolved_at: new Date().toISOString() })
        .eq('id', requestId);
      await loadFloor();
      if (selectedTable) {
        setSelectedTable((prev) =>
          prev
            ? {
                ...prev,
                serviceRequests: prev.serviceRequests.filter((r) => r.id !== requestId)
              }
            : null
        );
      }
    } catch (err) {
      console.error('Error resolving request:', err);
    }
  };

  // Handle Close Session & Settle Table from POS
  const handleCloseSession = async (sessionId: string, tableId: number) => {
    try {
      await posService.closeSession(sessionId, tableId);
      setSelectedTable(null);
      await loadFloor();
    } catch (err) {
      console.error('Error closing session:', err);
      alert('Could not close session. Please try again.');
    }
  };

  // Handle marking ready food as delivered to table
  const handleMarkServed = async (sessionId: string) => {
    try {
      await posService.markOrdersServed(sessionId);
      await loadFloor();
    } catch (err) {
      console.error('Error marking orders served:', err);
    }
  };

  // Step 1: Mark Request "On My Way" (Customer sees "Waiter is on the way")
  const handleSetOnTheWay = async (requestId: string) => {
    try {
      await supabase
        .from('service_requests')
        .update({ status: 'ON_THE_WAY' })
        .eq('id', requestId);
      await loadFloor();
    } catch (err) {
      console.error('Error updating to ON_THE_WAY:', err);
    }
  };

  // Step 2: Mark Request "Done" (Unlocks button on customer phone)
  const handleSetDone = async (requestId: string) => {
    try {
      await supabase
        .from('service_requests')
        .update({ status: 'DONE', resolved_at: new Date().toISOString() })
        .eq('id', requestId);
      await loadFloor();
    } catch (err) {
      console.error('Error marking request DONE:', err);
    }
  };

  // Extract all active service requests across all tables
  const allActiveRequests = useMemo(() => {
    const list: EnrichedServiceRequest[] = [];
    floor.forEach((tableState) => {
      tableState.serviceRequests.forEach((req) => {
        if (req.status === 'PENDING' || req.status === 'ON_THE_WAY') {
          list.push({
            ...req,
            tableNumber: tableState.table.table_number,
            tableLabel: tableState.table.label
          });
        }
      });
    });
    // Longest waiting request at top
    return list.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [floor]);

  // Counts for tabs & summary
  const occupiedCount = floor.filter((t) => t.urgency !== 'FREE').length;
  const attentionCount = floor.filter(
    (t) =>
      t.urgency === 'SERVICE_PENDING' ||
      t.urgency === 'BILL_REQUESTED' ||
      t.urgency === 'READY_TO_SERVE'
  ).length;

  // Filtered tables based on activeTab & searchQuery
  const filteredFloor = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return floor.filter((t) => {
      const matchesTab =
        activeTab === 'ALL'
          ? true
          : activeTab === 'OCCUPIED'
          ? t.urgency !== 'FREE'
          : t.urgency === 'SERVICE_PENDING' ||
            t.urgency === 'BILL_REQUESTED' ||
            t.urgency === 'READY_TO_SERVE';

      const matchesSearch =
        !q ||
        t.table.label.toLowerCase().includes(q) ||
        `table ${t.table.table_number}`.includes(q);

      return matchesTab && matchesSearch;
    });
  }, [floor, activeTab, searchQuery]);

  const totalFloorRevenue = useMemo(() => {
    return floor.reduce((sum, t) => sum + Math.round(t.runningTotal || 0), 0);
  }, [floor]);

  const currencySymbol = settings?.currency_symbol || 'Rs.';

  return (
    <div className="min-h-screen bg-[#111214] text-zinc-100 p-4 sm:p-6 flex flex-col font-sans">
      <div className="max-w-[1600px] mx-auto w-full space-y-5 flex-1">
        {/* Top Bar */}
        <header className="bg-[#18191C] rounded-[22px] p-4 sm:px-5 border border-white/[0.08] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                  {settings?.name || 'Spice & Sizzle Bistro'}
                </span>
                <span className="text-zinc-600">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-400">Live POS Floor</span>
                </div>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Floor Plan &amp; Service Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <Link
              to="/"
              className="px-3.5 py-2 rounded-full bg-[#111214] hover:bg-white/[0.05] border border-white/[0.1] text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              QR Portal
            </Link>
            <Link
              to="/kitchen"
              className="px-3.5 py-2 rounded-full bg-[#111214] hover:bg-white/[0.05] border border-white/[0.1] text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              Kitchen KDS
            </Link>

            <button
              type="button"
              onClick={handleToggleSound}
              title={isSoundEnabled ? 'Mute alert chimes' : 'Enable audible chimes for orders & waiter calls'}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 border ${
                isSoundEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-[#111214] border-white/[0.1] text-zinc-400 hover:text-white'
              }`}
            >
              {isSoundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Sound Off</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => loadFloor()}
              title="Refresh floor state"
              className="p-2.5 rounded-full bg-[#111214] border border-white/[0.1] text-zinc-300 hover:text-white hover:border-white/25 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Floor Content + Pinned Service Queue Sidebar */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left Column: 3 Tinted KPI Cards + Filter Bar + Table Floor Grid */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Top 3 Tinted Glass Metric Cards (Exact Reference Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Rose Card: Needs Attention */}
              <div className="rounded-[22px] p-4 bg-gradient-to-br from-rose-950/45 via-[#1B181B] to-[#18191C] border border-rose-500/20 flex flex-col justify-between gap-3 shadow-lg">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-rose-400">Needs Attention</h3>
                    <p className="text-[11px] text-zinc-400">Service calls, ready food &amp; cash bills</p>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {attentionCount} tables
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ATTENTION')}
                  className="w-full py-2 px-3 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <span>Filter Attention</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Emerald Card: Live Floor Revenue */}
              <div className="rounded-[22px] p-4 bg-gradient-to-br from-emerald-950/45 via-[#171C1B] to-[#18191C] border border-emerald-500/20 flex flex-col justify-between gap-3 shadow-lg">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-400">Active Open Bills</h3>
                    <p className="text-[11px] text-zinc-400">Combined live tab across seated tables</p>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight tabular-nums">
                    {currencySymbol} {totalFloorRevenue.toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('OCCUPIED')}
                  className="w-full py-2 px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <span>View Occupied</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Indigo Card: Floor Occupancy */}
              <div className="rounded-[22px] p-4 bg-gradient-to-br from-indigo-950/45 via-[#181921] to-[#18191C] border border-indigo-500/20 flex flex-col justify-between gap-3 shadow-lg">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-indigo-400">Floor Occupancy</h3>
                    <p className="text-[11px] text-zinc-400">Seated dining sessions vs total capacity</p>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {occupiedCount} / {floor.length} seated
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className="w-full py-2 px-3 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/25 text-indigo-300 text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <span>View All Tables</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Pill Filter Strip & Pill Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition shrink-0 ${
                    activeTab === 'ALL'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-[#18191C] text-zinc-300 border border-white/[0.1] hover:border-white/25'
                  }`}
                >
                  All Tables ({floor.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('OCCUPIED')}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'OCCUPIED'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-[#18191C] text-zinc-300 border border-white/[0.1] hover:border-white/25'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeTab === 'OCCUPIED' ? 'bg-zinc-950' : 'bg-sky-400'}`} />
                  <span>Occupied ({occupiedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ATTENTION')}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'ATTENTION'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-[#18191C] text-zinc-300 border border-white/[0.1] hover:border-white/25'
                  }`}
                >
                  {attentionCount > 0 && (
                    <span className={`w-2 h-2 rounded-full animate-ping ${activeTab === 'ATTENTION' ? 'bg-zinc-950' : 'bg-rose-400'}`} />
                  )}
                  <span>Needs Attention ({attentionCount})</span>
                </button>
              </div>

              {/* Pill Search */}
              <div className="relative w-full md:w-60">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search table or zone..."
                  className="w-full pl-9 pr-4 py-2 rounded-full bg-[#18191C] border border-white/[0.1] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 transition"
                />
              </div>
            </div>

            {/* Responsive Table Floor Grid */}
            {isLoading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-zinc-400 font-bold">Loading floor plan...</p>
              </div>
            ) : filteredFloor.length === 0 ? (
              <div className="py-20 bg-[#18191C] rounded-[22px] border border-white/[0.08] text-center space-y-2 p-6">
                <h3 className="text-sm font-bold text-zinc-200">No tables matching this filter</h3>
                <p className="text-xs text-zinc-500">
                  {activeTab === 'ATTENTION'
                    ? 'All guest requests and ready orders have been cleared!'
                    : 'No tables match your current search or filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredFloor.map((t) => (
                  <TableCard
                    key={t.table.id}
                    tableState={t}
                    currencySymbol={currencySymbol}
                    requirePin={settings?.require_seating_pin}
                    onSelectTable={(tableState) => setSelectedTable(tableState)}
                    onSeatTable={handleSeatTable}
                    onResolveService={handleResolveServiceRequest}
                    onCollectCash={handleCloseSession}
                    onMarkServed={handleMarkServed}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Docked Service Request Queue */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-5">
            <ServiceRequestQueue
              requests={allActiveRequests}
              onSetOnTheWay={handleSetOnTheWay}
              onSetDone={handleSetDone}
            />
          </div>
        </div>
      </div>

      {/* Selected Table Detail Drawer / Modal */}
      {selectedTable && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="w-full max-w-lg bg-[#151619] border border-white/[0.1] rounded-t-[28px] sm:rounded-3xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#18191C]">
              <div>
                <h3 className="text-base font-black text-white">
                  Table {selectedTable.table.table_number} Details
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  {selectedTable.table.label} • {selectedTable.urgencyLabel}
                </p>
              </div>

              <button
                onClick={() => setSelectedTable(null)}
                className="w-8 h-8 rounded-full bg-[#111214] hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {selectedTable.serviceRequests.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                    Active Service Calls ({selectedTable.serviceRequests.length})
                  </span>
                  <div className="space-y-2">
                    {selectedTable.serviceRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#18191C] rounded-2xl p-3 border border-white/[0.08] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          {req.type === 'WATER' && <Droplets className="w-4 h-4 text-sky-400" />}
                          {req.type === 'CALL_WAITER' && <Bell className="w-4 h-4 text-amber-400" />}
                          {req.type === 'PAY_CASH' && <DollarSign className="w-4 h-4 text-rose-400" />}
                          <div>
                            <span className="font-black text-white block">
                              {req.type === 'WATER' && 'Water Requested'}
                              {req.type === 'CALL_WAITER' && 'Call Waiter'}
                              {req.type === 'PAY_CASH' && 'Cash Settlement Requested'}
                              {req.type === 'OTHER' && (req.note || 'Special Request')}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              Called at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleResolveServiceRequest(req.id)}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 text-emerald-300 font-bold text-xs transition"
                        >
                          Mark Done
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTable.session && (
                <div className="bg-[#18191C] rounded-2xl p-3.5 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Seating PIN
                    </span>
                    <span className="text-base font-mono font-black text-amber-400">
                      {selectedTable.session.seating_pin}
                    </span>
                  </div>
                  <span className="text-[10px] px-3 py-1 rounded-full bg-[#111214] border border-white/[0.08] text-zinc-300 font-semibold">
                    {selectedTable.session.pin_verified ? 'Unlocked by Guest' : 'Awaiting Unlock'}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  Orders ({selectedTable.orders.length} Rounds)
                </span>

                {selectedTable.orders.length === 0 ? (
                  <p className="text-zinc-500 italic py-2">No orders submitted yet for this session.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedTable.orders.map((order, oIdx) => (
                      <div
                        key={order.id}
                        className="bg-[#18191C] rounded-2xl p-3.5 border border-white/[0.08] space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                          <span className="font-bold text-zinc-200">
                            Round #{oIdx + 1}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                              order.status === 'READY'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : order.status === 'PREPARING'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-[#111214] text-zinc-300 border border-white/10'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="divide-y divide-white/[0.06]">
                          {(order.order_items || []).map((item) => (
                            <div key={item.id} className="py-1.5 flex justify-between">
                              <span className="text-zinc-300">
                                <span className="font-bold text-amber-400">{item.quantity}x</span>{' '}
                                {item.item_name}
                              </span>
                              <span className="font-mono text-zinc-300">
                                {currencySymbol} {(Number(item.unit_price) * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#18191C] rounded-2xl p-4 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                      Running Total (Inc. {settings?.tax_percent ?? 16}% Tax)
                    </span>
                    <span className="text-lg font-black text-white tabular-nums">
                      {currencySymbol} {Math.round(selectedTable.runningTotal).toLocaleString()}
                    </span>
                  </div>

                  {selectedTable.session && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCloseSession(
                          selectedTable.session!.id,
                          selectedTable.table.id
                        )
                      }
                      className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 shrink-0"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Collect &amp; Close Table</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterPage;
