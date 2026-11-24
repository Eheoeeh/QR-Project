import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import {
  Clock,
  ChefHat,
  BellRing,
  CheckCircle2,
  ChevronRight,
  X,
  History
} from 'lucide-react';

interface OrderStatusTrackerProps {
  orders: Order[];
  currencySymbol?: string;
  tableLabel: string;
}

const STAGES: { key: OrderStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'RECEIVED', label: 'Received', icon: Clock },
  { key: 'PREPARING', label: 'Preparing', icon: ChefHat },
  { key: 'READY', label: 'Ready', icon: BellRing },
  { key: 'SERVED', label: 'Served', icon: CheckCircle2 }
];

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  orders,
  currencySymbol = 'Rs.',
  tableLabel
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');
  if (activeOrders.length === 0) return null;

  // The latest active order is the one currently in progress (or last submitted)
  const latestOrder = activeOrders[activeOrders.length - 1];

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

  const currentStageIndex = getStageIndex(latestOrder.status);

  // Status badge styling
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'RECEIVED':
        return { bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20', text: 'Received by Kitchen' };
      case 'PREPARING':
        return { bg: 'bg-orange-500/10 text-orange-600 border-orange-500/20', text: 'Preparing on Stove' };
      case 'READY':
        return { bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20', text: 'Ready for Pickup' };
      case 'SERVED':
        return { bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', text: 'Served to Table' };
      default:
        return { bg: 'bg-slate-100 text-slate-600 border-slate-200', text: status };
    }
  };

  return (
    <>
      {/* Always-reachable Sticky Live Order Status Strip */}
      <div className="max-w-2xl mx-auto px-4 pt-2">
        <div
          onClick={() => setIsDrawerOpen(true)}
          className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs cursor-pointer hover:border-orange-400 active:scale-[0.99] transition flex items-center justify-between gap-3 select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Animated Stage Icon */}
            <div className="w-9 h-9 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center shrink-0">
              {latestOrder.status === 'RECEIVED' && <Clock className="w-5 h-5 animate-pulse" />}
              {latestOrder.status === 'PREPARING' && <ChefHat className="w-5 h-5 animate-bounce" />}
              {latestOrder.status === 'READY' && <BellRing className="w-5 h-5 text-blue-600 animate-pulse" />}
              {latestOrder.status === 'SERVED' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                  Order #{latestOrder.order_number || 1}
                </span>
                <span className="text-[10px] text-slate-400">• Round {activeOrders.length}</span>
              </div>
              <div className="text-xs font-black text-slate-900 truncate">
                {getStatusBadge(latestOrder.status).text}
              </div>
            </div>
          </div>

          {/* Stepper Progress Dots & Expand Arrow */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              {STAGES.map((s, idx) => (
                <div
                  key={s.key}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx <= currentStageIndex
                      ? 'bg-orange-600 scale-110'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Full Order History Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-600/10 text-orange-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Order Progress & History</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {tableLabel} • {activeOrders.length} {activeOrders.length === 1 ? 'Round' : 'Rounds'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              {activeOrders.map((order, roundIdx) => {
                const stageIdx = getStageIndex(order.status);
                const badge = getStatusBadge(order.status);

                return (
                  <div
                    key={order.id}
                    className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3"
                  >
                    {/* Round Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Round {roundIdx + 1}
                        </span>
                        <h4 className="font-black text-sm text-slate-900">
                          Ticket #{order.order_number || roundIdx + 1}
                        </h4>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${badge.bg}`}
                      >
                        {badge.text}
                      </span>
                    </div>

                    {/* Progress Bar with 4 Clear Steps */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {STAGES.map((stage, idx) => {
                        const isDoneOrActive = idx <= stageIdx;
                        const StageIcon = stage.icon;
                        return (
                          <div key={stage.key} className="text-center space-y-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isDoneOrActive ? 'bg-orange-600' : 'bg-slate-200'
                              }`}
                            />
                            <div className="flex items-center justify-center gap-1">
                              <StageIcon
                                className={`w-3 h-3 ${
                                  isDoneOrActive ? 'text-orange-600' : 'text-slate-300'
                                }`}
                              />
                              <span
                                className={`text-[9px] font-bold ${
                                  isDoneOrActive ? 'text-slate-800' : 'text-slate-400'
                                }`}
                              >
                                {stage.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Itemized Dishes in this Round */}
                    <div className="bg-white rounded-xl p-3 border border-slate-200/60 divide-y divide-slate-100 space-y-1.5">
                      {(order.order_items || []).map((item, itemIdx) => (
                        <div
                          key={item.id || itemIdx}
                          className="pt-1.5 first:pt-0 flex items-start justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              {item.quantity}x {item.item_name}
                            </span>
                            {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                              <div className="text-[10px] text-orange-600">
                                + {item.selected_modifiers.map((m) => m.name).join(', ')}
                              </div>
                            )}
                            {item.note && (
                              <div className="text-[10px] text-slate-400 italic">
                                "{item.note}"
                              </div>
                            )}
                          </div>

                          <span className="font-extrabold text-slate-900 shrink-0">
                            {currencySymbol} {(Number(item.unit_price) * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 pb-6 sm:pb-4 border-t border-slate-100 bg-white shrink-0 text-center">
              <p className="text-[11px] text-slate-400">
                You can browse the menu and add extra rounds of drinks or dishes at any time!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderStatusTracker;
