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
  ChevronRight
} from 'lucide-react';

interface TableCardProps {
  tableState: TableFloorState;
  currencySymbol?: string;
  requirePin?: boolean;
  onSelectTable: (tableState: TableFloorState) => void;
  onSeatTable?: (tableId: number, tableNumber: number) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  tableState,
  currencySymbol = 'Rs.',
  requirePin = false,
  onSelectTable,
  onSeatTable
}) => {
  const { table, session, orders, serviceRequests, runningTotal, urgency, urgencyLabel, seatedDurationMinutes } =
    tableState;

  // Extract clean zone name from table label (e.g. "Indoor Window" from "Table 1 (Indoor Window)")
  const zoneName = table.label.includes('(')
    ? table.label.split('(')[1]?.replace(')', '')
    : 'Main Dining';

  // Get color styles for urgency states
  const getCardStyles = () => {
    switch (urgency) {
      case 'SERVICE_PENDING':
        return {
          card: 'border-rose-500 bg-rose-950/30 hover:border-rose-400 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50',
          badge: 'bg-rose-600 text-white animate-pulse',
          dot: 'bg-white'
        };
      case 'BILL_REQUESTED':
        return {
          card: 'border-purple-500 bg-purple-950/30 hover:border-purple-400 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/40',
          badge: 'bg-purple-600 text-white',
          dot: 'bg-purple-300'
        };
      case 'READY_TO_SERVE':
        return {
          card: 'border-emerald-500 bg-emerald-950/30 hover:border-emerald-400 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40',
          badge: 'bg-emerald-600 text-white animate-pulse',
          dot: 'bg-emerald-200'
        };
      case 'ORDER_PENDING':
        return {
          card: 'border-amber-500/60 bg-amber-950/20 hover:border-amber-400 shadow-md shadow-amber-950/30',
          badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
          dot: 'bg-amber-400'
        };
      case 'OCCUPIED':
        return {
          card: 'border-blue-500/40 bg-blue-950/20 hover:border-blue-400/80',
          badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
          dot: 'bg-blue-400'
        };
      case 'FREE':
      default:
        return {
          card: 'border-slate-800 bg-slate-800/40 hover:border-slate-700 text-slate-500',
          badge: 'bg-slate-800 text-slate-400 border border-slate-700/60',
          dot: 'bg-slate-500'
        };
    }
  };

  const styles = getCardStyles();
  const isFree = urgency === 'FREE';

  // Format seated duration (e.g. "45m" or "1h 15m")
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m seated`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m seated`;
  };

  return (
    <div
      onClick={() => onSelectTable(tableState)}
      className={`rounded-2xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[195px] select-none ${styles.card}`}
    >
      {/* Top Row: Table Number, Zone Label & Status Pill */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-white tracking-tight">
              Table {table.table_number}
            </span>
            <span className="text-xs text-slate-400 font-medium truncate max-w-[110px]">
              {zoneName}
            </span>
          </div>

          {/* Status Badge */}
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 ${styles.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            <span>{urgencyLabel}</span>
          </span>
        </div>

        {/* PIN Badge if Seated */}
        {session && (requirePin || session.seating_pin) && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-[11px] font-mono text-amber-300">
            <Key className="w-3 h-3 text-amber-400" />
            <span className="font-bold">PIN: {session.seating_pin}</span>
          </div>
        )}
      </div>

      {/* Middle Row: Operational Details */}
      <div className="py-2.5 space-y-2">
        {isFree ? (
          <div className="py-3 text-center space-y-2">
            <p className="text-xs text-slate-500">Ready for walk-in guests or QR scan</p>
            {onSeatTable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSeatTable(table.id, table.table_number);
                }}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Seat Table / PIN</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            {/* Active Urgent Notification Alert (Water / Waiter / Cash) */}
            {serviceRequests.length > 0 && (
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between text-xs">
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
                  <span className="font-black text-slate-200 truncate">
                    {serviceRequests[0].type === 'WATER' && 'Needs Water'}
                    {serviceRequests[0].type === 'CALL_WAITER' && 'Call Waiter'}
                    {serviceRequests[0].type === 'PAY_CASH' && 'Cash Bill Requested'}
                    {serviceRequests[0].type === 'OTHER' && (serviceRequests[0].note || 'Special Request')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(serviceRequests[0].created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}

            {/* Food Cooking / Ready Alert */}
            {tableState.hasReadyFood && (
              <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs font-black">
                <BellRing className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span>Hot food plated at pass — Ready to serve!</span>
              </div>
            )}

            {/* Seated Duration & Order Counts */}
            <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatDuration(seatedDurationMinutes)}</span>
              </span>

              <span className="flex items-center gap-1">
                <Utensils className="w-3 h-3 text-slate-500" />
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

      {/* Bottom Row: Running Total & View Action */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Running Bill
          </span>
          <span className="text-sm font-black text-white">
            {currencySymbol} {runningTotal.toLocaleString()}
          </span>
        </div>

        <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-white transition">
          <span>Manage</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};

export default TableCard;
