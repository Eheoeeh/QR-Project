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

  // Extract clean zone name
  const zoneName = table.label.includes('(')
    ? table.label.split('(')[1]?.replace(')', '')
    : table.label.replace(`Table ${table.table_number}`, '').trim() || 'Main Dining';

  const isFree = urgency === 'FREE';

  // Get color styles for urgency states
  const getCardStyles = () => {
    switch (urgency) {
      case 'SERVICE_PENDING':
        return {
          card: 'border-rose-500 bg-rose-950/30 hover:border-rose-400 shadow-xl shadow-rose-950/40 ring-1 ring-rose-500/50',
          badge: 'bg-rose-600 text-white animate-pulse',
          dot: 'bg-white'
        };
      case 'BILL_REQUESTED':
        return {
          card: 'border-purple-500 bg-purple-950/30 hover:border-purple-400 shadow-xl shadow-purple-950/40 ring-1 ring-purple-500/50',
          badge: 'bg-purple-600 text-white font-black',
          dot: 'bg-purple-200'
        };
      case 'READY_TO_SERVE':
        return {
          card: 'border-emerald-500 bg-emerald-950/30 hover:border-emerald-400 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/50',
          badge: 'bg-emerald-600 text-white animate-pulse',
          dot: 'bg-emerald-200'
        };
      case 'ORDER_PENDING':
        return {
          card: 'border-amber-500/60 bg-amber-950/20 hover:border-amber-400/90 shadow-md shadow-amber-950/30',
          badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold',
          dot: 'bg-amber-400'
        };
      case 'OCCUPIED':
        return {
          card: 'border-blue-500/40 bg-blue-950/20 hover:border-blue-400/80 shadow-sm',
          badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold',
          dot: 'bg-blue-400'
        };
      case 'FREE':
      default:
        return {
          card: 'border-slate-800/90 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-500',
          badge: 'bg-slate-800 text-slate-400 border border-slate-700/60 font-semibold',
          dot: 'bg-slate-500'
        };
    }
  };

  const styles = getCardStyles();

  // Format seated duration (e.g. "45m" or "1h 26m")
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m seated`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m seated`;
  };

  const formattedTotal = Math.round(runningTotal).toLocaleString();

  // Handle Action Click with isolation and loading lock
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
      className={`rounded-2xl p-4 border transition-colors duration-150 cursor-pointer flex flex-col justify-between select-none ${styles.card} min-h-[220px]`}
    >
      {/* 1. Header: Table Title, Zone, PIN badge & Urgency Badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          {/* Table Number & Zone (Never wrap "Table 1") */}
          <div className="min-w-0 pr-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-black text-white whitespace-nowrap tracking-tight">
                Table {table.table_number}
              </span>
              <span className="text-xs text-slate-400 font-medium truncate">
                {zoneName}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 whitespace-nowrap ${styles.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            <span>{urgencyLabel}</span>
          </span>
        </div>

        {/* PIN Badge if Table has an active session */}
        {session && (requirePin || session.seating_pin) && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-amber-300 shadow-2xs">
            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-extrabold tracking-wider">PIN: {session.seating_pin}</span>
          </div>
        )}
      </div>

      {/* 2. Middle Body: Clean Information Section (No floating buttons here!) */}
      <div className="py-2.5 my-auto">
        {isFree ? (
          <div className="text-center py-2 space-y-1">
            <p className="text-xs text-slate-500 font-semibold">Table Vacant</p>
            <p className="text-[11px] text-slate-600">Ready for walk-in or QR scan</p>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs">
            {/* Unified Alert Notification Banner */}
            {urgency === 'BILL_REQUESTED' ? (
              <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/60 text-purple-200 flex items-center gap-2 font-bold shadow-xs">
                <DollarSign className="w-4 h-4 text-purple-400 shrink-0 animate-bounce" />
                <span className="truncate">Cash Settlement Requested</span>
              </div>
            ) : tableState.hasReadyFood ? (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 flex items-center gap-2 font-bold shadow-xs">
                <BellRing className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span className="truncate">Food Ready at Pass!</span>
              </div>
            ) : serviceRequests.length > 0 ? (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/50 text-rose-300 flex items-center gap-2 font-bold shadow-xs">
                {serviceRequests[0].type === 'WATER' ? (
                  <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
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
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs font-semibold">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Dishes Cooking in Kitchen</span>
              </div>
            ) : null}

            {/* Stable Metadata Row: Seated Time & Rounds */}
            <div className="flex items-center justify-between text-slate-400 text-xs px-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{formatDuration(seatedDurationMinutes)}</span>
              </span>

              <span className="flex items-center gap-1.5 font-medium">
                <Utensils className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  {orders.length === 0
                    ? 'Browsing menu'
                    : `${orders.length} ${orders.length === 1 ? 'order' : 'rounds'}`}
                </span>
              </span>
            </div>

            {/* Running Total Row */}
            <div className="flex items-baseline justify-between px-0.5 pt-0.5 border-t border-slate-800/60">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Running Bill
              </span>
              <span className="text-sm font-black text-white tracking-tight">
                {currencySymbol} {formattedTotal}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Action Footer (Clean, stable single button bar at the bottom!) */}
      <div className="pt-2 border-t border-slate-800/80">
        {isFree ? (
          onSeatTable ? (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={(e) => runAction(e, () => onSeatTable(table.id, table.table_number))}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 border border-slate-700 text-xs font-extrabold text-slate-200 transition shadow-xs flex items-center justify-center gap-1.5"
            >
              {isActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <UserPlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <span>Seat Table / PIN</span>
            </button>
          ) : null
        ) : urgency === 'BILL_REQUESTED' && session && onCollectCash ? (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={(e) => runAction(e, () => onCollectCash(session.id, table.id))}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs shadow-md shadow-emerald-950/40 transition flex items-center justify-center gap-1.5"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <DollarSign className="w-4 h-4" />
            )}
            <span>Collect Cash & Settle Table</span>
          </button>
        ) : tableState.hasReadyFood && onMarkServed && session ? (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={(e) => runAction(e, () => onMarkServed(session.id))}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs shadow-md shadow-emerald-950/40 transition flex items-center justify-center gap-1.5"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Food Delivered to Table</span>
          </button>
        ) : serviceRequests.length > 0 && onResolveService ? (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={(e) => runAction(e, () => onResolveService(serviceRequests[0].id))}
            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-xs shadow-md shadow-blue-950/40 transition flex items-center justify-center gap-1.5"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Mark Request Done</span>
          </button>
        ) : (
          <div className="w-full py-1.5 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition flex items-center justify-between text-xs font-bold">
            <span>Manage Table</span>
            <ChevronRight className="w-4 h-4 text-orange-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TableCard;
