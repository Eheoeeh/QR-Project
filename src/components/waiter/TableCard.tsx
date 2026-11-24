import React from 'react';
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
  Flame
} from 'lucide-react';

interface TableCardProps {
  tableState: TableFloorState;
  currencySymbol?: string;
  requirePin?: boolean;
  onSelectTable: (tableState: TableFloorState) => void;
  onSeatTable?: (tableId: number, tableNumber: number) => void;
  onResolveService?: (requestId: string) => void;
  onCollectCash?: (sessionId: string, tableId: number) => void;
  onMarkServed?: (sessionId: string) => void;
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
  const { table, session, orders, serviceRequests, runningTotal, urgency, urgencyLabel, seatedDurationMinutes } =
    tableState;

  // Extract clean zone name from table label (e.g. "Indoor Window" from "Table 1 (Indoor Window)")
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

  // Clean rounded running total
  const formattedTotal = Math.round(runningTotal).toLocaleString();

  return (
    <div
      onClick={() => onSelectTable(tableState)}
      className={`rounded-2xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${styles.card} ${
        isFree ? 'min-h-[175px]' : 'min-h-[200px]'
      }`}
    >
      {/* Top Header: Table Title & Status Badge */}
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

      {/* Middle Body: Dynamic state based on occupancy */}
      <div className="py-2">
        {isFree ? (
          <div className="py-3 flex flex-col items-center justify-center text-center space-y-2.5">
            <p className="text-xs text-slate-500 font-medium">Table Vacant • Ready for Guests</p>
            {onSeatTable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSeatTable(table.id, table.table_number);
                }}
                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-extrabold text-slate-200 transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Seat Table / PIN</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {/* Active Service Call Notification (Water / Waiter / Cash) */}
            {serviceRequests.length > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {serviceRequests[0].type === 'WATER' && (
                    <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                  {serviceRequests[0].type === 'CALL_WAITER' && (
                    <Bell className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                  )}
                  {serviceRequests[0].type === 'PAY_CASH' && (
                    <DollarSign className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                  <span className="font-extrabold text-white truncate">
                    {serviceRequests[0].type === 'WATER' && 'Needs Water'}
                    {serviceRequests[0].type === 'CALL_WAITER' && 'Call Waiter'}
                    {serviceRequests[0].type === 'PAY_CASH' && 'Cash Bill Requested'}
                    {serviceRequests[0].type === 'OTHER' && (serviceRequests[0].note || 'Special Request')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                    {new Date(serviceRequests[0].created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {onResolveService && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolveService(serviceRequests[0].id);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] transition"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Direct Bill Requested Action: Collect Cash & Settle */}
            {urgency === 'BILL_REQUESTED' && session && onCollectCash && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCollectCash(session.id, table.id);
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-950/40 transition flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" />
                <span>Collect Cash & Settle Table</span>
              </button>
            )}

            {/* Food Status Notice */}
            {tableState.hasReadyFood ? (
              <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 flex items-center justify-between gap-2 text-xs font-extrabold">
                <div className="flex items-center gap-1.5 min-w-0">
                  <BellRing className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                  <span className="truncate">Food Ready at Pass!</span>
                </div>
                {onMarkServed && session && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkServed(session.id);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] transition shrink-0"
                  >
                    Delivered
                  </button>
                )}
              </div>
            ) : tableState.urgency === 'ORDER_PENDING' ? (
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs font-bold">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Dishes Cooking in Kitchen</span>
              </div>
            ) : null}

            {/* Seated Duration & Placed Orders Metadata */}
            <div className="flex items-center justify-between text-slate-400 text-xs pt-0.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{formatDuration(seatedDurationMinutes)}</span>
              </span>

              <span className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  {orders.length === 0
                    ? 'Browsing menu'
                    : `${orders.length} ${orders.length === 1 ? 'order' : 'rounds'}`}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer: ONLY shown for Occupied tables */}
      {!isFree && (
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
              Running Total
            </span>
            <span className="text-base font-black text-white">
              {currencySymbol} {formattedTotal}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-400 hover:text-orange-300 transition">
            <span>Manage</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TableCard;
