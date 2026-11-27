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
  const [now, setNow] = useState(Date.now());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimerDetails = (createdAt: string) => {
    const elapsedSeconds = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;

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
    <div className="bg-[#151619] rounded-[22px] p-4 sm:p-5 border border-white/[0.08] shadow-xl flex flex-col space-y-4">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
              activeCount > 0
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
                : 'bg-[#18191C] text-zinc-400 border-white/[0.08]'
            }`}
          >
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-white tracking-tight">
                Live Service Queue
              </h2>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeCount > 0
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-[#18191C] text-zinc-400 border border-white/[0.08]'
                }`}
              >
                {activeCount}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Live timers • 2-step workflow</p>
          </div>
        </div>
      </div>

      {/* Requests Feed */}
      {requests.length === 0 ? (
        <div className="py-8 text-center space-y-2.5 bg-[#111214]/70 rounded-2xl border border-white/[0.06] p-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-extrabold text-zinc-200">All Guest Calls Attended</h3>
          <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Water refills, waiter requests, and cash bills appear here immediately with live wait timers.
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
                    ? 'bg-gradient-to-br from-rose-950/50 to-[#18191C] border-rose-500/60 shadow-lg'
                    : isOnTheWay
                    ? 'bg-gradient-to-br from-indigo-950/45 to-[#18191C] border-indigo-500/45'
                    : 'bg-[#18191C] border-white/[0.08]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                        req.type === 'WATER'
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                          : req.type === 'CALL_WAITER'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : req.type === 'PAY_CASH'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-zinc-800 text-zinc-300 border-white/10'
                      }`}
                    >
                      {req.type === 'WATER' && <Droplets className="w-4 h-4" />}
                      {req.type === 'CALL_WAITER' && <Bell className="w-4 h-4 animate-bounce" />}
                      {req.type === 'PAY_CASH' && <DollarSign className="w-4 h-4" />}
                      {req.type === 'OTHER' && <MessageSquare className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-sm text-white whitespace-nowrap">
                          Table {req.tableNumber ?? '1'}
                        </span>
                        {req.tableLabel && (
                          <span className="text-[11px] text-zinc-400 truncate">
                            • {req.tableLabel.split('(')[1]?.replace(')', '') || req.tableLabel}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-zinc-200 block truncate">
                        {req.type === 'WATER' && 'Needs Water Refill'}
                        {req.type === 'CALL_WAITER' && 'Call Waiter to Table'}
                        {req.type === 'PAY_CASH' && 'Cash Bill Settlement'}
                        {req.type === 'OTHER' && (req.note || 'Special Request')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${timer.colorClass}`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{timer.formatted}</span>
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">
                      {isOnTheWay ? 'En Route' : timer.urgencyText}
                    </span>
                  </div>
                </div>

                {/* Rounded-Full Pill Workflow Actions */}
                <div className="pt-1 flex items-center gap-2">
                  {!isOnTheWay ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleOnTheWayClick(req.id)}
                        className="flex-1 py-2 px-3 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-zinc-950 font-extrabold text-xs shadow-md shadow-amber-500/15 transition flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>On My Way</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDoneClick(req.id)}
                        className="py-2 px-3.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50 text-emerald-300 font-extrabold text-xs border border-emerald-500/30 transition flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDoneClick(req.id)}
                      className="w-full py-2 px-4 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 active:scale-95 disabled:opacity-50 text-emerald-300 font-extrabold text-xs transition flex items-center justify-center gap-1.5"
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
