import React, { useState, useEffect } from 'react';
import { ServiceRequest } from '../../types';
import {
  Bell,
  Droplets,
  DollarSign,
  MessageSquare,
  Clock,
  CheckCircle2,
  Navigation,
  Check
} from 'lucide-react';

export interface EnrichedServiceRequest extends ServiceRequest {
  tableNumber?: number;
  tableLabel?: string;
}

interface ServiceRequestQueueProps {
  requests: EnrichedServiceRequest[];
  onSetOnTheWay: (requestId: string) => Promise<void>;
  onSetDone: (requestId: string) => Promise<void>;
}

export const ServiceRequestQueue: React.FC<ServiceRequestQueueProps> = ({
  requests,
  onSetOnTheWay,
  onSetDone
}) => {
  // Live ticking timer state (updates every second)
  const [now, setNow] = useState(Date.now());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format elapsed timer (mm:ss) and calculate urgency level
  const getTimerDetails = (createdAt: string) => {
    const elapsedSeconds = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Escalating color levels:
    // < 60s: Green/Emerald (Fresh)
    // 60s - 120s: Amber/Orange (Waiting)
    // > 120s (2+ min): Rose/Red Pulse (Neglected / High Urgency!)
    if (elapsedSeconds >= 120) {
      return {
        formatted,
        colorClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse',
        isUrgent: true,
        urgencyText: 'Neglected (2m+)'
      };
    } else if (elapsedSeconds >= 60) {
      return {
        formatted,
        colorClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        isUrgent: false,
        urgencyText: 'Waiting 1m+'
      };
    } else {
      return {
        formatted,
        colorClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        isUrgent: false,
        urgencyText: 'New'
      };
    }
  };

  const handleOnTheWayClick = async (requestId: string) => {
    setLoadingId(requestId);
    try {
      await onSetOnTheWay(requestId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDoneClick = async (requestId: string) => {
    setLoadingId(requestId);
    try {
      await onSetDone(requestId);
    } finally {
      setLoadingId(null);
    }
  };

  const activeCount = requests.length;

  return (
    <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl flex flex-col space-y-3.5">
      {/* Queue Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
              activeCount > 0
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-tight">
                Live Service Queue
              </h2>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeCount > 0
                    ? 'bg-rose-600 text-white animate-bounce'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeCount}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Live wait timers • 2-step workflow</p>
          </div>
        </div>
      </div>

      {/* Requests Feed */}
      {requests.length === 0 ? (
        <div className="py-8 text-center space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800/80 p-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-black text-slate-200">All Guest Calls Attended</h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            Water refills, waiter requests, and cash bills will appear here instantly with live wait timers.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar pr-0.5">
          {requests.map((req) => {
            const timer = getTimerDetails(req.created_at);
            const isOnTheWay = req.status === 'ON_THE_WAY';
            const isBusy = loadingId === req.id;

            return (
              <div
                key={req.id}
                className={`rounded-2xl p-3.5 border transition-all duration-200 space-y-3 ${
                  timer.isUrgent
                    ? 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/40'
                    : isOnTheWay
                    ? 'bg-blue-950/30 border-blue-500/50 shadow-md shadow-blue-950/30'
                    : 'bg-slate-800/90 border-slate-700/80'
                }`}
              >
                {/* Top Row: Table Label, Request Type & Live Timer */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        req.type === 'WATER'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : req.type === 'CALL_WAITER'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : req.type === 'PAY_CASH'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {req.type === 'WATER' && <Droplets className="w-5 h-5" />}
                      {req.type === 'CALL_WAITER' && <Bell className="w-5 h-5 animate-bounce" />}
                      {req.type === 'PAY_CASH' && <DollarSign className="w-5 h-5" />}
                      {req.type === 'OTHER' && <MessageSquare className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-sm text-white whitespace-nowrap">
                          Table {req.tableNumber ?? '1'}
                        </span>
                        {req.tableLabel && (
                          <span className="text-[11px] text-slate-400 truncate">
                            • {req.tableLabel.split('(')[1]?.replace(')', '') || req.tableLabel}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-200 block truncate">
                        {req.type === 'WATER' && 'Needs Water Refill'}
                        {req.type === 'CALL_WAITER' && 'Call Waiter to Table'}
                        {req.type === 'PAY_CASH' && 'Cash Bill Settlement'}
                        {req.type === 'OTHER' && (req.note || 'Special Request')}
                      </span>
                    </div>
                  </div>

                  {/* Live Escalating Timer */}
                  <div className="text-right shrink-0">
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-black ${timer.colorClass}`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{timer.formatted}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                      {isOnTheWay ? 'En Route' : timer.urgencyText}
                    </span>
                  </div>
                </div>

                {/* Two-Step Workflow Actions */}
                <div className="pt-1 flex items-center gap-2">
                  {!isOnTheWay ? (
                    <>
                      {/* Step 1: On My Way */}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleOnTheWayClick(req.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>On My Way</span>
                      </button>

                      {/* Step 2: Done */}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDoneClick(req.id)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-slate-300 hover:text-white font-extrabold text-xs border border-slate-700 hover:border-emerald-500 transition flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Done</span>
                      </button>
                    </>
                  ) : (
                    /* When already en route: single bold Mark Done button */
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDoneClick(req.id)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark Request Done</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServiceRequestQueue;
