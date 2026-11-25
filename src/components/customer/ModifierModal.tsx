import React, { useState } from 'react';
import { MenuItem, Modifier } from '../../types';
import { ArrowLeft, Plus, Minus, Check, MessageSquare, Clock, Flame, Sparkles, ShoppingCart } from 'lucide-react';

interface ModifierModalProps {
  item: MenuItem | null;
  currencySymbol?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    selectedModifiers: Modifier[],
    note: string,
    quantity: number
  ) => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  item,
  currencySymbol = 'Rs.',
  isOpen,
  onClose,
  onAddToCart
}) => {
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedModifiers([]);
      setNote('');
      setQuantity(1);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const toggleModifier = (mod: Modifier) => {
    const exists = selectedModifiers.some((m) => m.name === mod.name);
    if (exists) {
      setSelectedModifiers(selectedModifiers.filter((m) => m.name !== mod.name));
    } else {
      setSelectedModifiers([...selectedModifiers, mod]);
    }
  };

  const modifierDeltaSum = selectedModifiers.reduce((acc, m) => acc + (Number(m.price_delta) || 0), 0);
  const unitPrice = Number(item.base_price) + modifierDeltaSum;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    onAddToCart(item, selectedModifiers, note.trim(), quantity);
    onClose();
  };

  const spiceLabel =
    item.spice_level === 1
      ? 'Mild Spice'
      : item.spice_level === 2
      ? 'Medium Spice'
      : item.spice_level === 3
      ? 'Hot Spice'
      : 'No Spice';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0F0F12] text-white rounded-t-[28px] sm:rounded-3xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable Modal Body with Full-Bleed Image Hero (Image 2 Style) */}
        <div className="overflow-y-auto flex-1 no-scrollbar">
          {/* Hero Photo Header */}
          <div className="relative h-56 sm:h-64 w-full bg-[#18181B]">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                No photo available
              </div>
            )}

            {/* Smooth Gradient Fade into Dark Onyx Body */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-[#0F0F12]/25 to-black/50" />

            {/* Floating Top Bar Controls */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition active:scale-90"
                aria-label="Back to menu"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-white/90 bg-black/45 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                Dish Detail
              </span>
              <div className="w-10" />
            </div>
          </div>

          <div className="px-5 pb-5 -mt-4 relative space-y-5">
            {/* Title & Bold Price */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white leading-tight">{item.name}</h2>
                {item.name_alt && (
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">{item.name_alt}</p>
                )}
              </div>
              <span className="text-xl font-black text-white shrink-0 tabular-nums">
                {currencySymbol} {Number(item.base_price).toLocaleString()}
              </span>
            </div>

            {/* Pill Info Chips (Image 2 style) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181B] border border-white/[0.08] text-xs font-semibold text-zinc-200">
                <Clock className="w-3.5 h-3.5 text-[#FF5B22]" />
                <span>15 – 25 min</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181B] border border-white/[0.08] text-xs font-semibold text-zinc-200">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{spiceLabel}</span>
              </span>
              {item.modifiers && item.modifiers.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181B] border border-white/[0.08] text-xs font-semibold text-zinc-200">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5B22]" />
                  <span>Customizable</span>
                </span>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Description</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {/* Selectable Modifiers */}
            {item.modifiers && item.modifiers.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Customize Add-ons
                  </span>
                  <span className="text-[11px] text-zinc-500 font-medium">Optional</span>
                </div>

                <div className="space-y-2">
                  {item.modifiers.map((mod, idx) => {
                    const isChecked = selectedModifiers.some((m) => m.name === mod.name);
                    return (
                      <label
                        key={idx}
                        onClick={() => toggleModifier(mod)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer select-none ${
                          isChecked
                            ? 'border-[#FF5B22] bg-[#FF5B22]/10'
                            : 'border-white/[0.08] hover:border-white/20 bg-[#18181B]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                              isChecked
                                ? 'bg-[#FF5B22] border-[#FF5B22] text-white'
                                : 'border-zinc-600 bg-transparent'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className="text-sm font-semibold text-white">
                            {mod.name}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-[#FF5B22]">
                          + {currencySymbol} {Number(mod.price_delta).toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Kitchen Note */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <MessageSquare className="w-3.5 h-3.5 text-[#FF5B22]" />
                <span>Special Kitchen Note</span>
              </div>
              <input
                type="text"
                placeholder="e.g. no onions, extra crispy, sauce on the side..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                className="w-full px-4 py-3 rounded-2xl bg-[#18181B] border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF5B22] transition"
              />
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar: Circular Qty Stepper + Full Orange Pill Add to Cart CTA (Image 2 Style) */}
        <div className="p-4 pb-6 sm:pb-4 border-t border-white/10 bg-[#121215] shrink-0 flex items-center gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 rounded-full bg-[#1E1E24] border border-white/10 disabled:opacity-35 text-white flex items-center justify-center transition active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-black text-base text-white tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-full bg-[#1E1E24] border border-white/10 text-white flex items-center justify-center transition active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart Pill */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-5 rounded-full bg-[#FF5B22] hover:bg-[#ff6d3a] text-white font-extrabold text-sm shadow-lg shadow-orange-950/50 transition flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              Add to Cart • {currencySymbol} {totalPrice.toLocaleString()}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifierModal;
