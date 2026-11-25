import React from 'react';
import { X } from 'lucide-react';

export interface MenuFilterState {
  maxPrice: number;
  spiceFilter: 'ALL' | 'MILD' | 'MEDIUM' | 'HOT';
  customizableOnly: boolean;
  availableOnly: boolean;
}

interface MenuFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: MenuFilterState;
  maxCatalogPrice: number;
  currencySymbol?: string;
  onApply: (next: MenuFilterState) => void;
  onClear: () => void;
}

export const MenuFilterModal: React.FC<MenuFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  maxCatalogPrice,
  currencySymbol = 'Rs.',
  onApply,
  onClear
}) => {
  const [draft, setDraft] = React.useState<MenuFilterState>(filters);

  React.useEffect(() => {
    if (isOpen) {
      setDraft(filters);
    }
  }, [isOpen, filters]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0F0F12] text-white rounded-t-[28px] sm:rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Image 4 style) */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1E1E24] hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-base font-bold text-white">Filter</h2>
          <div className="w-8" />
        </div>

        <div className="p-5 space-y-6">
          {/* Price Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Max Price</span>
              <span className="text-xs font-black text-[#FF5B22]">
                Up to {currencySymbol} {draft.maxPrice.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={Math.max(maxCatalogPrice, 2000)}
              step={50}
              value={draft.maxPrice}
              onChange={(e) => setDraft({ ...draft, maxPrice: Number(e.target.value) })}
              className="w-full accent-[#FF5B22] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
              <span>{currencySymbol} 200</span>
              <span>
                {currencySymbol} {Math.max(maxCatalogPrice, 2000).toLocaleString()}+
              </span>
            </div>
          </div>

          {/* Spice Level Pills */}
          <div className="space-y-2.5">
            <span className="text-sm font-bold text-white block">Spice Level</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'ALL', label: 'All Dishes' },
                  { id: 'MILD', label: 'Mild' },
                  { id: 'MEDIUM', label: 'Medium' },
                  { id: 'HOT', label: 'Hot 🔥' }
                ] as const
              ).map((opt) => {
                const active = draft.spiceFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, spiceFilter: opt.id })}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
                      active
                        ? 'border-[#FF5B22] bg-[#FF5B22]/15 text-[#FF5B22]'
                        : 'border-white/10 bg-[#18181B] text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Options */}
          <div className="space-y-2.5">
            <span className="text-sm font-bold text-white block">Preferences</span>
            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#18181B] border border-white/[0.08] cursor-pointer">
              <input
                type="checkbox"
                checked={draft.availableOnly}
                onChange={(e) => setDraft({ ...draft, availableOnly: e.target.checked })}
                className="w-4 h-4 accent-[#FF5B22] rounded"
              />
              <span className="text-xs font-semibold text-zinc-200">
                Hide Sold Out items
              </span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#18181B] border border-white/[0.08] cursor-pointer">
              <input
                type="checkbox"
                checked={draft.customizableOnly}
                onChange={(e) => setDraft({ ...draft, customizableOnly: e.target.checked })}
                className="w-4 h-4 accent-[#FF5B22] rounded"
              />
              <span className="text-xs font-semibold text-zinc-200">
                Customizable add-on dishes only
              </span>
            </label>
          </div>
        </div>

        {/* Footer Buttons (Image 4 style: Filled Orange Apply + Outlined Orange Clear All) */}
        <div className="p-4 pb-6 sm:pb-4 border-t border-white/10 bg-[#121215] space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="w-full py-3.5 rounded-full bg-[#FF5B22] hover:bg-[#ff6d3a] text-white font-extrabold text-sm shadow-lg shadow-orange-950/50 transition"
          >
            Apply Filter
          </button>
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="w-full py-3 rounded-full border border-[#FF5B22]/60 text-[#FF5B22] hover:bg-[#FF5B22]/10 font-bold text-sm transition"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuFilterModal;
