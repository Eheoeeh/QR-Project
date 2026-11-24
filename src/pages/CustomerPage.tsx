import React from 'react';
import { useParams } from 'react-router-dom';
import { Bell, Droplets, ShoppingBag, Receipt, Sparkles } from 'lucide-react';

export const CustomerPage: React.FC = () => {
  const { tableNumber } = useParams<{ tableNumber: string }>();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">
            Dining Experience
          </span>
          <h1 className="text-lg font-bold leading-tight">Table {tableNumber || '?'}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            <span>Water</span>
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 transition">
            <Bell className="w-3.5 h-3.5 text-orange-500" />
            <span>Call Waiter</span>
          </button>
        </div>
      </header>

      {/* Main Content Placeholder */}
      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Ready to Order</h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse the digital menu below. Any items added will sync live with your table co-diners.
          </p>
        </div>

        <div className="text-center text-xs text-slate-400">
          Customer Menu & Shared Cart Component (Spec section 3.2)
        </div>
      </main>

      {/* Bottom Floating Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <button className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition">
            <Receipt className="w-4 h-4 text-slate-600" />
            <span>View Bill</span>
          </button>
          <button className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold shadow-md transition">
            <ShoppingBag className="w-4 h-4" />
            <span>Cart (0)</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CustomerPage;
