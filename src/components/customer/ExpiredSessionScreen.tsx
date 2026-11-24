import React from 'react';
import { CheckCircle2, RotateCcw, Utensils } from 'lucide-react';

interface ExpiredSessionScreenProps {
  restaurantName: string;
  tableLabel: string;
  onStartFresh: () => void;
}

export const ExpiredSessionScreen: React.FC<ExpiredSessionScreenProps> = ({
  restaurantName,
  tableLabel,
  onStartFresh
}) => {
  return (
    <div className="h-[100dvh] w-full flex flex-col justify-between bg-slate-900 text-white p-6 overflow-y-auto">
      {/* Header */}
      <div className="pt-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300">
          <Utensils className="w-3.5 h-3.5 text-orange-400" />
          <span>{restaurantName}</span>
        </div>
      </div>

      {/* Centered Notice */}
      <div className="w-full max-w-sm mx-auto my-auto text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
            {tableLabel}
          </span>
          <h2 className="text-2xl font-black text-white">Dining Session Closed</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            This dining session has ended and the bill has been settled. Thank you for dining with us!
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onStartFresh}
            className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start Fresh Table Session</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-4 text-center">
        <p className="text-[11px] text-slate-500">
          Scan the QR sticker at your table anytime to place new orders.
        </p>
      </div>
    </div>
  );
};

export default ExpiredSessionScreen;
