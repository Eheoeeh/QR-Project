import React, { useState } from 'react';
import { Settings, Utensils, QrCode, ToggleLeft, ToggleRight, Plus } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'tables'>('menu');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Mini Admin Panel</h1>
              <p className="text-xs text-slate-400">Live Sold-out controls, venue settings, printable QR codes</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700 text-xs font-medium">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'menu' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Menu Items
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'settings' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'tables' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Sheets
            </button>
          </div>
        </header>

        {/* Content Area */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Menu Items & Live Availability
              </h2>
              <button className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition">
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700/60">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm">Crispy Dynamite Prawns</h3>
                  <p className="text-xs text-slate-400">Starters • Rs. 1,150.00</p>
                </div>
                <button className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <ToggleRight className="w-6 h-6" />
                  <span>Available</span>
                </button>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm">The Prime Smash Cheeseburger</h3>
                  <p className="text-xs text-slate-400">Burgers • Rs. 1,250.00</p>
                </div>
                <button className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <ToggleRight className="w-6 h-6" />
                  <span>Available</span>
                </button>
              </div>

              <div className="p-4 flex items-center justify-between opacity-60">
                <div>
                  <h3 className="font-semibold text-white text-sm">Molten Lava Cake with Gelato</h3>
                  <p className="text-xs text-slate-400">Desserts • Rs. 780.00</p>
                </div>
                <button className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                  <ToggleLeft className="w-6 h-6" />
                  <span>Sold Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4 max-w-lg">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Restaurant Configuration
            </h2>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Restaurant Name</label>
              <input
                type="text"
                defaultValue="Spice & Sizzle Bistro"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tax Percentage (%)</label>
              <input
                type="number"
                defaultValue={16}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-sm font-medium text-white block">Require Seating 4-Digit PIN</span>
                <span className="text-xs text-slate-400">Guests must enter table PIN shown on waiter dashboard</span>
              </div>
              <input type="checkbox" className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-900 border-slate-700" />
            </div>
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Printable QR Sheets
              </h2>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
              >
                Print Sheet
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Printable grid of table QR codes linking directly to `/t/:tableNumber` for table acrylics and stands.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
