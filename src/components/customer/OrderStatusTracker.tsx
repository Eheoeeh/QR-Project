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
  onOpenTracking?: () => void;
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
  tableLabel,
  onOpenTracking
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');
  if (activeOrders.length === 0) return null;

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

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'RECEIVED':
        return { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', text: 'Received by Kitchen' };
      case 'PREPARING':
        return { bg: 'bg-[#FF5B22]/20 text-orange-300 border-[#FF5B22]/40', text: 'Preparing on Stove' };
      case 'READY':
        return { bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40', text: 'Ready for Pickup' };
      case 'SERVED':
        return { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', text: 'Served to Table' };
      default:
        return { bg: 'bg-zinc-800 text-zinc-300 border-zinc-700', text: status };
    }
  };

  return (
    <>
      {/* Live Order Status Strip */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div
          onClick={() => {
            if (onOpenTracking) {
              onOpenTracking();
            } else {
              setIsDrawerOpen(true);
            }
          }}
          className="bg-[#18181B] rounded-2xl p-3 border border-white/[0.08] shadow-lg cursor-pointer hover:border-[#FF5B22]/60 active:scale-[0.99] transition flex items-center justify-between gap-3 select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FF5B22]/15 text-[#FF5B22] border border-[#FF5B22]/25 flex items-center justify-center shrink-0">
              {latestOrder.status === 'RECEIVED' && <Clock className="w-5 h-5 animate-pulse" />}
              {latestOrder.status === 'PREPARING' && <ChefHat className="w-5 h-5 animate-bounce" />}
              {latestOrder.status === 'READY' && <BellRing className="w-5 h-5 text-sky-400 animate-pulse" />}
              {latestOrder.status === 'SERVED' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5B22]">
                  Order #{latestOrder.order_number || 1}
                </span>
                <span className="text-[10px] text-zinc-400">• Round {activeOrders.length}</span>
              </div>
              <div className="text-xs font-black text-white truncate">
                {getStatusBadge(latestOrder.status).text}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              {STAGES.map((s, idx) => (
                <div
                  key={s.key}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx <= currentStageIndex
                      ? 'bg-[#FF5B22] scale-110'
                      : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            <div className="w-6 h-6 rounded-lg bg-[#242429] flex items-center justify-center text-zinc-400">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Full Order History Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0F0F12] text-white rounded-t-[28px] sm:rounded-3xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FF5B22]/15 text-[#FF5B22] flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Order Progress & History</h2>
                  <p className="text-xs text-zinc-400 font-medium">
                    {tableLabel} • {activeOrders.length} {activeOrders.length === 1 ? 'Round' : 'Rounds'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1E1E24] hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              {activeOrders.map((order, roundIdx) => {
                const stageIdx = getStageIndex(order.status);
                const badge = getStatusBadge(order.status);

                return (
                  <div
                    key={order.id}
                    className="bg-[#18181B] rounded-2xl p-4 border border-white/[0.08] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                          Round {roundIdx + 1}
                        </span>
                        <h4 className="font-black text-sm text-white">
                          Ticket #{order.order_number || roundIdx + 1}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${badge.bg}`}>
                        {badge.text}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {STAGES.map((stage, idx) => {
                        const isDoneOrActive = idx <= stageIdx;
                        const StageIcon = stage.icon;
                        return (
                          <div key={stage.key} className="text-center space-y-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isDoneOrActive ? 'bg-[#FF5B22]' : 'bg-zinc-800'
                              }`}
                            />
                            <div className="flex items-center justify-center gap-1">
                              <StageIcon
                                className={`w-3 h-3 ${
                                  isDoneOrActive ? 'text-[#FF5B22]' : 'text-zinc-600'
                                }`}
                              />
                              <span
                                className={`text-[9px] font-bold ${
                                  isDoneOrActive ? 'text-white' : 'text-zinc-500'
                                }`}
                              >
                                {stage.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-[#111114] rounded-xl p-3 border border-white/[0.06] divide-y divide-white/[0.06] space-y-1.5">
                      {(order.order_items || []).map((item, itemIdx) => (
                        <div
                          key={item.id || itemIdx}
                          className="pt-1.5 first:pt-0 flex items-start justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white">
                              {item.quantity}x {item.item_name}
                            </span>
                            {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                              <div className="text-[10px] text-[#FF5B22]">
                                + {item.selected_modifiers.map((m) => m.name).join(', ')}
                              </div>
                            )}
                            {item.note && (
                              <div className="text-[10px] text-amber-300/90 italic">
                                &ldquo;{item.note}&rdquo;
                              </div>
                            )}
                          </div>

                          <span className="font-extrabold text-white shrink-0 tabular-nums">
                            {currencySymbol} {(Number(item.unit_price) * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 pb-6 sm:pb-4 border-t border-white/10 bg-[#121215] shrink-0 text-center">
              <p className="text-[11px] text-zinc-500">
                You can browse the menu and add extra rounds anytime.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderStatusTracker;
