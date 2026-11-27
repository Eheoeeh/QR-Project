import React, { useState } from 'react';
import { TableFloorState } from '../../services/posService';
import {
  Clock,
  Key,
  Utensils,
  Bell,
  Droplets,
  DollarSign,
  UserPlus,
  BellRing,
  ChevronRight,
  Flame,
  Check,
  Loader2
} from 'lucide-react';

interface TableCardProps {
  tableState: TableFloorState;
  currencySymbol?: string;
  requirePin?: boolean;
  onSelectTable: (tableState: TableFloorState) => void;
  onSeatTable?: (tableId: number, tableNumber: number) => Promise<void> | void;
  onResolveService?: (requestId: string) => Promise<void> | void;
  onCollectCash?: (sessionId: string, tableId: number) => Promise<void> | void;
  onMarkServed?: (sessionId: string) => Promise<void> | void;
}

export const TableCard: React.FC<TableCardProps> = ({
  tableState,
  currencySymbol = 'Rs.',
  requirePin = false,
  onSelectTable,
  onSeatTable,
  onResolveService,
  onCollectCash,
  onMarkServed
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { table, session, orders, serviceRequests, runningTotal, urgency, urgencyLabel, seatedDurationMinutes } =
    tableState;

  const zoneName = table.label.includes('(')
    ? table.label.split('(')[1]?.replace(')', '')
    : table.label.replace(`Table ${table.table_number}`, '').trim() || 'Main Dining';

  const isFree = urgency === 'FREE';

  // Tinted matte-glass card aesthetics matching the Command Center theme
  const getCardStyles = () => {
    switch (urgency) {
      case 'SERVICE_PENDING':
        return {
          card: 'border-rose-500/50 bg-gradient-to-br from-rose-950/50 via-[#1B181A] to-[#18191C] hover:border-rose-400/70 shadow-xl',
          badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse',
          dot: 'bg-rose-400'
        };
      case 'BILL_REQUESTED':
        return {
          card: 'border-amber-500/50 bg-gradient-to-br from-amber-950/45 via-[#1C1A16] to-[#18191C] hover:border-amber-400/70 shadow-xl',
          badge: 'bg-amber-500 text-zinc-950 font-black',
          dot: 'bg-zinc-950'
        };
      case 'READY_TO_SERVE':
        return {
          card: 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/45 via-[#171C1B] to-[#18191C] hover:border-emerald-400/70 shadow-xl',
          badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse',
          dot: 'bg-emerald-400'
        };
      case 'ORDER_PENDING':
        return {
          card: 'border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-[#181921] to-[#18191C] hover:border-indigo-400/65 shadow-lg',
          badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 font-bold',
          dot: 'bg-indigo-400'
        };
      case 'OCCUPIED':
        return {
          card: 'border-sky-500/30 bg-gradient-to-br from-sky-950/35 via-[#181A20] to-[#18191C] hover:border-sky-400/60 shadow-md',
          badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold',
          dot: 'bg-sky-400'
        };
      case 'FREE':
      default:
        return {
          card: 'border-white/[0.07] bg-[#18191C] hover:border-white/[0.16]',
          badge: 'bg-[#111214] text-zinc-400 border border-white/[0.08] font-semibold',
          dot: 'bg-zinc-500'
        };
    }
  };

  const styles = getCardStyles();

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m seated`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m seated`;
  };

  const formattedTotal = Math.round(runningTotal).toLocaleString();

  const runAction = async (e: React.MouseEvent, actionFn: () => Promise<void> | void) => {
    e.preventDefault();
    e.stopPropagation();
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      await actionFn();
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div
      onClick={() => onSelectTable(tableState)}
      className={`rounded-[22px] p-4 border transition-all duration-150 cursor-pointer flex flex-col justify-between select-none ${styles.card} min-h-[225px]`}
    >
      {/* 1. Header */}
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 pr-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-black text-white whitespace-nowrap tracking-tight">
                Table {table.table_number}
              </span>
              <span className="text-xs text-zinc-400 font-medium truncate">
                {zoneName}
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 whitespace-nowrap ${styles.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            <span>{urgencyLabel}</span>
          </span>
        </div>

        {session && (requirePin || session.seating_pin) && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111214] border border-white/[0.08] text-xs font-mono text-amber-300">
            <Key className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="font-extrabold tracking-wider">PIN: {session.seating_pin}</span>
          </div>
        )}
      </div>

      {/* 2. Middle Body */}
      <div className="py-2.5 my-auto">
        {isFree ? (
          <div className="text-center py-2 space-y-1">
            <p className="text-xs text-zinc-400 font-semibold">Table Vacant</p>
            <p className="text-[11px] text-zinc-500">Ready for walk-in or QR scan</p>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs">
            {urgency === 'BILL_REQUESTED' ? (
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 flex items-center gap-2 font-bold">
                <DollarSign className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                <span className="truncate">Cash Settlement Requested</span>
              </div>
            ) : tableState.hasReadyFood ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 flex items-center gap-2 font-bold">
                <BellRing className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span className="truncate">Food Ready at Pass!</span>
              </div>
            ) : serviceRequests.length > 0 ? (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 flex items-center gap-2 font-bold">
                {serviceRequests[0].type === 'WATER' ? (
                  <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <Bell className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                )}
                <span className="truncate">
                  {serviceRequests[0].type === 'WATER' && 'Needs Water Refill'}
                  {serviceRequests[0].type === 'CALL_WAITER' && 'Call Waiter to Table'}
                  {serviceRequests[0].type === 'OTHER' && (serviceRequests[0].note || 'Special Request')}
                </span>
              </div>
            ) : tableState.urgency === 'ORDER_PENDING' ? (
              <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center gap-2 text-xs font-semibold">
                <Flame className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Dishes Cooking in Kitchen</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-zinc-400 text-xs px-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{formatDuration(seatedDurationMinutes)}</span>
              </span>

              <span className="flex items-center gap-1.5 font-medium">
                <Utensils className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>
                  {orders.length === 0
                    ? 'Browsing menu'
                    : `${orders.length} ${orders.length === 1 ? 'order' : 'rounds'}`}
                </span>
              </span>
            </div>

            <div className="flex items-baseline justify-between px-0.5 pt-1.5 border-t border-white/[0.06]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                Running Bill
              </span>
              <span className="text-sm font-black text-white tracking-tight tabular-nums">
                {currencySymbol} {formattedTotal}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Action Pill Bar */}
      <div className="pt-2.5 border-t border-white/[0.06]">
        {isFree ? (
          onSeatTable ? (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={(e) => runAction(e, () => onSeatTable(table.id, table.table_number))}
              className="w-full py-2.5 px-4 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-xs font-bold text-indigo-300 transition flex items-center justify-center gap-1.5"
            >
              {isActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <UserPlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              )}
              <span>Seat Table / PIN</span>
            </button>
          ) : null
        ) : urgency === 'BILL_REQUESTED' && session && onCollectCash ? (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={(e) => runAction(e, () => onCollectCash(session.id, table.id))}
            className="w-full py-2.5 px-4 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4" />
            )}
            <span>Collect Cash &amp; Settle</span>
          </button>
        ) : tableState.hasReadyFood && onMarkServed && session ? (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={(e) => runAction(e, () => onMarkServed(session.id))}
            className="w-full py-2.5 px-4 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs transition flex items-center justify-center gap-1.5"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Food Delivered</span>
          </button>
        ) : serviceRequests.length > 0 && onResolveService ? (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={(e) => runAction(e, () => onResolveService(serviceRequests[0].id))}
            className="w-full py-2.5 px-4 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-extrabold text-xs transition flex items-center justify-center gap-1.5"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Mark Request Done</span>
          </button>
        ) : (
          <div className="w-full py-2 px-4 rounded-full bg-[#111214] hover:bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white transition flex items-center justify-between text-xs font-bold">
            <span>Manage Table</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TableCard;
