import React from 'react';
import { Order, RestaurantSettings } from '../../types';
import { calculateBill } from '../../utils/billCalculator';
import { X, Receipt, Clock } from 'lucide-react';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableLabel: string;
  orders: Order[];
  settings: RestaurantSettings | null;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  tableLabel,
  orders,
  settings
}) => {
  if (!isOpen) return null;

  const allOrderItems = orders
    .filter((o) => o.status !== 'CANCELLED')
    .flatMap((o) => o.order_items || []);

  const taxPercent = settings?.tax_percent || 16;
  const currencySymbol = settings?.currency_symbol || 'Rs.';
  const billSummary = calculateBill(allOrderItems, taxPercent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Bill Summary</h2>
              <p className="text-xs text-slate-400 font-medium">{tableLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {orders.length === 0 || allOrderItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Orders Placed Yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Items currently in your shared cart haven't been submitted to the kitchen yet. Tap "Place Order" in your cart to start your bill.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Submitted Orders Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Itemized Orders
                </span>

                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 divide-y divide-slate-200/60">
                  {allOrderItems.map((item, idx) => (
                    <div key={item.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-start text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="text-orange-600">{item.quantity}x</span>
                          <span>{item.item_name}</span>
                        </div>

                        {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                          <div className="text-[10px] text-slate-500 pl-4 font-mono">
                            + {item.selected_modifiers.map((m) => m.name).join(', ')}
                          </div>
                        )}

                        {item.note && (
                          <div className="text-[10px] text-slate-400 italic pl-4">
                            "{item.note}"
                          </div>
                        )}
                      </div>

                      <div className="font-extrabold text-slate-900 shrink-0">
                        {currencySymbol} {(Number(item.unit_price) * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Totals Calculation */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2 text-xs shadow-2xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">
                    {currencySymbol} {billSummary.subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Government Tax ({taxPercent}%)</span>
                  <span className="font-bold text-slate-800">
                    {currencySymbol} {billSummary.taxAmount.toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-base text-orange-600 font-extrabold">
                    {currencySymbol} {billSummary.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with helpful note */}
        <div className="p-4 pb-6 sm:pb-4 border-t border-slate-100 bg-white shrink-0 text-center">
          <p className="text-[11px] text-slate-400">
            Split billing and payments (Cash or Online) are available in Scene 5 & 6.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
