import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { posService, TableFloorState } from '../services/posService';
import { RestaurantSettings } from '../types';
import { TableCard } from '../components/waiter/TableCard';
import { soundAlert } from '../utils/soundAlert';
import {
  Users,
  Volume2,
  VolumeX,
  RefreshCw,
  X,
  Droplets,
  Bell,
  DollarSign
} from 'lucide-react';

type FilterTab = 'ALL' | 'OCCUPIED' | 'ATTENTION';

export const WaiterPage: React.FC = () => {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [floor, setFloor] = useState<TableFloorState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
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

  // Real-time Supabase subscriptions for dining room changes
  useEffect(() => {
    const channel = supabase
      .channel('pos-realtime-floor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_sessions' },
        () => loadFloor()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => loadFloor()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadFloor();
          soundAlert.playChime(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        (payload) => {
          loadFloor();
          if (payload.eventType === 'INSERT') {
            soundAlert.playChime(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFloor]);

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

  // Counts for tabs & summary
  const occupiedCount = floor.filter((t) => t.urgency !== 'FREE').length;
  const attentionCount = floor.filter(
    (t) =>
      t.urgency === 'SERVICE_PENDING' ||
      t.urgency === 'BILL_REQUESTED' ||
      t.urgency === 'READY_TO_SERVE'
  ).length;

  // Filtered tables based on activeTab
  const filteredFloor = useMemo(() => {
    switch (activeTab) {
      case 'OCCUPIED':
        return floor.filter((t) => t.urgency !== 'FREE');
      case 'ATTENTION':
        return floor.filter(
          (t) =>
            t.urgency === 'SERVICE_PENDING' ||
            t.urgency === 'BILL_REQUESTED' ||
            t.urgency === 'READY_TO_SERVE'
        );
      case 'ALL':
      default:
        return floor;
    }
  }, [floor, activeTab]);

  const currencySymbol = settings?.currency_symbol || 'Rs.';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-5 flex flex-col font-sans">
      <div className="max-w-7xl mx-auto w-full space-y-4 sm:space-y-5 flex-1">
        {/* Top Bar */}
        <header className="bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/10 text-orange-500 border border-orange-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider block">
                  {settings?.name || 'Spice & Sizzle Bistro'}
                </span>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-400">Live POS Floor</span>
                </div>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Floor Plan & Service Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Alert Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={isSoundEnabled ? 'Mute alert chimes' : 'Enable audible chimes for orders & waiter calls'}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                isSoundEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-xs ring-1 ring-emerald-500/30'
                  : 'bg-slate-800/90 border-slate-700 text-slate-400 hover:text-slate-200'
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

            {/* Refresh Floor */}
            <button
              type="button"
              onClick={() => loadFloor()}
              title="Refresh floor state"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Quick Filter Tabs & Floor Metric Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition shrink-0 ${
                activeTab === 'ALL'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All Tables ({floor.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('OCCUPIED')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'OCCUPIED'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Occupied ({occupiedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ATTENTION')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'ATTENTION'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {attentionCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
              <span>Needs Attention ({attentionCount})</span>
            </button>
          </div>

          {/* Quick Legend Indicator */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-400 px-2 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> Free
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Cooking
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Food Ready
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Service Call
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> Pay Cash
            </span>
          </div>
        </div>

        {/* Responsive Table Floor Grid (Phone: 1 col, Tablet: 2 cols, Desktop: 3 cols, Ultra-wide: 4 cols) */}
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-bold">Loading floor plan...</p>
          </div>
        ) : filteredFloor.length === 0 ? (
          <div className="py-20 bg-slate-900/60 rounded-3xl border border-slate-800 text-center space-y-2 p-6">
            <h3 className="text-sm font-bold text-slate-300">No tables matching this filter</h3>
            <p className="text-xs text-slate-500">
              {activeTab === 'ATTENTION'
                ? 'All guest requests and ready orders have been cleared!'
                : 'No occupied tables currently.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
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

      {/* Selected Table Detail Drawer / Modal */}
      {selectedTable && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs transition-opacity"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div>
                <h3 className="text-base font-black text-white">
                  Table {selectedTable.table.table_number} Details
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {selectedTable.table.label} • {selectedTable.urgencyLabel}
                </p>
              </div>

              <button
                onClick={() => setSelectedTable(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Active Service Requests Section */}
              {selectedTable.serviceRequests.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                    Active Service Calls ({selectedTable.serviceRequests.length})
                  </span>
                  <div className="space-y-2">
                    {selectedTable.serviceRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          {req.type === 'WATER' && <Droplets className="w-4 h-4 text-blue-400" />}
                          {req.type === 'CALL_WAITER' && <Bell className="w-4 h-4 text-amber-400" />}
                          {req.type === 'PAY_CASH' && <DollarSign className="w-4 h-4 text-purple-400" />}
                          <div>
                            <span className="font-black text-white block">
                              {req.type === 'WATER' && 'Water Requested'}
                              {req.type === 'CALL_WAITER' && 'Call Waiter'}
                              {req.type === 'PAY_CASH' && 'Cash Settlement Requested'}
                              {req.type === 'OTHER' && (req.note || 'Special Request')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Called at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleResolveServiceRequest(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                        >
                          Mark Done
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seating PIN Card */}
              {selectedTable.session && (
                <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Seating PIN
                    </span>
                    <span className="text-base font-mono font-black text-amber-400">
                      {selectedTable.session.seating_pin}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">
                    {selectedTable.session.pin_verified ? 'Unlocked by Guest' : 'Awaiting Unlock'}
                  </span>
                </div>
              )}

              {/* Placed Orders List */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Orders ({selectedTable.orders.length} Rounds)
                </span>

                {selectedTable.orders.length === 0 ? (
                  <p className="text-slate-500 italic py-2">No orders submitted yet for this session.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedTable.orders.map((order, oIdx) => (
                      <div
                        key={order.id}
                        className="bg-slate-800/90 rounded-2xl p-3 border border-slate-700 space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                          <span className="font-bold text-slate-200">
                            Round #{oIdx + 1}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              order.status === 'READY'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : order.status === 'PREPARING'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-700/50">
                          {(order.order_items || []).map((item) => (
                            <div key={item.id} className="py-1.5 flex justify-between">
                              <span className="text-slate-300">
                                <span className="font-bold text-orange-400">{item.quantity}x</span>{' '}
                                {item.item_name}
                              </span>
                              <span className="font-mono text-slate-400">
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

              {/* Financial Running Total & Settlement Action */}
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Running Total (Inc. 16% Tax)
                    </span>
                    <span className="text-lg font-black text-white">
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
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Collect & Close Table</span>
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
