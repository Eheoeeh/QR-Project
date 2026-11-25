import React, { useState } from 'react';
import { Order, RestaurantSettings, SessionStatus } from '../../types';
import {
  calculateBill,
  calculateEqualSplit,
  calculateItemizedSplit,
  ItemizedGuestClaim
} from '../../utils/billCalculator';
import {
  X,
  Receipt,
  Users,
  CheckSquare,
  Plus,
  Minus,
  Check,
  UserPlus,
  Clock,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Share2,
  RotateCcw
} from 'lucide-react';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableLabel: string;
  orders: Order[];
  settings: RestaurantSettings | null;
  cartItemCount?: number;
  sessionStatus?: SessionStatus;
  onOpenCart?: () => void;
  onPayCash?: () => Promise<void>;
}

type SplitMode = 'FULL' | 'EQUAL' | 'ITEMIZED';

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  tableLabel,
  orders,
  settings,
  cartItemCount = 0,
  sessionStatus = 'OPEN',
  onOpenCart,
  onPayCash
}) => {
  const [splitMode, setSplitMode] = useState<SplitMode>('FULL');
  const [equalGuestCount, setEqualGuestCount] = useState<number>(3);
  const [isRequestingCash, setIsRequestingCash] = useState<boolean>(false);

  // Itemized Split State
  const [guests, setGuests] = useState<string[]>(['Person 1', 'Person 2']);
  const [activeGuestIdx, setActiveGuestIdx] = useState<number>(0);
  const [newGuestName, setNewGuestName] = useState<string>('');
  const [showAddGuestInput, setShowAddGuestInput] = useState<boolean>(false);

  // Claim map: key = `${guestIdx}_${orderItemId}`, value = quantity claimed
  const [claimMap, setClaimMap] = useState<Record<string, number>>({});

  // Shared item map: orderItemId -> array of guest indices sharing this dish
  const [sharedItemMap, setSharedItemMap] = useState<Record<string, number[]>>({});
  // Which item currently has its "Split / Share" dropdown expanded
  const [sharingDishId, setSharingDishId] = useState<string | null>(null);

  if (!isOpen) return null;

  const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const allOrderItems = validOrders.flatMap((o) => o.order_items || []);

  const taxPercent = settings?.tax_percent ?? 16;
  const currencySymbol = settings?.currency_symbol || 'Rs.';
  const billSummary = calculateBill(allOrderItems, taxPercent);

  // Equal Split calculation
  const equalShares = calculateEqualSplit(billSummary.grandTotal, equalGuestCount);

  // Helper: check if an item is currently shared
  const isItemShared = (itemId: string) =>
    !!(sharedItemMap[itemId] && sharedItemMap[itemId].length > 0);

  // Transform claimMap & sharedItemMap into ItemizedGuestClaim array
  const itemizedClaims: ItemizedGuestClaim[] = guests.map((guestLabel, gIdx) => {
    const claimedItems: {
      orderItemId: string;
      itemName: string;
      unitPrice: number;
      quantityClaimed: number;
    }[] = [];

    allOrderItems.forEach((item) => {
      const isShared = isItemShared(item.id);

      if (isShared) {
        const sharingGuests = sharedItemMap[item.id] || [];
        if (sharingGuests.includes(gIdx)) {
          const shareCount = sharingGuests.length;
          // Calculate proportional share (e.g. 0.5 for 2 diners, 0.333 for 3 diners)
          const baseShare = Math.floor((item.quantity / shareCount) * 1000) / 1000;
          const remainderThousandths = Math.round(
            (item.quantity - baseShare * shareCount) * 1000
          );
          const shareIndex = sharingGuests.indexOf(gIdx);
          const qty =
            shareIndex < remainderThousandths
              ? Math.round((baseShare + 0.001) * 1000) / 1000
              : baseShare;

          const shareLabel =
            shareCount === 2
              ? `${item.item_name} (Shared 50/50)`
              : `${item.item_name} (Shared 1/${shareCount})`;

          claimedItems.push({
            orderItemId: item.id,
            itemName: shareLabel,
            unitPrice: Number(item.unit_price),
            quantityClaimed: qty
          });
        }
      } else {
        const key = `${gIdx}_${item.id}`;
        const qty = claimMap[key] || 0;
        if (qty > 0) {
          claimedItems.push({
            orderItemId: item.id,
            itemName: item.item_name,
            unitPrice: Number(item.unit_price),
            quantityClaimed: qty
          });
        }
      }
    });

    return {
      guestLabel,
      items: claimedItems
    };
  });

  const itemizedSplitResult = calculateItemizedSplit(allOrderItems, itemizedClaims, taxPercent);

  // Helper to handle claiming an item for active guest (integer portions)
  const handleToggleClaimItem = (orderItemId: string, maxQty: number) => {
    // If currently shared, clear shared mode first
    if (isItemShared(orderItemId)) {
      handleClearDishShare(orderItemId);
    }

    const key = `${activeGuestIdx}_${orderItemId}`;
    const currentClaimed = claimMap[key] || 0;

    // Total claimed by other guests
    let otherClaimed = 0;
    guests.forEach((_, idx) => {
      if (idx !== activeGuestIdx) {
        otherClaimed += claimMap[`${idx}_${orderItemId}`] || 0;
      }
    });

    const availableToClaim = Math.max(0, maxQty - otherClaimed);

    if (currentClaimed < availableToClaim) {
      setClaimMap((prev) => ({ ...prev, [key]: currentClaimed + 1 }));
    } else {
      const updated = { ...claimMap };
      delete updated[key];
      setClaimMap(updated);
    }
  };

  // Helper to decrement a claim
  const handleDecrementClaim = (orderItemId: string) => {
    const key = `${activeGuestIdx}_${orderItemId}`;
    const current = claimMap[key] || 0;
    if (current > 1) {
      setClaimMap((prev) => ({ ...prev, [key]: current - 1 }));
    } else {
      const updated = { ...claimMap };
      delete updated[key];
      setClaimMap(updated);
    }
  };

  // Toggle guest in shared dish
  const handleToggleGuestInShare = (itemId: string, guestIdx: number) => {
    const currentList = sharedItemMap[itemId] || [];
    let updated: number[];
    if (currentList.includes(guestIdx)) {
      updated = currentList.filter((idx) => idx !== guestIdx);
    } else {
      updated = [...currentList, guestIdx].sort((a, b) => a - b);
    }

    // Clear individual claimMap entries for this item so it doesn't double-count
    const newClaimMap = { ...claimMap };
    guests.forEach((_, idx) => {
      delete newClaimMap[`${idx}_${itemId}`];
    });
    setClaimMap(newClaimMap);

    if (updated.length === 0) {
      const newSharedMap = { ...sharedItemMap };
      delete newSharedMap[itemId];
      setSharedItemMap(newSharedMap);
    } else {
      setSharedItemMap({ ...sharedItemMap, [itemId]: updated });
    }
  };

  // Split dish equally with ALL diners
  const handleSplitDishWithAll = (itemId: string) => {
    const allIndices = guests.map((_, idx) => idx);
    const newClaimMap = { ...claimMap };
    guests.forEach((_, idx) => {
      delete newClaimMap[`${idx}_${itemId}`];
    });
    setClaimMap(newClaimMap);
    setSharedItemMap({ ...sharedItemMap, [itemId]: allIndices });
  };

  // Clear sharing on a dish
  const handleClearDishShare = (itemId: string) => {
    const newSharedMap = { ...sharedItemMap };
    delete newSharedMap[itemId];
    setSharedItemMap(newSharedMap);
  };

  // Add new guest
  const handleAddGuest = () => {
    const name = newGuestName.trim() || `Person ${guests.length + 1}`;
    setGuests([...guests, name]);
    setActiveGuestIdx(guests.length);
    setNewGuestName('');
    setShowAddGuestInput(false);
  };

  // Remove guest (only if > 2 guests)
  const handleRemoveGuest = (idxToRemove: number) => {
    if (guests.length <= 2) return;
    const newGuests = guests.filter((_, idx) => idx !== idxToRemove);
    setGuests(newGuests);

    // Clean up claimMap and adjust indices
    const newClaimMap: Record<string, number> = {};
    Object.entries(claimMap).forEach(([k, v]) => {
      const [gIdxStr, orderItemId] = k.split('_');
      const gIdx = parseInt(gIdxStr, 10);
      if (gIdx < idxToRemove) {
        newClaimMap[`${gIdx}_${orderItemId}`] = v;
      } else if (gIdx > idxToRemove) {
        newClaimMap[`${gIdx - 1}_${orderItemId}`] = v;
      }
    });
    setClaimMap(newClaimMap);

    // Clean up sharedItemMap
    const newSharedMap: Record<string, number[]> = {};
    Object.entries(sharedItemMap).forEach(([itemId, indices]) => {
      const updated = indices
        .filter((idx) => idx !== idxToRemove)
        .map((idx) => (idx > idxToRemove ? idx - 1 : idx));
      if (updated.length > 0) {
        newSharedMap[itemId] = updated;
      }
    });
    setSharedItemMap(newSharedMap);

    setActiveGuestIdx((prev) => Math.min(prev, newGuests.length - 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Bill & Bill Splitting</h2>
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

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {validOrders.length === 0 || allOrderItems.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Orders Placed Yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Add dishes from the menu and tap Place Order to start your live bill.
              </p>

              {cartItemCount > 0 && onOpenCart && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenCart}
                    className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>View Shared Cart ({cartItemCount} items)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Grand Total Highlight Banner */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400 block">
                      Overall Grand Total
                    </span>
                    <span className="text-2xl font-black text-white">
                      {currencySymbol} {billSummary.grandTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right text-xs space-y-0.5 text-slate-400">
                    <div>Subtotal: {currencySymbol} {billSummary.subtotal.toLocaleString()}</div>
                    <div>Tax ({taxPercent}%): {currencySymbol} {billSummary.taxAmount.toLocaleString()}</div>
                  </div>
                </div>

                {/* Three-Way Split Segmented Switcher */}
                <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-xl text-xs font-bold text-center">
                  <button
                    type="button"
                    onClick={() => setSplitMode('FULL')}
                    className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      splitMode === 'FULL'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Full Bill</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitMode('EQUAL')}
                    className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      splitMode === 'EQUAL'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Split Equally</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitMode('ITEMIZED')}
                    className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      splitMode === 'ITEMIZED'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Split by Item</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: Full Bill Breakdown Grouped by Order Round */}
              {splitMode === 'FULL' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      All Placed Orders ({validOrders.length} Round{validOrders.length > 1 ? 's' : ''})
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {allOrderItems.reduce((acc, i) => acc + i.quantity, 0)} total items
                    </span>
                  </div>

                  <div className="space-y-3">
                    {validOrders.map((order, orderIdx) => {
                      const orderItems = order.order_items || [];
                      const roundSubtotal = orderItems.reduce(
                        (sum, item) => sum + (Number(item.unit_price) * item.quantity),
                        0
                      );

                      return (
                        <div
                          key={order.id}
                          className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-orange-600/10 text-orange-600 font-black text-[11px] flex items-center justify-center">
                                {orderIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                Round #{orderIdx + 1}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </span>
                            </div>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {order.status}
                            </span>
                          </div>

                          <div className="divide-y divide-slate-200/60">
                            {orderItems.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="py-2 first:pt-0 last:pb-0 flex justify-between items-start text-xs"
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span className="text-orange-600 shrink-0 font-extrabold">{item.quantity}x</span>
                                    <span className="truncate">{item.item_name}</span>
                                  </div>
                                  {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                    <div className="text-[10px] text-orange-600 pl-4">
                                      + {item.selected_modifiers.map((m) => m.name).join(', ')}
                                    </div>
                                  )}
                                  {item.note && (
                                    <div className="text-[10px] text-slate-400 italic pl-4">
                                      "{item.note}"
                                    </div>
                                  )}
                                </div>

                                <span className="font-black text-slate-900 shrink-0">
                                  {currencySymbol} {(Number(item.unit_price) * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-200/70 flex justify-between text-xs font-semibold text-slate-600">
                            <span>Round Subtotal</span>
                            <span>{currencySymbol} {roundSubtotal.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Totals Box */}
                  <div className="bg-slate-100 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-900">{currencySymbol} {billSummary.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sales Tax ({taxPercent}%)</span>
                      <span className="font-bold text-slate-900">{currencySymbol} {billSummary.taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-black text-slate-900">
                      <span>Grand Total</span>
                      <span className="text-orange-600">{currencySymbol} {billSummary.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: Split Equally */}
              {splitMode === 'EQUAL' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Guest Count Stepper */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">Number of Diners</span>
                      <span className="text-[11px] text-slate-400">Divide bill evenly (2 to 8 guests)</span>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setEqualGuestCount(Math.max(2, equalGuestCount - 1))}
                        disabled={equalGuestCount <= 2}
                        className="w-8 h-8 rounded-lg bg-slate-100 disabled:opacity-30 text-slate-800 flex items-center justify-center font-bold transition active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-16 text-center font-black text-sm text-slate-900">
                        {equalGuestCount} Diners
                      </span>

                      <button
                        type="button"
                        onClick={() => setEqualGuestCount(Math.min(8, equalGuestCount + 1))}
                        disabled={equalGuestCount >= 8}
                        className="w-8 h-8 rounded-lg bg-slate-100 disabled:opacity-30 text-slate-800 flex items-center justify-center font-bold transition active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Equal Shares List (Stacked on Mobile, Side-by-Side on Desktop) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {equalShares.map((share, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center">
                            #{idx + 1}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              Guest {idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-400">Equal 1/{equalGuestCount} share</span>
                          </div>
                        </div>

                        <span className="text-sm font-black text-orange-600">
                          {currencySymbol} {share.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-center text-[11px] text-slate-400 bg-slate-50 py-2 rounded-xl border border-slate-200/60">
                    Exact equal split • Total sum = {currencySymbol} {billSummary.grandTotal.toLocaleString()}
                  </div>
                </div>
              )}

              {/* MODE 3: Split by Item (with 50/50 & multi-diner shared dishes) */}
              {splitMode === 'ITEMIZED' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Guest Tabs Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        1. Select Person to Assign Dishes
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddGuestInput(!showAddGuestInput)}
                        className="text-xs font-bold text-orange-600 hover:text-orange-500 inline-flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Person</span>
                      </button>
                    </div>

                    {showAddGuestInput && (
                      <div className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <input
                          type="text"
                          placeholder="Enter diner name (e.g. Ali)"
                          value={newGuestName}
                          onChange={(e) => setNewGuestName(e.target.value)}
                          maxLength={20}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddGuest}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs shadow-xs"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {guests.map((g, idx) => {
                        const isActive = idx === activeGuestIdx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setActiveGuestIdx(idx)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 select-none ${
                              isActive
                                ? 'bg-orange-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                            }`}
                          >
                            <span>{g}</span>
                            {guests.length > 2 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveGuest(idx);
                                }}
                                title="Remove Diner"
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] transition ${
                                  isActive
                                    ? 'bg-white/20 hover:bg-white text-orange-600'
                                    : 'bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-600'
                                }`}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tap Ordered Items to Claim or Share */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        2. Tap to Claim or Share for {guests[activeGuestIdx]}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Tap "Split" to share any dish 50/50
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {allOrderItems.map((item) => {
                        const isShared = isItemShared(item.id);
                        const sharedGuests = sharedItemMap[item.id] || [];
                        const isSharingExpanded = sharingDishId === item.id;
                        const key = `${activeGuestIdx}_${item.id}`;
                        const qtyClaimedByActive = isShared
                          ? sharedGuests.includes(activeGuestIdx)
                            ? Math.round((item.quantity / sharedGuests.length) * 100) / 100
                            : 0
                          : claimMap[key] || 0;

                        // Total claimed by everyone
                        let totalClaimed = 0;
                        if (isShared) {
                          totalClaimed = item.quantity;
                        } else {
                          guests.forEach((_, idx) => {
                            totalClaimed += claimMap[`${idx}_${item.id}`] || 0;
                          });
                        }

                        const unclaimedCount = Math.max(0, item.quantity - totalClaimed);
                        const isFullyClaimed = unclaimedCount === 0;

                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              isShared
                                ? 'border-purple-300 bg-purple-50/40 shadow-2xs'
                                : qtyClaimedByActive > 0
                                ? 'border-orange-400 bg-orange-50/50 shadow-2xs'
                                : 'border-slate-200/80 bg-white'
                            }`}
                          >
                            <div className="p-3.5 flex items-center justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <div className="font-extrabold text-xs text-slate-900 truncate">
                                  {item.quantity}x {item.item_name}
                                </div>

                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                  <span>{currencySymbol} {Number(item.unit_price).toLocaleString()} each</span>
                                  <span>•</span>
                                  {isShared ? (
                                    <span className="text-purple-700 font-extrabold inline-flex items-center gap-1">
                                      <Share2 className="w-3 h-3 text-purple-600" />
                                      <span>
                                        Shared by {sharedGuests.map((idx) => guests[idx]).join(' & ')} (1/{sharedGuests.length} each)
                                      </span>
                                    </span>
                                  ) : isFullyClaimed ? (
                                    <span className="text-emerald-600 font-bold">All {item.quantity} claimed</span>
                                  ) : (
                                    <span className="text-amber-600 font-bold">{unclaimedCount} unclaimed</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Split / Share Dish Button */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSharingDishId(isSharingExpanded ? null : item.id)
                                  }
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                                    isShared
                                      ? 'bg-purple-100 border-purple-300 text-purple-800'
                                      : isSharingExpanded
                                      ? 'bg-slate-800 text-white border-slate-800'
                                      : 'bg-slate-100 hover:bg-purple-50 border-slate-200 text-slate-700 hover:text-purple-700'
                                  }`}
                                >
                                  <Share2 className="w-3 h-3" />
                                  <span>{isShared ? 'Edit Split' : 'Split'}</span>
                                </button>

                                {/* Direct Full Claim Controls (when not shared) */}
                                {!isShared && (
                                  <>
                                    {qtyClaimedByActive > 0 ? (
                                      <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-orange-200 shadow-2xs">
                                        <button
                                          type="button"
                                          onClick={() => handleDecrementClaim(item.id)}
                                          className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-5 text-center font-black text-xs text-orange-600">
                                          {qtyClaimedByActive}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={unclaimedCount <= 0}
                                          onClick={() =>
                                            handleToggleClaimItem(item.id, item.quantity)
                                          }
                                          className="w-6 h-6 rounded-lg bg-orange-600 disabled:opacity-30 text-white flex items-center justify-center font-bold"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={unclaimedCount <= 0}
                                        onClick={() =>
                                          handleToggleClaimItem(item.id, item.quantity)
                                        }
                                        className="py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-30 text-white text-xs font-bold shadow-xs transition"
                                      >
                                        Claim
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Expandable Dish Sharing Panel */}
                            {isSharingExpanded && (
                              <div className="p-3 bg-purple-50/80 border-t border-purple-200 space-y-2.5 animate-fade-in text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-purple-950 flex items-center gap-1.5">
                                    <Share2 className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Split "{item.item_name}" across diners:</span>
                                  </span>
                                  {isShared && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearDishShare(item.id)}
                                      className="text-[11px] text-rose-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Clear Split</span>
                                    </button>
                                  )}
                                </div>

                                {/* Diners selection pills */}
                                <div className="flex flex-wrap gap-1.5">
                                  {guests.map((g, gIdx) => {
                                    const isSelected = sharedGuests.includes(gIdx);
                                    return (
                                      <button
                                        key={gIdx}
                                        type="button"
                                        onClick={() => handleToggleGuestInShare(item.id, gIdx)}
                                        className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs ${
                                          isSelected
                                            ? 'bg-purple-600 text-white shadow-xs'
                                            : 'bg-white hover:bg-purple-100 text-purple-900 border border-purple-200'
                                        }`}
                                      >
                                        <div
                                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                                            isSelected
                                              ? 'bg-white text-purple-600 font-black'
                                              : 'border border-purple-400'
                                          }`}
                                        >
                                          {isSelected ? '✓' : ''}
                                        </div>
                                        <span>{g}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Shortcut & Calculation Info */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-200/60 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleSplitDishWithAll(item.id)}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 font-extrabold text-[11px] transition shadow-2xs"
                                  >
                                    👥 Split with All ({guests.length} Diners)
                                  </button>

                                  {sharedGuests.length > 0 ? (
                                    <span className="text-[11px] font-bold text-purple-800">
                                      Split {sharedGuests.length}-way: {currencySymbol}{' '}
                                      {Math.round(
                                        (Number(item.unit_price) * item.quantity) / sharedGuests.length
                                      ).toLocaleString()}{' '}
                                      each
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-purple-600">
                                      Select 2 or more diners above
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress Indicator for Unclaimed Items */}
                  {itemizedSplitResult.isFullyClaimed ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100% of bill claimed! All items and shared portions assigned.</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {itemizedSplitResult.unclaimedItems.length} dish{itemizedSplitResult.unclaimedItems.length > 1 ? 'es' : ''} partially unclaimed ({currencySymbol} {(billSummary.grandTotal - itemizedSplitResult.claimedGrandTotal).toLocaleString()} remaining).
                      </span>
                    </div>
                  )}

                  {/* Calculated Itemized Breakdown Cards (Stacked on Mobile, Side-by-Side on Desktop) */}
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      3. Individual Shares (Itemized + Proportional Tax)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {itemizedSplitResult.shares.map((share, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-slate-900">{share.guestLabel}</span>
                            <span className="font-black text-sm text-orange-600">
                              {currencySymbol} {share.grandTotal.toLocaleString()}
                            </span>
                          </div>

                          {share.items.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">No dishes claimed yet</p>
                          ) : (
                            <div className="text-[11px] text-slate-500 space-y-0.5">
                              {share.items.map((line, lIdx) => (
                                <div key={lIdx} className="flex justify-between">
                                  <span>{line.quantityClaimed}x {line.itemName}</span>
                                  <span>{currencySymbol} {line.lineTotal.toLocaleString()}</span>
                                </div>
                              ))}
                              <div className="pt-1 text-[10px] text-slate-400 flex justify-between border-t border-slate-100">
                                <span>Tax ({taxPercent}%): {currencySymbol} {share.taxAmount.toLocaleString()}</span>
                                <span className="font-semibold text-slate-700">Subtotal: {currencySymbol} {share.subtotal.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer: Scene 6 Pay Cash & Settlement Confirmation */}
        {allOrderItems.length > 0 && (
          <div className="p-4 pb-6 sm:pb-4 border-t border-slate-100 bg-white shrink-0">
            {sessionStatus === 'BILL_REQUESTED' || isRequestingCash ? (
              <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3.5 text-center space-y-2 animate-fade-in">
                <div className="w-9 h-9 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                    Waiter Notified to Collect Payment
                  </h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    A waiter is on the way to {tableLabel} to collect cash and close your bill.
                  </p>
                </div>

                {/* Split Summary Reminder */}
                <div className="pt-2 border-t border-emerald-200/60 text-xs font-bold text-emerald-900">
                  {splitMode === 'FULL' && (
                    <div className="flex items-center justify-between">
                      <span>Total Bill to Settle:</span>
                      <span className="text-sm font-black text-emerald-700">
                        {currencySymbol} {billSummary.grandTotal.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {splitMode === 'EQUAL' && (
                    <div className="flex items-center justify-between">
                      <span>Equal Share ({equalGuestCount} Diners):</span>
                      <span className="text-sm font-black text-emerald-700">
                        {currencySymbol} {equalShares[0].toLocaleString()} each
                      </span>
                    </div>
                  )}

                  {splitMode === 'ITEMIZED' && (
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center justify-between">
                        <span>Itemized Bill Total:</span>
                        <span className="text-sm font-black text-emerald-700">
                          {currencySymbol} {billSummary.grandTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {itemizedSplitResult.shares
                          .filter((s) => s.grandTotal > 0)
                          .map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-emerald-100/90 text-emerald-900 text-[11px] font-black"
                            >
                              {s.guestLabel}: {currencySymbol} {s.grandTotal.toLocaleString()}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isRequestingCash}
                  onClick={async () => {
                    if (onPayCash) {
                      setIsRequestingCash(true);
                      try {
                        await onPayCash();
                      } catch {
                        setIsRequestingCash(false);
                      }
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  <Banknote className="w-5 h-5" />
                  <span>
                    {isRequestingCash
                      ? 'Notifying Waiter...'
                      : `Pay Cash • ${currencySymbol} ${billSummary.grandTotal.toLocaleString()}`}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Tapping Pay Cash alerts the waiter to collect cash at your table.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillModal;
