import React from 'react';
import { Users, Bell, DollarSign, Clock } from 'lucide-react';

export const WaiterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Waiter & Cashier POS</h1>
              <p className="text-xs text-slate-400">Live service call queue & table floor plan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400">Realtime Connected</span>
          </div>
        </header>

        {/* Active Service Requests Banner */}
        <section className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Active Service Calls (0)
              </h2>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Auto-timed</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">No active calls right now. When customers call a waiter, alerts appear here with elapsed wait timers.</p>
        </section>

        {/* Table Grid Placeholder */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Floor Plan & Table Grid
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div
                key={num}
                className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col justify-between h-36"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-white">Table {num}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                    Free
                  </span>
                </div>
                <div className="text-xs text-slate-500">No active order</div>
                <button className="w-full py-1.5 px-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-[11px] font-medium text-slate-300 transition flex items-center justify-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  View Bill
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default WaiterPage;
