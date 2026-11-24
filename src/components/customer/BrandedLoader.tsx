import React from 'react';
import { Utensils } from 'lucide-react';

interface BrandedLoaderProps {
  restaurantName?: string;
  tableLabel?: string;
}

export const BrandedLoader: React.FC<BrandedLoaderProps> = ({
  restaurantName = 'Spice & Sizzle Bistro',
  tableLabel
}) => {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 select-none">
      <div className="flex flex-col items-center max-w-xs text-center space-y-5">
        {/* Animated Brand Emblem */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center shadow-lg shadow-orange-500/10">
            <Utensils className="w-8 h-8 text-orange-500 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-orange-500/30 animate-ping opacity-25" />
        </div>

        {/* Brand Text */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-white">{restaurantName}</h1>
          {tableLabel ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
              Connecting to {tableLabel}
            </p>
          ) : (
            <p className="text-xs text-slate-400">Setting your table...</p>
          )}
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full w-2/3 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};

export default BrandedLoader;
