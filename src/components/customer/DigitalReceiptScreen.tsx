import React from 'react';
import { Order, RestaurantSettings } from '../../types';
import { calculateBill } from '../../utils/billCalculator';
import {
  Utensils,
  CheckCircle2,
  RotateCcw,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface DigitalReceiptScreenProps {
  restaurantName: string;
  tableLabel: string;
  orders: Order[];
  settings: RestaurantSettings | null;
  closedAt?: string | null;
  onStartFresh: () => void;
}

export const DigitalReceiptScreen: React.FC<DigitalReceiptScreenProps> = ({
  restaurantName,
  tableLabel,
  orders,
  settings,
  closedAt,
  onStartFresh
}) => {
  const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const allOrderItems = validOrders.flatMap((o) => o.order_items || []);

  const taxPercent = settings?.tax_percent ?? 16;
  const currencySymbol = settings?.currency_symbol || 'Rs.';
  const billSummary = calculateBill(allOrderItems, taxPercent);

  const formattedDate = closedAt
    ? new Date(closedAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Top Brand Header */}
      <div className="pt-2 pb-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300">
          <Utensils className="w-3.5 h-3.5 text-orange-400" />
          <span>{restaurantName}</span>
        </div>
      </div>

      {/* Main Digital Receipt Card */}
      <div className="w-full max-w-md mx-auto my-auto bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
        {/* Decorative Top Serrated Receipt Edge / Pattern */}
        <div className="h-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

        <div className="p-6 space-y-5">
          {/* Receipt Header */}
          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {restaurantName}
            </h2>
            <div className="text-xs font-bold text-slate-500">
              {tableLabel} • Official Dining Receipt
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Bold PAID Stamp Badge */}
          <div className="flex justify-center py-1">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-700 shadow-sm rotate-[-2deg]">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-black text-sm tracking-wider uppercase">
                ★ PAID IN CASH ★
              </span>
            </div>
          </div>

          {/* Session Closed Notice */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Dining Session Closed</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This session has ended and payment was verified. Ordering is now closed for this session.
            </p>
          </div>

          {/* Itemized Dish List */}
          <div className="space-y-3 pt-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex justify-between">
              <span>Itemized Order Summary</span>
              <span>{allOrderItems.reduce((acc, i) => acc + i.quantity, 0)} Items</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto no-scrollbar pr-1">
              {allOrderItems.map((item, idx) => (
                <div key={item.id || idx} className="py-2 first:pt-0 last:pb-0 flex justify-between items-start text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-orange-600 font-extrabold">{item.quantity}x</span>
                      <span className="truncate">{item.item_name}</span>
                    </div>
                    {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                      <div className="text-[10px] text-slate-500 pl-4">
                        + {item.selected_modifiers.map((m) => m.name).join(', ')}
                      </div>
                    )}
                  </div>

                  <span className="font-bold text-slate-900 shrink-0">
                    {currencySymbol} {(Number(item.unit_price) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 border border-slate-200/80 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">
                {currencySymbol} {billSummary.subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Sales Tax ({taxPercent}%)</span>
              <span className="font-bold text-slate-900">
                {currencySymbol} {billSummary.taxAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200/80 text-base font-black text-slate-900">
              <span>Grand Total</span>
              <span className="text-emerald-600">
                {currencySymbol} {billSummary.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Reset / Fresh Session Action */}
          <div className="pt-2">
            <button
              onClick={onStartFresh}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-orange-400" />
              <span>Start Fresh Session for Next Guests</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 pb-2 text-center">
        <p className="text-[11px] text-slate-400">
          Thank you for dining at {restaurantName}!
        </p>
      </div>
    </div>
  );
};

export default DigitalReceiptScreen;
