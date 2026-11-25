import React, { useState } from 'react';
import { CartItem } from '../../types';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface SharedCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  currencySymbol?: string;
  tableLabel: string;
  onUpdateQuantity: (cartItemId: string, newQuantity: number) => Promise<void>;
  onRemoveItem: (cartItemId: string) => Promise<void>;
  onPlaceOrder: () => Promise<void>;
}

export const SharedCartDrawer: React.FC<SharedCartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  currencySymbol = 'Rs.',
  tableLabel,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const cartSubtotal = cartItems.reduce((acc, item) => {
    const base = Number(item.menu_item?.base_price) || 0;
    const modDelta = (item.selected_modifiers || []).reduce(
      (sum, m) => sum + (Number(m.price_delta) || 0),
      0
    );
    return acc + (base + modDelta) * item.quantity;
  }, 0);

  const handlePlaceOrderClick = async () => {
    if (isSubmitting || cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await onPlaceOrder();
      onClose();
    } catch (err) {
      console.error('Failed to submit order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Shared Table Cart</h2>
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

        {/* Scrollable Cart Items List */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {cartItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#18181B] border border-white/10 text-zinc-500 flex items-center justify-center mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Your Shared Cart is Empty</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Add dishes from the menu to build your table&apos;s order. Everyone at this table sees updates live.
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const basePrice = Number(item.menu_item?.base_price) || 0;
              const modDelta = (item.selected_modifiers || []).reduce(
                (sum, m) => sum + (Number(m.price_delta) || 0),
                0
              );
              const lineTotal = (basePrice + modDelta) * item.quantity;

              return (
                <div
                  key={item.id}
                  className="bg-[#18181B] rounded-2xl p-3.5 border border-white/[0.08] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-bold text-sm text-white leading-snug">
                        {item.menu_item?.name || 'Dish Item'}
                      </h4>

                      {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                        <div className="text-[11px] text-[#FF5B22] font-semibold">
                          + {item.selected_modifiers.map((m) => m.name).join(', ')}
                        </div>
                      )}

                      {item.note && (
                        <div className="text-[11px] text-amber-300/90 italic">
                          &ldquo;{item.note}&rdquo;
                        </div>
                      )}
                    </div>

                    <span className="font-extrabold text-sm text-white shrink-0 tabular-nums">
                      {currencySymbol} {lineTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] text-zinc-400">
                      {currencySymbol} {(basePrice + modDelta).toLocaleString()} each
                    </span>

                    <div className="flex items-center gap-2 bg-[#111114] p-1 rounded-full border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            onUpdateQuantity(item.id, item.quantity - 1);
                          } else {
                            onRemoveItem(item.id);
                          }
                        }}
                        className="w-7 h-7 rounded-full bg-[#1E1E24] text-white flex items-center justify-center transition active:scale-90"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span className="w-5 text-center font-bold text-xs text-white tabular-nums">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-[#FF5B22] text-white flex items-center justify-center transition active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pinned Bottom Action Bar */}
        {cartItems.length > 0 && (
          <div className="p-4 pb-6 sm:pb-4 border-t border-white/10 bg-[#121215] shrink-0 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-medium">Cart Subtotal</span>
              <span className="font-black text-base text-white tabular-nums">
                {currencySymbol} {cartSubtotal.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={handlePlaceOrderClick}
              className="w-full py-3.5 px-5 rounded-full bg-[#FF5B22] hover:bg-[#ff6d3a] disabled:opacity-40 text-white font-extrabold text-sm shadow-lg shadow-orange-950/50 transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <span>Submitting to Kitchen...</span>
              ) : (
                <>
                  <span>Place Order for Table</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedCartDrawer;
