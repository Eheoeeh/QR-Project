import React, { useState, useEffect } from 'react';
import { Printer, X, FileText, Check } from 'lucide-react';
import { KitchenTicket } from '../../services/kitchenService';
import { PrintJob } from '../../types';

interface ThermalPrinterBaseProps {
  selectedTicket: KitchenTicket | null;
  activeTickets: KitchenTicket[];
  printJobs: PrintJob[];
  restaurantName?: string;
}

interface ThermalSlipDrawerProps extends ThermalPrinterBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Shared 80mm Virtual Thermal Printer body used by both the pinned right-hand
 * panel (wide screens) and the slide-over drawer (narrow tablets & phones).
 */
const ThermalPrinterBody: React.FC<
  ThermalPrinterBaseProps & { onClose?: () => void; showCloseButton?: boolean }
> = ({
  selectedTicket,
  activeTickets,
  printJobs,
  restaurantName = 'SPICE & SIZZLE BISTRO',
  onClose,
  showCloseButton = false
}) => {
  const [activeTabTicketId, setActiveTabTicketId] = useState<string | null>(
    selectedTicket?.id || activeTickets[0]?.id || null
  );

  // Sync active tab whenever caller explicitly picks a ticket to print
  useEffect(() => {
    if (selectedTicket?.id) {
      setActiveTabTicketId(selectedTicket.id);
    }
  }, [selectedTicket]);

  // Determine which ticket to render
  const currentTicket =
    activeTickets.find((t) => t.id === activeTabTicketId) ||
    selectedTicket ||
    activeTickets[0] ||
    null;

  const totalItemsCount = currentTicket?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col justify-between h-full text-slate-100">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-white truncate">80mm Virtual Thermal Printer</h3>
              <p className="text-[11px] text-zinc-400 truncate">ESC/POS Monospace KOT Spooler</p>
            </div>
          </div>
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0"
              aria-label="Close virtual thermal printer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Ticket Selector Pills (Amber Active Pill Style) */}
        {activeTickets.length > 0 && (
          <div className="py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-zinc-400 font-semibold shrink-0">Slips:</span>
            {activeTickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTabTicketId(t.id)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold transition shrink-0 ${
                  currentTicket?.id === t.id
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-[#18191C] text-zinc-300 border border-white/[0.08] hover:border-white/25'
                }`}
              >
                #{t.order_number} T{t.table_number}
              </button>
            ))}
          </div>
        )}

        {/* Simulated 80mm Thermal Receipt */}
        <div className="mt-2 flex justify-center">
          {currentTicket ? (
            <div className="bg-white text-black p-4 sm:p-5 rounded-md shadow-2xl font-mono text-xs leading-relaxed w-full max-w-[330px] border border-gray-300 printable-thermal select-text">
              {/* Restaurant Header */}
              <div className="text-center font-bold text-sm tracking-wider uppercase">
                {restaurantName}
              </div>
              <div className="text-center text-[11px] font-semibold text-gray-700 my-1">
                --- KITCHEN ORDER TICKET (KOT) ---
              </div>
              <div className="text-center text-[10px] text-gray-500 pb-1">
                ========================================
              </div>

              {/* Metadata */}
              <div className="flex justify-between text-[11px] font-bold">
                <span>TICKET: #{currentTicket.order_number}</span>
                <span>TABLE: {currentTicket.table_number}</span>
              </div>
              <div className="text-[10px] text-gray-600">
                ZONE: {currentTicket.table_label || 'Main Dining'}
              </div>
              <div className="text-[10px] text-gray-600 mb-1">
                DATE:{' '}
                {new Date(currentTicket.created_at).toLocaleString('en-US', {
                  hour12: false,
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>

              <div className="text-[10px] text-gray-500">
                ----------------------------------------
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-800">
                <span>QTY  ITEM DESCRIPTION</span>
                <span>{currentTicket.status}</span>
              </div>
              <div className="text-[10px] text-gray-500 mb-1">
                ----------------------------------------
              </div>

              {/* Items List */}
              <div className="space-y-2 text-xs">
                {currentTicket.items.map((item, idx) => (
                  <div key={item.id || idx}>
                    <div className="flex justify-between items-start font-bold">
                      <span>
                        {item.quantity}x {item.item_name}
                      </span>
                    </div>
                    {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                      <div className="text-[11px] text-gray-700 pl-4 font-normal">
                        {item.selected_modifiers.map((mod, mIdx) => (
                          <div key={mIdx}>+ {mod.name}</div>
                        ))}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-[10px] text-gray-800 italic pl-4 font-semibold">
                        *** NOTE: {item.note} ***
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Divider and Footer */}
              <div className="text-[10px] text-gray-500 mt-2">
                ----------------------------------------
              </div>
              <div className="flex justify-between text-[11px] font-bold">
                <span>TOTAL ITEMS:</span>
                <span>{totalItemsCount}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                ========================================
              </div>
              <div className="text-center font-bold text-[10px] text-gray-700 mt-1">
                *** KITCHEN PASS COPY ***
              </div>
              <div className="text-center text-[9px] text-gray-500">
                --- END OF TICKET ---
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4 text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800/80 w-full">
              <FileText className="w-9 h-9 mx-auto text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">No active ticket selected.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Incoming orders automatically generate an 80mm KOT slip here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-white/[0.08] space-y-2.5 mt-4">
        <button
          onClick={handlePrint}
          disabled={!currentTicket}
          className="w-full py-2.5 px-4 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Printer className="w-4 h-4" />
          <span>Print Slip (80mm ESC/POS)</span>
        </button>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
          <span>80mm Thermal Roll</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <Check className="w-3 h-3" /> {printJobs.length} jobs • Online
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Pinned right-hand virtual thermal printer panel for wide screens (laptops & monitors).
 */
export const ThermalPrinterPanel: React.FC<ThermalPrinterBaseProps> = (props) => {
  return (
    <aside className="bg-[#151619] rounded-[22px] border border-white/[0.08] p-4 shadow-xl">
      <ThermalPrinterBody {...props} />
    </aside>
  );
};

/**
 * Slide-over virtual thermal printer drawer for narrow tablets and phones.
 */
export const ThermalSlipDrawer: React.FC<ThermalSlipDrawerProps> = ({
  isOpen,
  onClose,
  ...rest
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden xl:hidden">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md bg-[#151619] border-l border-white/[0.08] p-5 shadow-2xl overflow-y-auto">
          <ThermalPrinterBody {...rest} onClose={onClose} showCloseButton />
        </aside>
      </div>
    </div>
  );
};
