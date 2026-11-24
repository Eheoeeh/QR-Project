import React from 'react';
import { MenuItem } from '../../types';
import { Plus, Flame } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  currencySymbol?: string;
  onSelect: (item: MenuItem) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({
  item,
  currencySymbol = 'Rs.',
  onSelect
}) => {
  const hasModifiers = item.modifiers && item.modifiers.length > 0;

  // Spice level helper
  const renderSpiceIndicator = () => {
    if (!item.spice_level || item.spice_level <= 0) return null;
    return (
      <span
        title={`Spice level: ${item.spice_level}/3`}
        className="inline-flex items-center text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded-md"
      >
        <Flame className="w-3 h-3 fill-rose-500 inline mr-0.5" />
        {item.spice_level === 1 ? 'Mild' : item.spice_level === 2 ? 'Medium' : 'Hot'}
      </span>
    );
  };

  return (
    <div
      onClick={() => item.is_available && onSelect(item)}
      className={`group relative bg-white rounded-2xl border p-3 sm:p-4 transition-all duration-200 flex gap-3.5 items-start justify-between shadow-xs ${
        item.is_available
          ? 'border-slate-200/80 hover:border-orange-400 hover:shadow-md cursor-pointer active:scale-[0.99]'
          : 'border-slate-200 bg-slate-50/80 opacity-55 cursor-not-allowed select-none'
      }`}
    >
      {/* Left Details Column */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-orange-600 transition">
            {item.name}
          </h3>
          {renderSpiceIndicator()}
        </div>

        {item.name_alt && (
          <div className="text-[11px] font-medium text-slate-400 font-sans">
            {item.name_alt}
          </div>
        )}

        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-0.5">
            {item.description}
          </p>
        )}

        {/* Pricing and Action row */}
        <div className="flex items-center gap-3 pt-2">
          <span className="text-sm font-black text-slate-900">
            {currencySymbol} {Number(item.base_price).toLocaleString()}
          </span>

          {hasModifiers && item.is_available && (
            <span className="text-[10px] text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
              Customizable
            </span>
          )}
        </div>
      </div>

      {/* Right Square Thumbnail Column */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-2xs">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              !item.is_available ? 'grayscale' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100 text-xs">
            No photo
          </div>
        )}

        {/* Crisp Sold Out Badge Overlay */}
        {!item.is_available ? (
          <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
            <span className="px-2 py-1 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md leading-none">
              Sold Out
            </span>
          </div>
        ) : (
          /* Tap-friendly floating Add button on thumbnail corner */
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="absolute bottom-1.5 right-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-600 hover:bg-orange-500 active:scale-90 text-white flex items-center justify-center shadow-md transition"
            title={hasModifiers ? 'Customize' : 'Add to cart'}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MenuCard;
