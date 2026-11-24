import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, RefreshCw, ChefHat, UserCheck, Settings, Smartphone } from 'lucide-react';

export const DemoHubPage: React.FC = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const tables = [
    { number: 1, label: 'Table 1 (Indoor Window)' },
    { number: 2, label: 'Table 2 (Indoor Center)' },
    { number: 3, label: 'Table 3 (Patio Booth)' },
    { number: 4, label: 'Table 4 (Patio Garden)' },
    { number: 5, label: 'Table 5 (Terrace High)' },
    { number: 6, label: 'Table 6 (Family Lounge)' },
  ];

  const handleResetDemoData = () => {
    if (confirm('Are you sure you want to reset all demo sessions and active orders?')) {
      alert('Demo data reset triggered (service adapter placeholder).');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                PROTOTYPE DEMO HUB
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-white">
              QR Dining & Service Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Live scannable multi-device pitch hub. Open staff panels in separate tabs, then scan table QR codes with your phone.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDemoData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
              Reset Demo Data
            </button>
          </div>
        </header>

        {/* Staff Quick Links */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Staff & Management Dashboards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/waiter"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-orange-500/50 transition flex items-start justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
                    Waiter & POS Dashboard
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live table grid, service alerts, wait timers, cashier bill settlement.
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
            </a>

            <a
              href="/kitchen"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-orange-500/50 transition flex items-start justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
                    Kitchen Display & Printer
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    KDS queue tickets + 80mm Virtual Monospace Thermal Receipt simulator.
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
            </a>

            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-orange-500/50 transition flex items-start justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
                    Mini Admin Panel
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live sold-out toggles, tax & PIN settings, printable QR code sheets.
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
            </a>
          </div>
        </section>

        {/* Demo Tables Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Customer Mobile Scanning Hub (Tables 1 - 6)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan with any mobile camera, or click "Open Link" to simulate a phone session in your browser.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Smartphone className="w-4 h-4 text-orange-400" />
              <span>Multi-device synced cart & bill</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((t) => {
              const url = `${origin}/t/${t.number}`;
              return (
                <div
                  key={t.number}
                  className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700/80 flex flex-col items-center text-center shadow-lg hover:border-slate-600 transition"
                >
                  <div className="bg-white p-3 rounded-xl shadow-inner mb-4">
                    <QRCodeSVG
                      value={url}
                      size={140}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <h3 className="text-lg font-bold text-white">{t.label}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-1 select-all break-all">
                    /t/{t.number}
                  </p>

                  <div className="mt-4 w-full">
                    <a
                      href={`/t/${t.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Table {t.number}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DemoHubPage;
