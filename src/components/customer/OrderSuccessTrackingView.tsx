import React, { useState } from 'react';
import { Order, OrderStatus, RestaurantSettings, ServiceRequest, ServiceRequestType } from '../../types';
import {
  Clock,
  ChefHat,
  BellRing,
  CheckCircle2,
  PlusCircle,
  Receipt,
  Droplets,
  Bell,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Navigation,
  ArrowLeft
} from 'lucide-react';

interface OrderSuccessTrackingViewProps {
  orders: Order[];
  tableLabel: string;
  settings: RestaurantSettings | null;
  runningTotal: number;
  activeRequests: ServiceRequest[];
  onOrderMore: () => void;
  onViewBill: () => void;
  onRequestService: (type: ServiceRequestType) => void;
}

const STAGES: {
  key: OrderStatus;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    key: 'RECEIVED',
    title: 'Received',
    description: 'Ticket printed in kitchen',
    icon: Clock
  },
  {
    key: 'PREPARING',
    title: 'Preparing',
    description: 'Chef is cooking your dishes',
    icon: ChefHat
  },
  {
    key: 'READY',
    title: 'Ready',
    description: 'Plated & ready for server',
    icon: BellRing
  },
  {
    key: 'SERVED',
    title: 'Served',
    description: 'Enjoy your meal!',
    icon: CheckCircle2
  }
];

export const OrderSuccessTrackingView: React.FC<OrderSuccessTrackingViewProps> = ({
  orders,
  tableLabel,
  settings,
  runningTotal,
  activeRequests,
  onOrderMore,
  onViewBill,
  onRequestService
}) => {
  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(
    Math.max(0, activeOrders.length - 1)
  );
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(true);

  if (activeOrders.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-[#0B0B0D] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FF5B22]/15 border border-[#FF5B22]/30 text-[#FF5B22] flex items-center justify-center mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-white">No active orders yet</h2>
        <p className="text-xs text-zinc-400 mt-1 mb-6">
          Browse our menu and place your first round of dishes.
        </p>
        <button
          onClick={onOrderMore}
          className="py-3 px-6 rounded-full bg-[#FF5B22] text-white font-bold text-sm shadow-lg hover:bg-[#ff6d3a] transition"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  const currentOrder = activeOrders[selectedRoundIdx] || activeOrders[activeOrders.length - 1];

  const getStageIndex = (status: OrderStatus) => {
    switch (status) {
      case 'RECEIVED':
        return 0;
      case 'PREPARING':
        return 1;
      case 'READY':
        return 2;
      case 'SERVED':
        return 3;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(currentOrder.status);
  const currencySymbol = settings?.currency_symbol || 'Rs.';

  const waterReq = activeRequests.find((r) => r.type === 'WATER' && r.status !== 'DONE');
  const waiterReq = activeRequests.find((r) => r.type === 'CALL_WAITER' && r.status !== 'DONE');
  const onTheWayRequest = activeRequests.find((r) => r.status === 'ON_THE_WAY');

  const isWaterOnTheWay = waterReq?.status === 'ON_THE_WAY';
  const isWaiterOnTheWay = waiterReq?.status === 'ON_THE_WAY';
  const isWaterPending = !!waterReq;
  const isWaiterPending = !!waiterReq;

  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] text-white flex flex-col pb-10">
      {/* Top Curved Orange Header */}
      <header className="bg-gradient-to-br from-[#FF5B22] to-[#FF7235] rounded-b-[26px] shadow-xl">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onOrderMore}
              className="w-9 h-9 rounded-full bg-black/25 border border-white/20 text-white flex items-center justify-center shrink-0 hover:bg-black/40 transition active:scale-90"
              aria-label="Back to menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-wider block truncate">
                {settings?.name || 'Spice & Sizzle Bistro'}
              </span>
              <h1 className="text-sm font-black text-white flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shrink-0" />
                <span className="truncate">{tableLabel}</span>
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewBill}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/30 hover:bg-black/45 border border-white/20 text-white text-xs font-black transition active:scale-95 shrink-0"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {currencySymbol} {runningTotal.toLocaleString()}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto w-full p-4 space-y-4 flex-1">
        {/* Real-time "On The Way" Live Notification Banner */}
        {onTheWayRequest && (
          <div className="bg-sky-600 text-white p-3.5 rounded-2xl shadow-lg border border-sky-400/50 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 text-white animate-bounce" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-xs block truncate">
                  {onTheWayRequest.type === 'WATER'
                    ? 'Water Refill is on the way!'
                    : onTheWayRequest.type === 'PAY_CASH'
                    ? 'Waiter heading over with cash receipt!'
                    : 'Waiter is on the way to your table!'}
                </span>
                <span className="text-[11px] text-sky-100 block truncate">
                  Staff acknowledged your call and is en route.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider shrink-0">
              En Route
            </span>
          </div>
        )}

        {/* Live Order Hero Card */}
        <div className="bg-[#18181B] rounded-3xl p-5 border border-white/[0.08] shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {currentOrder.status === 'SERVED' ? 'Order Served!' : 'Order Placed Live!'}
              </span>
            </div>

            {activeOrders.length > 1 && (
              <div className="flex items-center gap-1 bg-[#111114] p-1 rounded-full border border-white/10">
                {activeOrders.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedRoundIdx(idx)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                      selectedRoundIdx === idx
                        ? 'bg-[#FF5B22] text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Round {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {currentOrder.status === 'RECEIVED' && 'Received by Kitchen'}
              {currentOrder.status === 'PREPARING' && 'Chef is Cooking'}
              {currentOrder.status === 'READY' && 'Food Ready for Table'}
              {currentOrder.status === 'SERVED' && 'Enjoy Your Meal!'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Round #{selectedRoundIdx + 1} • Placed at{' '}
              {new Date(currentOrder.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {/* 4-Stage Visual Progress Bar */}
          <div className="py-2">
            <div className="grid grid-cols-4 gap-2 relative">
              <div className="absolute top-4 inset-x-6 h-1 bg-zinc-800 rounded-full" />
              <div
                className="absolute top-4 left-6 h-1 bg-[#FF5B22] transition-all duration-500 rounded-full"
                style={{
                  width: `${(currentStageIndex / (STAGES.length - 1)) * 84}%`
                }}
              />

              {STAGES.map((stage, idx) => {
                const isPassed = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const IconComponent = stage.icon;

                return (
                  <div key={stage.key} className="flex flex-col items-center text-center relative z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-[#FF5B22] text-white shadow-lg ring-4 ring-[#FF5B22]/25 scale-105'
                          : isPassed
                          ? 'bg-[#FF5B22] text-white'
                          : 'bg-[#111114] border-2 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[11px] font-black mt-2 block ${
                        isCurrent ? 'text-[#FF5B22]' : isPassed ? 'text-white' : 'text-zinc-500'
                      }`}
                    >
                      {stage.title}
                    </span>
                    <span className="text-[9px] text-zinc-400 leading-tight hidden sm:block mt-0.5">
                      {stage.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Big Action: Order More Dishes */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onOrderMore}
              className="w-full py-3.5 px-5 rounded-full bg-[#FF5B22] hover:bg-[#ff6d3a] active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-orange-950/50 transition flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Order More Dishes / Drinks</span>
            </button>
          </div>
        </div>

        {/* Quick Service Requests Bar */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isWaterPending}
            onClick={() => onRequestService('WATER')}
            className={`p-3.5 rounded-2xl border transition flex items-center gap-3 text-left ${
              isWaterOnTheWay
                ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                : isWaterPending
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 cursor-not-allowed'
                : 'bg-[#18181B] hover:border-sky-400/50 border-white/[0.08] text-white active:scale-[0.98]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isWaterOnTheWay
                  ? 'bg-white/20 text-white'
                  : isWaterPending
                  ? 'bg-sky-500/25 text-sky-300'
                  : 'bg-sky-500/15 text-sky-400'
              }`}
            >
              <Droplets className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block truncate">
                {isWaterOnTheWay ? 'Water on the Way!' : isWaterPending ? 'Water Requested' : 'Need Water'}
              </span>
              <span className={`text-[10px] block truncate ${isWaterOnTheWay ? 'text-sky-100 font-medium' : 'text-zinc-400'}`}>
                {isWaterOnTheWay ? 'Staff heading to table' : isWaterPending ? 'Waiting for staff' : 'Bring jug to table'}
              </span>
            </div>
          </button>

          <button
            type="button"
            disabled={isWaiterPending}
            onClick={() => onRequestService('CALL_WAITER')}
            className={`p-3.5 rounded-2xl border transition flex items-center gap-3 text-left ${
              isWaiterOnTheWay
                ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                : isWaiterPending
                ? 'bg-[#FF5B22]/15 border-[#FF5B22]/40 text-orange-300 cursor-not-allowed'
                : 'bg-[#18181B] hover:border-[#FF5B22]/50 border-white/[0.08] text-white active:scale-[0.98]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isWaiterOnTheWay
                  ? 'bg-white/20 text-white'
                  : isWaiterPending
                  ? 'bg-[#FF5B22]/25 text-[#FF5B22]'
                  : 'bg-[#FF5B22]/15 text-[#FF5B22]'
              }`}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block truncate">
                {isWaiterOnTheWay ? 'Waiter on the Way!' : isWaiterPending ? 'Waiter Called' : 'Call Waiter'}
              </span>
              <span className={`text-[10px] block truncate ${isWaiterOnTheWay ? 'text-sky-100 font-medium' : 'text-zinc-400'}`}>
                {isWaiterOnTheWay ? 'Staff heading to table' : isWaiterPending ? 'Waiting for staff' : 'Assistance at table'}
              </span>
            </div>
          </button>
        </div>

        {/* Ordered Dishes Details Accordion */}
        <div className="bg-[#18181B] rounded-3xl border border-white/[0.08] overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.03] transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Items in Round #{selectedRoundIdx + 1}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#111114] text-zinc-300 border border-white/10">
                {(currentOrder.order_items || []).reduce((acc, i) => acc + i.quantity, 0)} items
              </span>
            </div>
            {isDetailsExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {isDetailsExpanded && (
            <div className="p-4 pt-0 divide-y divide-white/[0.06]">
              {(currentOrder.order_items || []).map((item, idx) => (
                <div key={item.id || idx} className="py-2.5 first:pt-1 last:pb-1 flex justify-between items-start text-xs">
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="text-[#FF5B22] font-black">{item.quantity}x</span>
                      <span className="truncate">{item.item_name}</span>
                    </div>
                    {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                      <div className="text-[10px] text-[#FF5B22] pl-4">
                        + {item.selected_modifiers.map((m) => m.name).join(', ')}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-[10px] text-amber-300/90 italic pl-4">
                        &ldquo;{item.note}&rdquo;
                      </div>
                    )}
                  </div>

                  <span className="font-black text-white shrink-0 tabular-nums">
                    {currencySymbol} {(Number(item.unit_price) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Bill Shortcut Card */}
        <div className="bg-[#18181B] border border-white/[0.08] text-white rounded-3xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-extrabold text-[#FF5B22] uppercase tracking-wider block">
              Running Table Total
            </span>
            <div className="text-lg font-black text-white tabular-nums">
              {currencySymbol} {runningTotal.toLocaleString()}
            </div>
          </div>

          <button
            type="button"
            onClick={onViewBill}
            className="py-2.5 px-4 rounded-full bg-[#FF5B22] hover:bg-[#ff6d3a] text-white text-xs font-extrabold transition shadow-md flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Split &amp; Pay</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default OrderSuccessTrackingView;
