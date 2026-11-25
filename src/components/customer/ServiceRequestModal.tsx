import React, { useState, useEffect } from 'react';
import { ServiceRequest, ServiceRequestType } from '../../types';
import {
  X,
  Bell,
  Droplets,
  MessageSquare,
  Clock,
  ArrowRight
} from 'lucide-react';

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableLabel: string;
  activeRequests: ServiceRequest[];
  onSubmitRequest: (type: ServiceRequestType, note?: string) => Promise<void>;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  isOpen,
  onClose,
  tableLabel,
  activeRequests,
  onSubmitRequest
}) => {
  const [otherNote, setOtherNote] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const getActiveRequest = (type: ServiceRequestType) => {
    return activeRequests.find(
      (r) => r.type === type && (r.status === 'PENDING' || r.status === 'ON_THE_WAY')
    );
  };

  const formatElapsed = (createdAt: string) => {
    const elapsedSeconds = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTriggerRequest = async (type: ServiceRequestType, note?: string) => {
    if (isSubmitting || getActiveRequest(type)) return;
    setIsSubmitting(true);
    try {
      await onSubmitRequest(type, note);
      if (type === 'OTHER') {
        setShowOtherInput(false);
        setOtherNote('');
      }
    } catch (err) {
      console.error('Failed to submit service request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const waiterActive = getActiveRequest('CALL_WAITER');
  const waterActive = getActiveRequest('WATER');
  const otherActive = getActiveRequest('OTHER');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0F0F12] text-white rounded-t-[28px] sm:rounded-3xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FF5B22]/15 text-[#FF5B22] border border-[#FF5B22]/30 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Request Table Service</h2>
              <p className="text-xs text-zinc-400 font-medium">{tableLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1E1E24] hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Cards Body */}
        <div className="overflow-y-auto p-4 space-y-3.5 flex-1">
          {/* 1. Call Waiter */}
          <div
            onClick={() => !waiterActive && handleTriggerRequest('CALL_WAITER')}
            className={`min-h-[84px] p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
              waiterActive
                ? 'border-[#FF5B22]/50 bg-[#FF5B22]/15 cursor-not-allowed select-none'
                : 'border-white/[0.08] hover:border-[#FF5B22]/50 cursor-pointer active:scale-[0.99] bg-[#18181B]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  waiterActive
                    ? 'bg-[#FF5B22] text-white shadow-md shadow-orange-950/50'
                    : 'bg-[#FF5B22]/15 text-[#FF5B22] border border-[#FF5B22]/25'
                }`}
              >
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Call Waiter</h3>
                <p className="text-xs text-zinc-400">
                  {waiterActive
                    ? waiterActive.status === 'ON_THE_WAY'
                      ? 'Waiter is on the way!'
                      : 'Request sent to staff'
                    : 'Need assistance or order guidance'}
                </p>
              </div>
            </div>

            {waiterActive ? (
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-[#FF5B22]/25 text-orange-200">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>{formatElapsed(waiterActive.created_at)}</span>
                </span>
                <span className="text-[10px] text-[#FF5B22] font-bold block mt-1">
                  {waiterActive.status === 'ON_THE_WAY' ? 'En Route' : 'Waiting'}
                </span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#242429] flex items-center justify-center text-zinc-300">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* 2. Need Water */}
          <div
            onClick={() => !waterActive && handleTriggerRequest('WATER')}
            className={`min-h-[84px] p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
              waterActive
                ? 'border-sky-500/50 bg-sky-500/15 cursor-not-allowed select-none'
                : 'border-white/[0.08] hover:border-sky-400/50 cursor-pointer active:scale-[0.99] bg-[#18181B]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  waterActive
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                }`}
              >
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Need Water</h3>
                <p className="text-xs text-zinc-400">
                  {waterActive
                    ? waterActive.status === 'ON_THE_WAY'
                      ? 'Water is on the way!'
                      : 'Refill request queued'
                    : 'Drinking water / glass refills'}
                </p>
              </div>
            </div>

            {waterActive ? (
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-sky-500/25 text-sky-200">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>{formatElapsed(waterActive.created_at)}</span>
                </span>
                <span className="text-[10px] text-sky-400 font-bold block mt-1">
                  {waterActive.status === 'ON_THE_WAY' ? 'En Route' : 'Waiting'}
                </span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#242429] flex items-center justify-center text-zinc-300">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* 3. Other Request */}
          <div
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              otherActive
                ? 'border-purple-500/50 bg-purple-500/15'
                : 'border-white/[0.08] bg-[#18181B]'
            }`}
          >
            <div
              onClick={() => {
                if (!otherActive) setShowOtherInput(!showOtherInput);
              }}
              className="min-h-[84px] p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    otherActive
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
                  }`}
                >
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Other Request</h3>
                  <p className="text-xs text-zinc-400">
                    {otherActive
                      ? otherActive.note || 'Custom request submitted'
                      : 'Napkins, extra cutlery, sauce, clean table'}
                  </p>
                </div>
              </div>

              {otherActive ? (
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-500/25 text-purple-200">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>{formatElapsed(otherActive.created_at)}</span>
                  </span>
                  <span className="text-[10px] text-purple-300 font-bold block mt-1">
                    {otherActive.status === 'ON_THE_WAY' ? 'En Route' : 'Waiting'}
                  </span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#242429] flex items-center justify-center text-zinc-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>

            {!otherActive && showOtherInput && (
              <div className="p-4 pt-3 space-y-3 border-t border-white/[0.06]">
                <input
                  type="text"
                  placeholder="What do you need? (e.g. extra napkins, clean table)"
                  value={otherNote}
                  onChange={(e) => setOtherNote(e.target.value)}
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111114] border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF5B22] transition"
                />
                <button
                  type="button"
                  disabled={!otherNote.trim() || isSubmitting}
                  onClick={() => handleTriggerRequest('OTHER', otherNote.trim())}
                  className="w-full py-2.5 px-4 rounded-full bg-[#FF5B22] hover:bg-[#ff6d3a] disabled:opacity-40 text-white font-bold text-xs shadow transition"
                >
                  {isSubmitting ? 'Sending Request...' : 'Send Custom Request'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-6 sm:pb-4 border-t border-white/10 bg-[#121215] shrink-0 text-center">
          <p className="text-[11px] text-zinc-500">
            Requests go straight to your waiter&apos;s live tablet dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestModal;
