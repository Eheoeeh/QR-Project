import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { sessionService } from '../services/sessionService';
import { useSessionStore } from '../store/useSessionStore';
import { TableSession } from '../types';

// Scene 1 Components
import BrandedLoader from '../components/customer/BrandedLoader';
import PinGate from '../components/customer/PinGate';
import ExpiredSessionScreen from '../components/customer/ExpiredSessionScreen';

// Icons
import { Bell, Droplets, ShoppingBag, Receipt, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';

export const CustomerPage: React.FC = () => {
  const { tableNumber: tableNumberParam } = useParams<{ tableNumber: string }>();
  const tableNumber = parseInt(tableNumberParam || '', 10);

  const {
    table,
    settings,
    currentSession,
    isSessionExpired,
    setGuestId,
    setTable,
    setSettings,
    setCurrentSession,
    setIsSessionExpired
  } = useSessionStore();

  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize Anonymous Guest ID and Session
  const initSession = useCallback(async () => {
    if (isNaN(tableNumber) || tableNumber <= 0) {
      setInitError('Invalid table number. Please scan a valid table QR code.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setInitError(null);

      // 1. Establish guest identity
      const guestId = sessionService.getOrCreateGuestId();
      setGuestId(guestId);

      // 2. Fetch Restaurant Settings & Table Information in parallel
      const [fetchedSettings, fetchedTable] = await Promise.all([
        sessionService.getRestaurantSettings(),
        sessionService.getTableByNumber(tableNumber)
      ]);

      setSettings(fetchedSettings);

      if (!fetchedTable) {
        setInitError(`Table ${tableNumber} was not found in the restaurant system.`);
        setIsLoading(false);
        return;
      }
      setTable(fetchedTable);

      // 3. Check if local browser holds a token for a session that has since closed
      const storedStatus = await sessionService.checkStoredSessionStatus(tableNumber);
      if (storedStatus.isClosed) {
        setIsSessionExpired(true);
        setIsLoading(false);
        return;
      }

      // 4. Resolve or create table session
      const session = await sessionService.resolveOrCreateTableSession(
        fetchedTable,
        fetchedSettings.require_seating_pin
      );

      setCurrentSession(session);
      setIsSessionExpired(session.status === 'CLOSED');
    } catch (err: any) {
      console.error('Session initialization error:', err);
      setInitError('Could not connect to table session. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  }, [tableNumber, setGuestId, setSettings, setTable, setCurrentSession, setIsSessionExpired]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Real-time listener for current session status changes
  useEffect(() => {
    if (!currentSession?.id) return;

    const channel = supabase
      .channel(`session-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
          filter: `id=eq.${currentSession.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as TableSession;
            setCurrentSession(updated);
            if (updated.status === 'CLOSED') {
              setIsSessionExpired(true);
            }
          } else if (payload.eventType === 'DELETE') {
            setIsSessionExpired(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id, setCurrentSession, setIsSessionExpired]);

  // Mobile Lock-Screen & Visibility Recovery
  useEffect(() => {
    if (!currentSession?.id) return;

    const handleResume = async () => {
      if (document.visibilityState === 'visible') {
        const refreshed = await sessionService.refreshSession(currentSession.id);
        if (refreshed) {
          setCurrentSession(refreshed);
          if (refreshed.status === 'CLOSED') {
            setIsSessionExpired(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('online', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('online', handleResume);
    };
  }, [currentSession?.id, setCurrentSession, setIsSessionExpired]);

  // Handle Seating PIN Verification
  const handleVerifyPin = async (enteredPin: string) => {
    if (!currentSession) return { success: false, message: 'No active session found.' };
    const res = await sessionService.verifySeatingPin(currentSession.id, enteredPin);
    if (res.success) {
      setCurrentSession({ ...currentSession, pin_verified: true });
    }
    return res;
  };

  // Handle starting a fresh session after an expired one
  const handleStartFresh = () => {
    sessionService.clearStoredToken(tableNumber);
    setIsSessionExpired(false);
    initSession();
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <BrandedLoader
        restaurantName={settings?.name}
        tableLabel={table ? table.label : `Table ${tableNumber}`}
      />
    );
  }

  // 2. Error State (Table not found or connection failure)
  if (initError || !table) {
    return (
      <div className="h-[100dvh] w-full flex flex-col justify-between bg-slate-900 text-white p-6">
        <div />
        <div className="max-w-sm mx-auto text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Connection Notice</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{initError}</p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Demo Hub</span>
            </Link>
          </div>
        </div>
        <div className="text-center text-[11px] text-slate-500">
          Make sure your QR code matches an active table in the system.
        </div>
      </div>
    );
  }

  // 3. Expired Session State (Waiter closed the session or bill was paid)
  if (isSessionExpired) {
    return (
      <ExpiredSessionScreen
        restaurantName={settings?.name || 'Spice & Sizzle Bistro'}
        tableLabel={table.label}
        onStartFresh={handleStartFresh}
      />
    );
  }

  // 4. Seating PIN Gate (Active when require_seating_pin is enabled and PIN is not yet verified)
  if (settings?.require_seating_pin && currentSession && !currentSession.pin_verified) {
    return (
      <PinGate
        restaurantName={settings.name}
        tableLabel={table.label}
        onVerify={handleVerifyPin}
      />
    );
  }

  // 5. Active Dining Session — Menu & Table Landing (Scene 1 Successful Entry)
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 pb-24 select-none">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                {settings?.name || 'Spice & Sizzle Bistro'}
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">
              {table.label}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              title="Need Water"
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition shadow-2xs"
            >
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span>Water</span>
            </button>
            <button
              title="Call Waiter"
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 transition shadow-2xs"
            >
              <Bell className="w-3.5 h-3.5 text-orange-500" />
              <span>Waiter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dining Landing */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Connected Table Status Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Table Session Connected</div>
              <p className="text-[11px] text-slate-500">
                Shared cart active • Devices at this table sync live
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
            OPEN
          </span>
        </div>

        {/* Scene 1 Success Welcome Banner */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 text-white shadow-md space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur">
            Scene 1 Ready
          </div>
          <h2 className="text-xl font-black">Welcome to {table.label}</h2>
          <p className="text-xs text-orange-100 leading-relaxed">
            Your table session is active. You and anyone at this table share this live ordering session.
          </p>
        </div>

        <div className="text-center py-6 text-xs text-slate-400">
          Menu catalog browsing & modifiers are ready for Scene 2.
        </div>
      </main>

      {/* Bottom Floating Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <button className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition">
            <Receipt className="w-4 h-4 text-slate-600" />
            <span>Bill</span>
          </button>
          <button className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold shadow-md transition">
            <ShoppingBag className="w-4 h-4" />
            <span>Shared Cart (0)</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CustomerPage;
