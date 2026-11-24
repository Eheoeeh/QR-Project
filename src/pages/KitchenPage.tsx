import React, { useState } from 'react';
import { ChefHat, Printer, Clock, CheckCircle2 } from 'lucide-react';

export const KitchenPage: React.FC = () => {
  const [showSlipDrawer, setShowSlipDrawer] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Kitchen Display System (KDS)</h1>
              <p className="text-xs text-slate-400">Incoming tickets & 80mm Virtual Thermal Printer</p>
            </div>
          </div>

          <button
            onClick={() => setShowSlipDrawer(!showSlipDrawer)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>{showSlipDrawer ? 'Hide Virtual Printer' : '80mm Thermal Printer'}</span>
          </button>
        </header>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sample Demo Ticket */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow">
            <div className="bg-slate-700/60 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
              <span className="font-bold text-sm text-amber-400">#101 • Table 2</span>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>02:15 ago</span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start text-sm">
                <div>
                  <span className="font-semibold text-white">2x Prime Smash Cheeseburger</span>
                  <div className="text-xs text-orange-300 ml-2 font-mono">+ Double Cheese</div>
                  <div className="text-xs text-slate-400 ml-2 italic">"extra crispy fries please"</div>
                </div>
              </div>
              <div className="flex justify-between items-start text-sm">
                <div>
                  <span className="font-semibold text-white">1x Loaded Truffle Fries</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 px-4 py-3 border-t border-slate-700/60 flex items-center gap-2">
              <button className="flex-1 py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition">
                Start Preparing
              </button>
              <button className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Ready
              </button>
            </div>
          </div>
        </div>

        {/* 80mm Virtual Monospace Slip Drawer Preview */}
        {showSlipDrawer && (
          <aside className="fixed right-0 top-0 bottom-0 w-88 bg-slate-950 border-l border-slate-800 p-4 overflow-y-auto shadow-2xl z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-orange-400" />
                80mm Virtual Thermal Slip
              </h3>
              <button
                onClick={() => setShowSlipDrawer(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="bg-white text-black p-4 rounded shadow-inner font-mono text-xs leading-tight thermal-receipt printable-thermal">
              <div className="text-center font-bold text-sm">SPICE & SIZZLE BISTRO</div>
              <div className="text-center text-[11px] mb-2">--- KITCHEN ORDER TICKET (KOT) ---</div>
              <div className="flex justify-between text-[11px]">
                <span>TICKET: #101</span>
                <span>TABLE: 2</span>
              </div>
              <div className="text-[10px] text-gray-500 border-b border-dashed border-gray-400 pb-1 mb-2">
                2026-11-24 20:15
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <div className="font-bold">2x Prime Smash Cheeseburger</div>
                  <div className="text-[10px] pl-3">+ Double Cheese</div>
                  <div className="text-[10px] pl-3 italic">** extra crispy fries please **</div>
                </div>
                <div>
                  <div className="font-bold">1x Loaded Truffle Fries</div>
                </div>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2 pt-1 text-center text-[10px]">
                --- END OF TICKET ---
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => window.print()}
                className="w-full py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition"
              >
                Print Slip (window.print)
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default KitchenPage;
