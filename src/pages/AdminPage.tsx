import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Settings,
  Utensils,
  QrCode,
  Search,
  Printer,
  Check,
  Loader2,
  ShieldCheck,
  Percent,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { MenuItem, RestaurantSettings, Table } from '../types';

type AdminTab = 'menu' | 'settings' | 'tables';

const TAX_PRESETS = [0, 5, 13, 16, 18];

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Data
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  // Menu filter & inline price editing state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);

  // Settings form state
  const [venueNameDraft, setVenueNameDraft] = useState('');
  const [taxDraft, setTaxDraft] = useState('16');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setErrorMsg(null);
      const data = await adminService.getAdminData();
      setSettings(data.settings);
      setMenuItems(data.menuItems);
      setTables(data.tables);

      // Initialize drafts
      setVenueNameDraft(data.settings.name);
      setTaxDraft(String(data.settings.tax_percent));
      const drafts: Record<string, string> = {};
      data.menuItems.forEach((item) => {
        drafts[item.id] = String(item.base_price);
      });
      setPriceDrafts(drafts);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setErrorMsg('Could not load restaurant data from Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived menu categories & filtered items
  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((m) => m.category)));
    return ['All', ...unique];
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const availableCount = menuItems.filter((i) => i.is_available).length;
  const soldOutCount = menuItems.length - availableCount;

  // One-tap Sold Out toggle (optimistic UI + live Supabase update)
  const handleToggleAvailability = async (item: MenuItem) => {
    const nextState = !item.is_available;
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, is_available: nextState } : m))
    );

    try {
      await adminService.toggleMenuAvailability(item.id, nextState);
    } catch (err) {
      console.error('Failed to toggle availability:', err);
      // Roll back optimistic state
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, is_available: item.is_available } : m))
      );
      setErrorMsg(`Could not update availability for ${item.name}.`);
    }
  };

  // Inline price save handler
  const handleSavePrice = async (item: MenuItem) => {
    const raw = (priceDrafts[item.id] ?? '').trim();
    const parsed = Number(raw);

    if (!raw || Number.isNaN(parsed) || parsed < 0) {
      // Reset invalid input back to persisted price
      setPriceDrafts((prev) => ({ ...prev, [item.id]: String(item.base_price) }));
      return;
    }

    if (parsed === Number(item.base_price)) return;

    setSavingItemId(item.id);
    try {
      await adminService.updateMenuPrice(item.id, parsed);
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, base_price: parsed } : m))
      );
      setSavedItemId(item.id);
      setTimeout(() => {
        setSavedItemId((curr) => (curr === item.id ? null : curr));
      }, 2000);
    } catch (err) {
      console.error('Failed to update price:', err);
      setPriceDrafts((prev) => ({ ...prev, [item.id]: String(item.base_price) }));
      setErrorMsg(`Failed to update price for ${item.name}.`);
    } finally {
      setSavingItemId(null);
    }
  };

  // Instant toggle for Seating PIN requirement
  const handleTogglePinRequirement = async () => {
    if (!settings) return;
    const nextPinState = !settings.require_seating_pin;

    // Optimistic update
    setSettings({ ...settings, require_seating_pin: nextPinState });
    try {
      const updated = await adminService.updateSettings({
        require_seating_pin: nextPinState
      });
      setSettings(updated);
      setSettingsSavedMsg(
        nextPinState
          ? 'Seating PIN enabled — guests must enter the 4-digit table PIN.'
          : 'Seating PIN disabled — guests can browse immediately upon scanning.'
      );
      setTimeout(() => setSettingsSavedMsg(null), 3500);
    } catch (err) {
      console.error('Failed to toggle seating PIN:', err);
      setSettings(settings);
      setErrorMsg('Failed to update Seating PIN setting.');
    }
  };

  // Save Tax Percentage & Restaurant Name
  const handleSaveGeneralSettings = async (
    e?: React.FormEvent,
    overrideTax?: number
  ) => {
    if (e) e.preventDefault();
    if (!settings) return;

    const taxVal = overrideTax !== undefined ? overrideTax : Number(taxDraft);
    const trimmedName = venueNameDraft.trim() || settings.name;

    if (Number.isNaN(taxVal) || taxVal < 0 || taxVal > 100) {
      setErrorMsg('Tax percentage must be between 0% and 100%.');
      return;
    }

    if (overrideTax !== undefined) {
      setTaxDraft(String(overrideTax));
    }

    setSavingSettings(true);
    setErrorMsg(null);
    try {
      const updated = await adminService.updateSettings({
        name: trimmedName,
        tax_percent: taxVal
      });
      setSettings(updated);
      setVenueNameDraft(updated.name);
      setTaxDraft(String(updated.tax_percent));
      setSettingsSavedMsg(`Saved! Tax rate set to ${updated.tax_percent}% across live bills.`);
      setTimeout(() => setSettingsSavedMsg(null), 3500);
    } catch (err) {
      console.error('Failed to update settings:', err);
      setErrorMsg('Could not save restaurant settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const currencySymbol = settings?.currency_symbol || 'Rs.';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-5 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <header className="bg-slate-900 rounded-2xl p-4 sm:px-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Mini Admin Panel
                </h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live DB Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {settings?.name || 'Spice & Sizzle Bistro'} • Sold-out switches, inline pricing, tax & PIN, QR sheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'menu'
                    ? 'bg-orange-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Menu Controls</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'bg-orange-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Quick Settings</span>
              </button>
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'tables'
                    ? 'bg-orange-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Sheet</span>
              </button>
            </div>

            <Link
              to="/"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Back to Demo Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
            <p className="text-sm font-semibold">Loading restaurant controls...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: LIVE MENU CONTROLS */}
            {activeTab === 'menu' && (
              <div className="space-y-4">
                {/* Search + Category Bar + Summary */}
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search dishes..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                            selectedCategory === cat
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {availableCount} Available
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {soldOutCount} Sold Out
                    </span>
                  </div>
                </div>

                {/* Dish List */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-xl">
                  {filteredMenu.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-400">
                      No dishes match your filter.
                    </div>
                  ) : (
                    filteredMenu.map((item) => {
                      const draftVal = priceDrafts[item.id] ?? String(item.base_price);
                      const isPriceDirty =
                        draftVal.trim() !== '' &&
                        !Number.isNaN(Number(draftVal)) &&
                        Number(draftVal) !== Number(item.base_price);

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            !item.is_available ? 'bg-slate-950/60' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Left: Thumbnail & Name */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className={`w-full h-full object-cover transition ${
                                    !item.is_available ? 'grayscale opacity-40' : ''
                                  }`}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                                  No img
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3
                                  className={`font-bold text-sm truncate ${
                                    item.is_available ? 'text-white' : 'text-slate-400 line-through'
                                  }`}
                                >
                                  {item.name}
                                </h3>
                                {!item.is_available && (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                                    Sold Out
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {item.category}
                                {item.modifiers?.length > 0 && ` • ${item.modifiers.length} modifiers`}
                              </p>
                            </div>
                          </div>

                          {/* Right: Inline Price Edit + One-Tap Sold Out Switch */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            {/* Inline Price Editor */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center bg-slate-950 border border-slate-700 focus-within:border-orange-500 rounded-xl px-2.5 py-1.5 transition">
                                <span className="text-xs font-bold text-slate-400 mr-1.5">
                                  {currencySymbol}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="10"
                                  value={draftVal}
                                  onChange={(e) =>
                                    setPriceDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                      handleSavePrice(item);
                                    }
                                  }}
                                  onBlur={() => handleSavePrice(item)}
                                  aria-label={`Price for ${item.name}`}
                                  className="w-20 bg-transparent text-sm font-bold text-white focus:outline-none tabular-nums"
                                />
                              </div>

                              {savingItemId === item.id ? (
                                <span className="p-1.5 text-orange-400">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                </span>
                              ) : isPriceDirty ? (
                                <button
                                  type="button"
                                  onClick={() => handleSavePrice(item)}
                                  className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition"
                                >
                                  Save
                                </button>
                              ) : savedItemId === item.id ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[11px] font-bold">
                                  <Check className="w-3.5 h-3.5" />
                                  Saved
                                </span>
                              ) : null}
                            </div>

                            {/* One-Tap Sold Out Switch */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={item.is_available}
                              onClick={() => handleToggleAvailability(item)}
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition ${
                                item.is_available
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                              }`}
                            >
                              <span
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                                  item.is_available ? 'bg-emerald-500' : 'bg-rose-600'
                                }`}
                              >
                                <span
                                  className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                                  style={{
                                    transform: item.is_available
                                      ? 'translateX(18px)'
                                      : 'translateX(3px)'
                                  }}
                                />
                              </span>
                              <span className="w-16 text-left">
                                {item.is_available ? 'Available' : 'Sold Out'}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: QUICK SETTINGS */}
            {activeTab === 'settings' && settings && (
              <div className="space-y-4">
                {settingsSavedMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{settingsSavedMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Seating PIN Card */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          settings.require_seating_pin
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">
                          Seating 4-Digit PIN Requirement
                        </h2>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1">
                          Prevent remote prank orders: when enabled, guests must enter the 4-digit table PIN displayed on the Waiter Dashboard before placing orders.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span
                        className={`text-xs font-extrabold uppercase tracking-wider ${
                          settings.require_seating_pin ? 'text-orange-400' : 'text-slate-400'
                        }`}
                      >
                        {settings.require_seating_pin ? 'PIN Gate Active' : 'Open QR Seating'}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Syncs immediately to Waiter POS cards
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.require_seating_pin}
                      onClick={handleTogglePinRequirement}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-extrabold transition ${
                        settings.require_seating_pin
                          ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                          settings.require_seating_pin ? 'bg-orange-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                          style={{
                            transform: settings.require_seating_pin
                              ? 'translateX(18px)'
                              : 'translateX(3px)'
                          }}
                        />
                      </span>
                      <span>{settings.require_seating_pin ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Tax Percentage & Venue Name Form */}
                <form
                  onSubmit={(e) => handleSaveGeneralSettings(e)}
                  className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Tax Rate & Venue Name</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Updates live bill calculations and digital receipts in real time.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Tax Percentage (%)
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative w-32">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={taxDraft}
                            onChange={(e) => setTaxDraft(e.target.value)}
                            className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-orange-500 tabular-nums"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            %
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {TAX_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleSaveGeneralSettings(undefined, preset)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                                Number(taxDraft) === preset
                                  ? 'bg-orange-600 border-orange-500 text-white'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Restaurant Name
                      </label>
                      <input
                        type="text"
                        value={venueNameDraft}
                        onChange={(e) => setVenueNameDraft(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-lg shadow-orange-950/40 shrink-0"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Save Settings</span>
                    </button>
                  </div>
                </form>
                </div>
              </div>
            )}

            {/* TAB 3: PRINTABLE QR SHEET */}
            {activeTab === 'tables' && (
              <div className="space-y-4">
                {/* Screen Toolbar */}
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      Printable Table QR Stand Sheet ({tables.length} Tables)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Each card links directly to <code className="text-orange-300">/t/:tableNumber</code> for acrylic table stands and stickers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold transition shadow-lg shadow-orange-950/40 shrink-0"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print QR Sheet</span>
                  </button>
                </div>

                {/* Printable Sheet Container */}
                <div className="printable-qr-sheet space-y-4">
                  {/* Print-only Header */}
                  <div className="hidden print:block text-center pb-3 border-b border-slate-300 mb-4">
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                      {settings?.name || 'Spice & Sizzle Bistro'}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">
                      Table QR Ordering & Instant Pay Stands
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-4 print:gap-4">
                    {tables.map((t) => {
                      const tableUrl = `${origin}/t/${t.table_number}`;
                      return (
                        <div
                          key={t.id}
                          className="bg-slate-900 print:bg-white rounded-2xl border border-slate-800 print:border-2 print:border-slate-800 p-5 print:p-4 flex flex-col items-center text-center shadow-lg print:shadow-none break-inside-avoid"
                        >
                          <div className="text-[11px] font-black uppercase tracking-widest text-orange-400 print:text-orange-600 mb-3">
                            {settings?.name || 'Spice & Sizzle Bistro'}
                          </div>

                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-inner print:shadow-none mb-3">
                            <QRCodeSVG
                              value={tableUrl}
                              size={148}
                              level="M"
                              includeMargin={false}
                            />
                          </div>

                          <h3 className="text-lg font-black text-white print:text-slate-900">
                            {t.label}
                          </h3>
                          <p className="text-xs font-semibold text-slate-300 print:text-slate-700 mt-1">
                            Scan to View Menu, Order & Pay
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 print:text-slate-500 mt-1">
                            /t/{t.table_number}
                          </p>

                          <a
                            href={`/t/${t.table_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="print:hidden mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                            <span>Open Table {t.table_number}</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
