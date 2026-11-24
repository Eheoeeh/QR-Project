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

  // Live timer tick every second for active wait timers
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to find an active request of a specific type
  const getActiveRequest = (type: ServiceRequestType) => {
    return activeRequests.find(
      (r) => r.type === type && (r.status === 'PENDING' || r.status === 'ON_THE_WAY')
    );
  };

  // Format elapsed wait time (mm:ss)
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600/10 text-orange-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Request Table Service</h2>
              <p className="text-xs text-slate-400 font-medium">{tableLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Cards Body */}
        <div className="overflow-y-auto p-4 space-y-3.5 flex-1">
          {/* 1. Oversized Action Card: Call Waiter */}
          <div
            onClick={() => !waiterActive && handleTriggerRequest('CALL_WAITER')}
            className={`min-h-[84px] p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
              waiterActive
                ? 'border-orange-300 bg-orange-50/70 cursor-not-allowed select-none'
                : 'border-slate-200 hover:border-orange-400 hover:shadow-md cursor-pointer active:scale-[0.99] bg-white'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  waiterActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-orange-100 text-orange-600'
                }`}
              >
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Call Waiter</h3>
                <p className="text-xs text-slate-500">
                  {waiterActive
                    ? waiterActive.status === 'ON_THE_WAY'
                      ? 'Waiter is on the way!'
                      : 'Request sent to staff'
                    : 'Need assistance or order guidance'}
                </p>
              </div>
            </div>

            {/* Visual Anti-Spam Lock & Live Elapsed Timer */}
            {waiterActive ? (
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-200/60 text-orange-800">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>{formatElapsed(waiterActive.created_at)}</span>
                </span>
                <span className="text-[10px] text-orange-600 font-bold block mt-0.5">
                  {waiterActive.status === 'ON_THE_WAY' ? 'En Route' : 'Waiting'}
                </span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* 2. Oversized Action Card: Need Water */}
          <div
            onClick={() => !waterActive && handleTriggerRequest('WATER')}
            className={`min-h-[84px] p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
              waterActive
                ? 'border-blue-300 bg-blue-50/70 cursor-not-allowed select-none'
                : 'border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer active:scale-[0.99] bg-white'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  waterActive
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Need Water</h3>
                <p className="text-xs text-slate-500">
                  {waterActive
                    ? waterActive.status === 'ON_THE_WAY'
                      ? 'Water is on the way!'
                      : 'Refill request queued'
                    : 'Drinking water / glass refills'}
                </p>
              </div>
            </div>

            {/* Visual Anti-Spam Lock & Live Elapsed Timer */}
            {waterActive ? (
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-200/60 text-blue-800">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>{formatElapsed(waterActive.created_at)}</span>
                </span>
                <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                  {waterActive.status === 'ON_THE_WAY' ? 'En Route' : 'Waiting'}
                </span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* 3. Oversized Action Card: Other Request */}
          <div
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              otherActive
                ? 'border-purple-300 bg-purple-50/70'
                : 'border-slate-200 bg-white'
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
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    otherActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-100 text-purple-600'
                  }`}
                >
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Other Request</h3>
                  <p className="text-xs text-slate-500">
                    {otherActive
                      ? otherActive.note || 'Custom request submitted'
                      : 'Napkins, extra cutlery, sauce, clean table'}
                  </p>
                </div>
              </div>

              {otherActive ? (
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-200/60 text-purple-800">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>{formatElapsed(otherActive.created_at)}</span>
                  </span>
                  <span className="text-[10px] text-purple-600 font-bold block mt-0.5">
                    {otherActive.status === 'ON_THE_WAY' ? 'En Route' : 'Waiting'}
                  </span>
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Expandable text field for Other */}
            {!otherActive && showOtherInput && (
              <div className="p-4 pt-0 space-y-3 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="What do you need? (e.g. extra napkins, clean table)"
                  value={otherNote}
                  onChange={(e) => setOtherNote(e.target.value)}
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition"
                />
                <button
                  type="button"
                  disabled={!otherNote.trim() || isSubmitting}
                  onClick={() => handleTriggerRequest('OTHER', otherNote.trim())}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs shadow transition"
                >
                  {isSubmitting ? 'Sending Request...' : 'Send Custom Request'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-6 sm:pb-4 border-t border-slate-100 bg-white shrink-0 text-center">
          <p className="text-[11px] text-slate-400">
            Requests are sent directly to your waiter's live tablet dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestModal;
