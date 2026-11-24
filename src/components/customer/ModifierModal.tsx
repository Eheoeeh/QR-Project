import React, { useState } from 'react';
import { MenuItem, Modifier } from '../../types';
import { X, Plus, Minus, Check, MessageSquare } from 'lucide-react';

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

  // Reset modal state whenever a new item is opened
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="relative p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{item.name}</h2>
            {item.name_alt && (
              <p className="text-xs text-slate-400 font-medium">{item.name_alt}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 space-y-5">
          {/* Item Photo & Description */}
          {item.image_url && (
            <div className="aspect-16/9 rounded-xl overflow-hidden bg-slate-100">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {item.description && (
            <p className="text-xs text-slate-600 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Modifiers Section */}
          {item.modifiers && item.modifiers.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Custom Add-ons & Modifiers
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Optional</span>
              </div>

              <div className="space-y-2">
                {item.modifiers.map((mod, idx) => {
                  const isChecked = selectedModifiers.some((m) => m.name === mod.name);
                  return (
                    <label
                      key={idx}
                      onClick={() => toggleModifier(mod)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? 'border-orange-500 bg-orange-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                            isChecked
                              ? 'bg-orange-600 border-orange-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                          {mod.name}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-orange-600">
                        + {currencySymbol} {Number(mod.price_delta).toLocaleString()}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preparation Special Instructions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Special Preparation Note</span>
            </div>
            <input
              type="text"
              placeholder="e.g. Extra crispy, no onions, dressing on side..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
            />
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quantity
            </span>
            <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg bg-white disabled:opacity-30 text-slate-800 flex items-center justify-center shadow-xs transition active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm text-slate-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-white text-slate-800 flex items-center justify-center shadow-xs transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-slate-100 bg-white shadow-lg">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-md transition flex items-center justify-between active:scale-[0.99]"
          >
            <span>Add to Table Cart</span>
            <span>
              {currencySymbol} {totalPrice.toLocaleString()}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifierModal;
