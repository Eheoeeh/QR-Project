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
      className={`group relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-2xs ${
        item.is_available
          ? 'border-slate-200/80 hover:border-orange-400 hover:shadow-md cursor-pointer active:scale-[0.99]'
          : 'border-slate-200 bg-slate-50/80 opacity-60 cursor-not-allowed select-none'
      }`}
    >
      <div>
        {/* Dish Image */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
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

          {/* Sold Out Badge Overlay */}
          {!item.is_available && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow">
                Sold Out
              </span>
            </div>
          )}

          {/* Category Tag & Spice Level */}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            {renderSpiceIndicator()}
          </div>
        </div>

        {/* Content Details */}
        <div className="p-3.5 space-y-1.5">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-orange-600 transition">
              {item.name}
            </h3>
          </div>

          {item.name_alt && (
            <div className="text-[11px] font-medium text-slate-400 font-sans">
              {item.name_alt}
            </div>
          )}

          {item.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Pricing & Add Button Footer */}
      <div className="p-3.5 pt-0 flex items-center justify-between border-t border-slate-100/80 mt-2">
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Price</span>
          <span className="text-sm font-extrabold text-slate-900">
            {currencySymbol} {Number(item.base_price).toLocaleString()}
          </span>
        </div>

        {item.is_available ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{hasModifiers ? 'Customize' : 'Add'}</span>
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">
            Unavailable
          </span>
        )}
      </div>
    </div>
  );
};

export default MenuCard;
