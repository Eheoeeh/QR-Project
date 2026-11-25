import React from 'react';
import { MenuItem } from '../../types';
import { Flame, ShoppingCart, Sparkles } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  currencySymbol?: string;
  onSelect: (item: MenuItem) => void;
  variant?: 'list' | 'featured';
}

export const MenuCard: React.FC<MenuCardProps> = ({
  item,
  currencySymbol = 'Rs.',
  onSelect,
  variant = 'list'
}) => {
  const hasModifiers = item.modifiers && item.modifiers.length > 0;

  const renderSpicePill = () => {
    if (!item.spice_level || item.spice_level <= 0) return null;
    return (
      <span
        title={`Spice level: ${item.spice_level}/3`}
        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full"
      >
        <Flame className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
        {item.spice_level === 1 ? 'Mild' : item.spice_level === 2 ? 'Medium' : 'Hot'}
      </span>
    );
  };

  // Horizontal Featured Carousel Card (Image 1 "Super Deals" style)
  if (variant === 'featured') {
    return (
      <div
        onClick={() => item.is_available && onSelect(item)}
        className={`group min-w-[235px] max-w-[245px] bg-[#18181B] rounded-2xl border border-white/[0.08] overflow-hidden shrink-0 flex flex-col justify-between transition-all duration-200 shadow-lg ${
          item.is_available
            ? 'hover:border-[#FF5B22]/60 cursor-pointer active:scale-[0.98]'
            : 'opacity-50 cursor-not-allowed select-none'
        }`}
      >
        {/* Top Photo */}
        <div className="relative h-32 w-full bg-[#121214] overflow-hidden">
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
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
              No photo
            </div>
          )}

          {/* Top Left Pill Badge */}
          {item.is_available ? (
            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#FF5B22] text-white text-[10px] font-extrabold shadow-md flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Chef&apos;s Pick
            </span>
          ) : (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center">
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Bottom Info */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-white text-sm leading-snug line-clamp-1 group-hover:text-[#FF5B22] transition">
              {item.name}
            </h3>
            <span className="text-sm font-black text-white shrink-0">
              {currencySymbol} {Number(item.base_price).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {renderSpicePill() || (
                <span className="text-[11px] text-zinc-400 truncate">
                  {hasModifiers ? 'Customizable' : item.category}
                </span>
              )}
            </div>

            {item.is_available && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item);
                }}
                className="px-3 py-1.5 rounded-full bg-[#FF5B22] hover:bg-[#ff6d3a] text-white text-[11px] font-extrabold shadow-md shadow-orange-950/40 transition active:scale-95 shrink-0"
              >
                Order Now
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Horizontal List Card (Image 5 "Hot Deals" style)
  return (
    <div
      onClick={() => item.is_available && onSelect(item)}
      className={`group relative bg-[#18181B] rounded-2xl border p-3 transition-all duration-200 flex gap-3.5 items-center justify-between shadow-md ${
        item.is_available
          ? 'border-white/[0.08] hover:border-[#FF5B22]/60 cursor-pointer active:scale-[0.99]'
          : 'border-white/[0.04] bg-[#141416] opacity-55 cursor-not-allowed select-none'
      }`}
    >
      {/* Left Square Photo Thumbnail */}
      <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#121214] shrink-0 border border-white/[0.06]">
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
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            No photo
          </div>
        )}

        {!item.is_available && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
            <span className="px-2 py-1 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow leading-none">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Center Details & Bottom Price + CTA Row */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm sm:text-base leading-snug truncate group-hover:text-[#FF5B22] transition">
              {item.name}
            </h3>
            {item.name_alt && (
              <div className="text-[11px] font-medium text-zinc-500 truncate">
                {item.name_alt}
              </div>
            )}
          </div>
          {renderSpicePill()}
        </div>

        {item.description && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm sm:text-base font-black text-white">
              {currencySymbol} {Number(item.base_price).toLocaleString()}
            </span>
            {hasModifiers && item.is_available && (
              <span className="text-[10px] text-orange-300 font-semibold bg-[#FF5B22]/15 px-2 py-0.5 rounded-full border border-[#FF5B22]/30 hidden xs:inline-block">
                Customizable
              </span>
            )}
          </div>

          {item.is_available ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FF5B22] hover:bg-[#ff6d3a] active:scale-90 text-white text-xs font-extrabold shadow-md shadow-orange-950/40 transition shrink-0"
              title={hasModifiers ? 'Customize' : 'Add to cart'}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          ) : (
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
