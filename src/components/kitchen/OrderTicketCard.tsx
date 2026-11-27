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

  // Tinted matte-obsidian urgency styling matching Command Center theme
  let cardSurface = 'border-white/[0.08] bg-[#18191C]';
  let timerClass = 'text-zinc-200';
  let isDelayed = false;

  if (ticket.status !== 'READY') {
    if (mins >= 10) {
      cardSurface = 'border-rose-500/60 bg-gradient-to-br from-rose-950/45 via-[#1B181A] to-[#18191C] shadow-xl';
      timerClass = 'text-rose-300 animate-pulse';
      isDelayed = true;
    } else if (mins >= 5) {
      cardSurface = 'border-amber-500/60 bg-gradient-to-br from-amber-950/35 via-[#1B1A16] to-[#18191C] shadow-lg';
      timerClass = 'text-amber-300';
    } else if (ticket.status === 'PREPARING') {
      cardSurface = 'border-indigo-500/40 bg-gradient-to-br from-indigo-950/35 via-[#181920] to-[#18191C] shadow-lg';
    }
  } else {
    cardSurface = 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-[#171C1B] to-[#18191C] shadow-xl';
    timerClass = 'text-emerald-300';
  }

  const zoneName = ticket.table_label?.match(/\(([^)]+)\)/)?.[1] || ticket.table_label;

  return (
    <div className={`rounded-[22px] border ${cardSurface} overflow-hidden shadow-xl flex flex-col justify-between transition-colors duration-150`}>
      {/* Ticket Header */}
      <div className="flex-1 flex flex-col">
        <div className="bg-[#151619]/90 px-4 py-3 flex items-center justify-between gap-2 border-b border-white/[0.07]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-black text-base sm:text-lg text-amber-400 tracking-tight">
                #{ticket.order_number}
              </span>
              <span className="text-zinc-600 text-xs">•</span>
              <span className="font-black text-base sm:text-lg text-white tracking-tight">
                Table {ticket.table_number}
              </span>
            </div>
            {zoneName && (
              <p className="text-xs font-medium text-zinc-400 truncate mt-0.5">
                {zoneName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#111214] border border-white/[0.08] text-xs sm:text-sm font-extrabold tabular-nums whitespace-nowrap ${timerClass}`}
              title="Elapsed cook time"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{timeFormatted}</span>
            </div>
            <button
              onClick={() => onPrintKOT(ticket)}
              title="Preview & Print 80mm KOT Slip"
              className="p-2 rounded-full bg-[#111214] hover:bg-zinc-800 text-zinc-300 hover:text-white transition border border-white/[0.08]"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Strip & Delay Flag */}
        <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {ticket.status === 'RECEIVED' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
                NEW ORDER
              </span>
            )}
            {ticket.status === 'PREPARING' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-indigo-400" />
                COOKING
              </span>
            )}
            {ticket.status === 'READY' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                READY AT PASS
              </span>
            )}
          </div>
          {isDelayed && (
            <span className="text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wide uppercase animate-pulse">
              HIGH WAIT
            </span>
          )}
        </div>

        {/* High-Contrast Large-Print Order Items */}
        <div className="p-4 divide-y divide-white/[0.06]">
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

              {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                <div className="ml-10 mt-1.5 space-y-1 pl-3 border-l-2 border-amber-500/60">
                  {item.selected_modifiers.map((mod, mIdx) => (
                    <div key={mIdx} className="text-sm sm:text-base font-bold text-amber-300 leading-snug">
                      + {mod.name}
                    </div>
                  ))}
                </div>
              )}

              {item.note && (
                <div className="ml-10 mt-2">
                  <span className="text-sm sm:text-base text-amber-100 bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-400/40 inline-block font-bold leading-snug">
                    NOTE: {item.note}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Action Footer (Single-Line Rounded-Full Pills) */}
      <div className="bg-[#151619]/75 px-4 py-3 border-t border-white/[0.07] min-h-[64px] flex items-center">
        {ticket.status === 'RECEIVED' && (
          <div className="flex items-center gap-2 w-full">
            <button
              disabled={isProcessing}
              onClick={(e) => handleAction(e, () => onStartPreparing(ticket.id))}
              className="flex-1 py-2.5 px-3 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-xs sm:text-[13px] font-extrabold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/15 whitespace-nowrap"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Flame className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Start Preparing</span>
            </button>
            <button
              disabled={isProcessing}
              onClick={(e) => handleAction(e, () => onMarkReady(ticket.id))}
              className="flex-1 py-2.5 px-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 disabled:opacity-60 text-emerald-300 text-xs sm:text-[13px] font-extrabold transition flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Mark Ready</span>
            </button>
          </div>
        )}

        {ticket.status === 'PREPARING' && (
          <button
            disabled={isProcessing}
            onClick={(e) => handleAction(e, () => onMarkReady(ticket.id))}
            className="w-full py-2.5 px-4 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 disabled:opacity-60 text-emerald-300 text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>Mark Ready for Pickup</span>
          </button>
        )}

        {ticket.status === 'READY' && (
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="text-xs sm:text-sm text-emerald-300 font-bold flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ready for server</span>
            </div>
            <button
              disabled={isProcessing}
              onClick={(e) => handleAction(e, () => onMarkServed(ticket.id))}
              className="py-2 px-3.5 rounded-full bg-[#18191C] hover:bg-zinc-800 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 border border-white/[0.12] shrink-0 whitespace-nowrap"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              )}
              <span>Clear Pass</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
