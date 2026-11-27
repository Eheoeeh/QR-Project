import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ExternalLink,
  RefreshCw,
  ChefHat,
  UserCheck,
  Settings,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { sessionService } from '../services/sessionService';
import { supabase } from '../services/supabaseClient';
import { RestaurantSettings } from '../types';

export const DemoHubPage: React.FC = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'INDOOR' | 'PATIO' | 'LOUNGE'>('ALL');

  const tables = [
    { number: 1, label: 'Table 1 (Indoor Window)', zone: 'Indoor Window', group: 'INDOOR' as const },
    { number: 2, label: 'Table 2 (Indoor Center)', zone: 'Indoor Center', group: 'INDOOR' as const },
    { number: 3, label: 'Table 3 (Patio Booth)', zone: 'Patio Booth', group: 'PATIO' as const },
    { number: 4, label: 'Table 4 (Patio Garden)', zone: 'Patio Garden', group: 'PATIO' as const },
    { number: 5, label: 'Table 5 (Terrace High)', zone: 'Terrace High', group: 'LOUNGE' as const },
    { number: 6, label: 'Table 6 (Family Lounge)', zone: 'Family Lounge', group: 'LOUNGE' as const }
  ];

  useEffect(() => {
    sessionService.getRestaurantSettings().then(setSettings);

    const channel = supabase
      .channel('demohub-settings-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurant_settings', filter: 'id=eq.1' },
        (payload) => {
          if (payload.new) {
            setSettings(payload.new as RestaurantSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleResetDemoData = async () => {
    if (
      !confirm(
        'Reset all demo data? This will clear all test orders, active carts, service requests, print jobs, and payments, and set all 6 tables back to Free.'
      )
    ) {
      return;
    }

    setIsResetting(true);
    setResetStatus(null);
    try {
      await adminService.resetDemoData();
      setResetStatus({
        type: 'success',
        message:
          'Clean slate ready! All test orders, carts, service calls, print jobs, payments, and sessions were cleared — all 6 tables are now Free.'
      });
      setTimeout(() => setResetStatus(null), 6000);
    } catch (err) {
      console.error('Demo data reset failed:', err);
      setResetStatus({
        type: 'error',
        message: 'Could not reset demo data. Please check your connection and try again.'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesZone = zoneFilter === 'ALL' || t.group === zoneFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.label.toLowerCase().includes(q) ||
        `table ${t.number}`.includes(q);
      return matchesZone && matchesSearch;
    });
  }, [zoneFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#111214] text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-7">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.07] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                <QrCode className="w-3.5 h-3.5" />
                <span>QR PORTAL HUB • {settings?.name || 'Spice & Sizzle Bistro'}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-white">
              Dining &amp; Service Command Center
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Open staff dashboards in separate tabs, or scan any table QR card below with your phone.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleResetDemoData}
              disabled={isResetting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-xs sm:text-sm font-extrabold transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{isResetting ? 'Resetting Slate...' : 'Reset Demo Data'}</span>
            </button>
          </div>
        </header>

        {/* Reset Status Banner */}
        {resetStatus && (
          <div
            className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
              resetStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {resetStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{resetStatus.message}</span>
          </div>
        )}

        {/* Top 3 Staff Portal Tinted Glass Cards (Reference Image Style) */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Rose Tinted Card: Waiter & POS */}
            <a
              href="/waiter"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[22px] p-5 bg-gradient-to-br from-rose-950/45 via-[#1B181B] to-[#18191C] border border-rose-500/20 hover:border-rose-400/45 transition-all flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-rose-400">
                    Waiter &amp; Cashier POS
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Live floor overview, urgency alerts, service timers &amp; cash bill settlement.
                  </p>
                </div>
                <div className="text-xl font-black text-white tracking-tight">
                  6 Tables Live
                </div>
              </div>

              <div className="w-full py-2.5 px-4 rounded-full bg-rose-500/15 group-hover:bg-rose-500/25 border border-rose-500/25 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                <span>Open Waiter Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* Emerald Tinted Card: Kitchen Display */}
            <a
              href="/kitchen"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[22px] p-5 bg-gradient-to-br from-emerald-950/45 via-[#171C1B] to-[#18191C] border border-emerald-500/20 hover:border-emerald-400/45 transition-all flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-emerald-400">
                    Kitchen Display (KDS)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Incoming kitchen pass tickets + 80mm Virtual Thermal KOT Printer.
                  </p>
                </div>
                <div className="text-xl font-black text-white tracking-tight">
                  Live Pass Stream
                </div>
              </div>

              <div className="w-full py-2.5 px-4 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                <span>Open Kitchen Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* Indigo Tinted Card: Mini Admin */}
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[22px] p-5 bg-gradient-to-br from-indigo-950/45 via-[#181921] to-[#18191C] border border-indigo-500/20 hover:border-indigo-400/45 transition-all flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-indigo-400">
                    Mini Admin Controls
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Sold-out switches, inline pricing, tax/PIN settings &amp; printable QR sheets.
                  </p>
                </div>
                <div className="text-xl font-black text-white tracking-tight">
                  Live Menu &amp; Tax
                </div>
              </div>

              <div className="w-full py-2.5 px-4 rounded-full bg-indigo-500/15 group-hover:bg-indigo-500/25 border border-indigo-500/25 text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                <span>Open Admin Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </a>
          </div>
        </section>

        {/* Tables QR Section Header + Pill Filters & Search (Reference Image Style) */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                Customer Table QR Portal (Tables 1 – 6)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Scan with your phone camera, or click Open Table to test in a new tab</span>
              </p>
            </div>

            {/* Pill Search */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search table or zone..."
                className="w-full pl-9 pr-4 py-2 rounded-full bg-[#18191C] border border-white/[0.1] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 transition"
              />
            </div>
          </div>

          {/* Zone Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'ALL', label: 'All Zones' },
                { id: 'INDOOR', label: 'Indoor' },
                { id: 'PATIO', label: 'Patio' },
                { id: 'LOUNGE', label: 'Terrace & Lounge' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setZoneFilter(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition shrink-0 ${
                  zoneFilter === tab.id
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-[#18191C] text-zinc-300 border border-white/[0.1] hover:border-white/25'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* QR Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTables.map((t) => {
              const url = `${origin}/t/${t.number}`;
              return (
                <div
                  key={t.number}
                  className="bg-[#18191C] rounded-[22px] p-5 border border-white/[0.08] hover:border-amber-500/40 flex flex-col items-center text-center shadow-xl transition"
                >
                  <div className="w-full flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-[#111214] border border-white/[0.08] text-[11px] font-bold text-zinc-300">
                      {t.zone}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">/t/{t.number}</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl shadow-inner mb-4">
                    <QRCodeSVG
                      value={url}
                      size={144}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <h3 className="text-lg font-black text-white">Table {t.number}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{t.zone}</p>

                  <div className="mt-4 w-full">
                    <a
                      href={`/t/${t.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold shadow-lg shadow-amber-500/15 transition active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Table {t.number}</span>
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
