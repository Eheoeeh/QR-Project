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

  // Calculate cart subtotal
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
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Shared Table Cart</h2>
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

        {/* Scrollable Cart Items List */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {cartItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Your Shared Cart is Empty</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Add dishes from the menu to build your table's order. Anyone at this table can see and add dishes.
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
                  className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">
                        {item.menu_item?.name || 'Dish Item'}
                      </h4>

                      {/* Chosen Modifiers */}
                      {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                        <div className="text-[11px] text-orange-600 font-medium">
                          + {item.selected_modifiers.map((m) => m.name).join(', ')}
                        </div>
                      )}

                      {/* Custom Prep Note */}
                      {item.note && (
                        <div className="text-[11px] text-slate-400 italic">
                          "{item.note}"
                        </div>
                      )}
                    </div>

                    <span className="font-extrabold text-sm text-slate-900 shrink-0">
                      {currencySymbol} {lineTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity Stepper & Remove Action */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                      {currencySymbol} {(basePrice + modDelta).toLocaleString()} each
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              onUpdateQuantity(item.id, item.quantity - 1);
                            } else {
                              onRemoveItem(item.id);
                            }
                          }}
                          className="w-7 h-7 rounded-lg bg-white text-slate-800 flex items-center justify-center shadow-xs transition active:scale-90"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <span className="w-5 text-center font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-white text-slate-800 flex items-center justify-center shadow-xs transition active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pinned Sticky Bottom Action Bar with safe-area spacing */}
        {cartItems.length > 0 && (
          <div className="p-4 pb-6 sm:pb-4 border-t border-slate-100 bg-white shadow-xl shrink-0 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Cart Subtotal</span>
              <span className="font-extrabold text-base text-slate-900">
                {currencySymbol} {cartSubtotal.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={handlePlaceOrderClick}
              className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-[0.99]"
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
