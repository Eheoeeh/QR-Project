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
  Sparkles
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
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">No active orders yet</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Browse our menu and place your first round of dishes.
        </p>
        <button
          onClick={onOrderMore}
          className="py-3 px-6 rounded-2xl bg-orange-600 text-white font-bold text-sm shadow-md hover:bg-orange-500 transition"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  // Current order to display
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

  const isWaterPending = activeRequests.some((r) => r.type === 'WATER' && r.status !== 'DONE');
  const isWaiterPending = activeRequests.some((r) => r.type === 'CALL_WAITER' && r.status !== 'DONE');

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col pb-10">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider block">
              {settings?.name || 'Spice & Sizzle Bistro'}
            </span>
            <h1 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{tableLabel}</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewBill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-2xs transition active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5 text-orange-400" />
              <span>{currencySymbol} {runningTotal.toLocaleString()}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto w-full p-4 space-y-4 flex-1">
        {/* Celebration / Live Status Hero Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {currentOrder.status === 'SERVED' ? 'Order Served!' : 'Order Placed Live!'}
              </span>
            </div>

            {/* Round Selector if multiple rounds */}
            {activeOrders.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {activeOrders.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedRoundIdx(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      selectedRoundIdx === idx
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Round {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {currentOrder.status === 'RECEIVED' && 'Received by Kitchen'}
              {currentOrder.status === 'PREPARING' && 'Chef is Cooking'}
              {currentOrder.status === 'READY' && 'Food Ready for Table'}
              {currentOrder.status === 'SERVED' && 'Enjoy Your Meal!'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
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
              {/* Connecting line behind icons */}
              <div className="absolute top-4 inset-x-6 h-1 bg-slate-100 -z-0 rounded-full" />
              <div
                className="absolute top-4 left-6 h-1 bg-orange-500 transition-all duration-500 -z-0 rounded-full"
                style={{
                  width: `${(currentStageIndex / (STAGES.length - 1)) * 88}%`
                }}
              />

              {STAGES.map((stage, idx) => {
                const isPassed = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const IconComponent = stage.icon;

                return (
                  <div key={stage.key} className="flex flex-col items-center text-center relative z-10">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-orange-600 text-white shadow-md ring-4 ring-orange-100 scale-105'
                          : isPassed
                          ? 'bg-orange-600 text-white'
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[11px] font-black mt-2 block ${
                        isCurrent ? 'text-orange-600' : isPassed ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {stage.title}
                    </span>
                    <span className="text-[9px] text-slate-400 leading-tight hidden sm:block mt-0.5">
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
              className="w-full py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
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
              isWaterPending
                ? 'bg-blue-50 border-blue-200 text-blue-700 opacity-80 cursor-not-allowed'
                : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs active:scale-98'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isWaterPending ? 'bg-blue-200 text-blue-700' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Droplets className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block truncate">
                {isWaterPending ? 'Water on Way' : 'Need Water'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {isWaterPending ? 'Waiter notified' : 'Bring jug to table'}
              </span>
            </div>
          </button>

          <button
            type="button"
            disabled={isWaiterPending}
            onClick={() => onRequestService('CALL_WAITER')}
            className={`p-3.5 rounded-2xl border transition flex items-center gap-3 text-left ${
              isWaiterPending
                ? 'bg-amber-50 border-amber-200 text-amber-700 opacity-80 cursor-not-allowed'
                : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs active:scale-98'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isWaiterPending ? 'bg-amber-200 text-amber-700' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block truncate">
                {isWaiterPending ? 'Waiter Called' : 'Call Waiter'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {isWaiterPending ? 'Staff notified' : 'Assistance at table'}
              </span>
            </div>
          </button>
        </div>

        {/* Ordered Dishes Details Accordion */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Items in Round #{selectedRoundIdx + 1}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {(currentOrder.order_items || []).reduce((acc, i) => acc + i.quantity, 0)} items
              </span>
            </div>
            {isDetailsExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isDetailsExpanded && (
            <div className="p-4 pt-0 divide-y divide-slate-100">
              {(currentOrder.order_items || []).map((item, idx) => (
                <div key={item.id || idx} className="py-2.5 first:pt-1 last:pb-1 flex justify-between items-start text-xs">
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-orange-600 font-black">{item.quantity}x</span>
                      <span className="truncate">{item.item_name}</span>
                    </div>
                    {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                      <div className="text-[10px] text-orange-600 pl-4">
                        + {item.selected_modifiers.map((m) => m.name).join(', ')}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-[10px] text-slate-400 italic pl-4">
                        "{item.note}"
                      </div>
                    )}
                  </div>

                  <span className="font-black text-slate-800 shrink-0">
                    {currencySymbol} {(Number(item.unit_price) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Bill Shortcut Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider block">
              Running Table Total
            </span>
            <div className="text-lg font-black text-white">
              {currencySymbol} {runningTotal.toLocaleString()}
            </div>
          </div>

          <button
            type="button"
            onClick={onViewBill}
            className="py-2 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Split & Pay</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default OrderSuccessTrackingView;
