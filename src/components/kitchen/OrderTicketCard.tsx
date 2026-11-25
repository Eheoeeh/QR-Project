import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Flame, Printer, Check, Loader2 } from 'lucide-react';
import { KitchenTicket } from '../../services/kitchenService';

interface OrderTicketCardProps {
  ticket: KitchenTicket;
  onStartPreparing: (ticketId: string) => Promise<void> | void;
  onMarkReady: (ticketId: string) => Promise<void> | void;
  onMarkServed: (ticketId: string) => Promise<void> | void;
  onPrintKOT: (ticket: KitchenTicket) => void;
}

export const OrderTicketCard: React.FC<OrderTicketCardProps> = ({
  ticket,
  onStartPreparing,
  onMarkReady,
  onMarkServed,
  onPrintKOT
}) => {
  const [now, setNow] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (e: React.MouseEvent, action: () => Promise<void> | void) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
    }
  };

  const elapsedSec = Math.max(0, Math.floor((now - new Date(ticket.created_at).getTime()) / 1000));
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Urgency styling based on waiting time and status
  let borderClass = 'border-slate-700';
  let timerClass = 'text-slate-200';
  let isDelayed = false;

  if (ticket.status !== 'READY') {
    if (mins >= 10) {
      borderClass = 'border-red-500 shadow-lg shadow-red-950/50 ring-1 ring-red-500/50';
      timerClass = 'text-red-300 animate-pulse';
      isDelayed = true;
    } else if (mins >= 5) {
      borderClass = 'border-amber-500 shadow-md shadow-amber-950/40';
      timerClass = 'text-amber-300';
    }
  } else {
    borderClass = 'border-emerald-500/80 shadow-lg shadow-emerald-950/30';
    timerClass = 'text-emerald-300';
  }

  return (
    <div className={`bg-slate-900 rounded-2xl border-2 ${borderClass} overflow-hidden shadow-xl flex flex-col justify-between transition-colors duration-150`}>
      {/* Ticket Header */}
      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800/95 px-4 py-3 flex items-center justify-between gap-2 border-b border-slate-700/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-lg sm:text-xl text-amber-400 tracking-tight">
                #{ticket.order_number}
              </span>
              <span className="text-slate-500 text-sm">•</span>
              <span className="font-black text-lg sm:text-xl text-white tracking-tight">
                Table {ticket.table_number}
              </span>
            </div>
            {ticket.table_label && (
              <p className="text-xs font-semibold text-slate-300 truncate mt-0.5">
                {ticket.table_label}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-sm sm:text-base font-extrabold tabular-nums ${timerClass}`}
              title="Elapsed cook time"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{timeFormatted}</span>
            </div>
            <button
              onClick={() => onPrintKOT(ticket)}
              title="Preview & Print 80mm KOT Slip"
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition border border-slate-600"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Strip & Delay Flag */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {ticket.status === 'RECEIVED' && (
              <span className="px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40">
                NEW ORDER
              </span>
            )}
            {ticket.status === 'PREPARING' && (
              <span className="px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-sky-300" />
                COOKING
              </span>
            )}
            {ticket.status === 'READY' && (
              <span className="px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                READY AT PASS
              </span>
            )}
          </div>
          {isDelayed && (
            <span className="text-red-300 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded font-black text-xs tracking-wide uppercase animate-pulse">
              HIGH WAIT
            </span>
          )}
        </div>

        {/* High-Contrast Large-Print Order Items */}
        <div className="p-4 divide-y divide-slate-800/90">
          {ticket.items.map((item, idx) => (
            <div key={item.id || idx} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-2.5">
                <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums leading-tight shrink-0 min-w-[2.2rem]">
                  {item.quantity}x
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-white leading-snug tracking-tight break-words">
                  {item.item_name}
                </span>
              </div>

              {/* Modifiers */}
              {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                <div className="ml-10 mt-1.5 space-y-1 pl-3 border-l-2 border-orange-500/70">
                  {item.selected_modifiers.map((mod, mIdx) => (
                    <div key={mIdx} className="text-sm sm:text-base font-bold text-orange-300 leading-snug">
                      + {mod.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Custom Note */}
              {item.note && (
                <div className="ml-10 mt-2">
                  <span className="text-sm sm:text-base text-amber-100 bg-amber-500/15 px-3 py-1.5 rounded-lg border border-amber-400/50 inline-block font-bold leading-snug">
                    NOTE: {item.note}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Action Footer with Fixed Minimum Height */}
      <div className="bg-slate-800/60 px-4 py-3 border-t border-slate-800 min-h-[68px] flex items-center">
        {ticket.status === 'RECEIVED' && (
          <div className="flex items-center gap-2.5 w-full">
            <button
              disabled={isProcessing}
              onClick={(e) => handleAction(e, () => onStartPreparing(ticket.id))}
              className="flex-1 py-3 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-sm font-extrabold transition flex items-center justify-center gap-1.5 shadow"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Flame className="w-4 h-4" />
              )}
              <span>Start Preparing</span>
            </button>
            <button
              disabled={isProcessing}
              onClick={(e) => handleAction(e, () => onMarkReady(ticket.id))}
              className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-extrabold transition flex items-center justify-center gap-1.5 shadow"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Mark Ready</span>
            </button>
          </div>
        )}

        {ticket.status === 'PREPARING' && (
          <button
            disabled={isProcessing}
            onClick={(e) => handleAction(e, () => onMarkReady(ticket.id))}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-extrabold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Mark Ready for Pickup</span>
          </button>
        )}

        {ticket.status === 'READY' && (
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="text-sm text-emerald-300 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ready for server</span>
            </div>
            <button
              disabled={isProcessing}
              onClick={(e) => handleAction(e, () => onMarkServed(ticket.id))}
              className="py-2.5 px-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white text-sm font-bold transition flex items-center gap-1.5 border border-slate-600 shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Clear Pass</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
