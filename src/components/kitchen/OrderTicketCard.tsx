import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Flame, Printer, Check } from 'lucide-react';
import { KitchenTicket } from '../../services/kitchenService';

interface OrderTicketCardProps {
  ticket: KitchenTicket;
  onStartPreparing: (ticketId: string) => void;
  onMarkReady: (ticketId: string) => void;
  onMarkServed: (ticketId: string) => void;
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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedSec = Math.max(0, Math.floor((now - new Date(ticket.created_at).getTime()) / 1000));
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} ago`;

  // Urgency styling based on waiting time and status
  let borderClass = 'border-slate-700';
  let timerClass = 'text-slate-400';
  let isDelayed = false;

  if (ticket.status !== 'READY') {
    if (mins >= 10) {
      borderClass = 'border-red-500 shadow-lg shadow-red-950/40 ring-1 ring-red-500/50';
      timerClass = 'text-red-400 font-bold animate-pulse';
      isDelayed = true;
    } else if (mins >= 5) {
      borderClass = 'border-amber-500/80 shadow-md shadow-amber-950/30';
      timerClass = 'text-amber-400 font-semibold';
    }
  } else {
    borderClass = 'border-emerald-500/60 shadow-lg shadow-emerald-950/20';
    timerClass = 'text-emerald-400';
  }

  return (
    <div className={`bg-slate-800 rounded-xl border ${borderClass} overflow-hidden shadow flex flex-col justify-between transition-all duration-200`}>
      {/* Ticket Header */}
      <div>
        <div className="bg-slate-700/60 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-amber-400">
              #{ticket.order_number}
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="font-bold text-sm text-white">
              Table {ticket.table_number}
            </span>
            {ticket.table_label && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ({ticket.table_label})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs ${timerClass}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{timeFormatted}</span>
            </div>
            <button
              onClick={() => onPrintKOT(ticket)}
              title="View & Print 80mm KOT Slip"
              className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Strip & Delay Flag */}
        <div className="px-4 py-1.5 bg-slate-800/90 border-b border-slate-700/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            {ticket.status === 'RECEIVED' && (
              <span className="px-2 py-0.5 rounded font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                NEW ORDER
              </span>
            )}
            {ticket.status === 'PREPARING' && (
              <span className="px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <Flame className="w-3 h-3 text-blue-400" />
                COOKING
              </span>
            )}
            {ticket.status === 'READY' && (
              <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                READY AT PASS
              </span>
            )}
          </div>
          {isDelayed && (
            <span className="text-red-400 font-bold text-[10px] tracking-wide uppercase">
              HIGH WAIT TIME
            </span>
          )}
        </div>

        {/* Order Items */}
        <div className="p-4 space-y-3">
          {ticket.items.map((item, idx) => (
            <div key={item.id || idx} className="text-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-white tracking-wide">
                  <span className="text-amber-400 font-bold mr-1.5">{item.quantity}x</span>
                  {item.item_name}
                </span>
              </div>

              {/* Modifiers */}
              {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                <div className="ml-5 mt-0.5 space-y-0.5">
                  {item.selected_modifiers.map((mod, mIdx) => (
                    <div key={mIdx} className="text-xs text-orange-300 font-mono">
                      + {mod.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Custom Note */}
              {item.note && (
                <div className="ml-5 mt-1">
                  <span className="text-[11px] text-amber-200 italic bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50 inline-block font-medium">
                    "{item.note}"
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Action Footer */}
      <div className="bg-slate-800/90 px-4 py-3 border-t border-slate-700/60">
        {ticket.status === 'RECEIVED' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartPreparing(ticket.id)}
              className="flex-1 py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
            >
              <Flame className="w-4 h-4" />
              <span>Start Preparing</span>
            </button>
            <button
              onClick={() => onMarkReady(ticket.id)}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Ready</span>
            </button>
          </div>
        )}

        {ticket.status === 'PREPARING' && (
          <button
            onClick={() => onMarkReady(ticket.id)}
            className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Ready for Pickup</span>
          </button>
        )}

        {ticket.status === 'READY' && (
          <div className="flex items-center gap-2">
            <div className="flex-1 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Waiting for server</span>
            </div>
            <button
              onClick={() => onMarkServed(ticket.id)}
              className="py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition flex items-center gap-1 border border-slate-600"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Clear Pass</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
