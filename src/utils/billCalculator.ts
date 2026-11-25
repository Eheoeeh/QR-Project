import type { OrderItem } from '../types';

export interface BillSummary {
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  remainingBalance: number;
}

export interface ClaimedItemLine {
  orderItemId: string;
  itemName: string;
  unitPrice: number;
  quantityClaimed: number;
  lineTotal: number;
}

export interface ItemizedGuestClaim {
  guestLabel: string;
  items: {
    orderItemId: string;
    itemName: string;
    unitPrice: number;
    quantityClaimed: number; // accepts fractional quantities, e.g. 0.5 for half portions
  }[];
}

export interface ItemizedGuestShare {
  guestLabel: string;
  items: ClaimedItemLine[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
}

export interface ItemizedSplitResult {
  shares: ItemizedGuestShare[];
  claimedSubtotal: number;
  claimedTax: number;
  claimedGrandTotal: number;
  unclaimedItems: {
    orderItemId: string;
    itemName: string;
    unitPrice: number;
    unclaimedQuantity: number;
  }[];
  isFullyClaimed: boolean;
}

/**
 * Calculates effective unit price including base price and all selected priced modifiers.
 */
export function getEffectiveUnitPrice(
  basePrice: number,
  modifiers: { price_delta?: number }[] = []
): number {
  const modifierSum = modifiers.reduce((sum, m) => sum + (Number(m.price_delta) || 0), 0);
  return Math.round((Number(basePrice) + modifierSum) * 100) / 100;
}

/**
 * Ensures an OrderItem's unit price properly includes modifiers.
 * OrderItems already snapshot unit_price (base + modifiers), but this validates deltas.
 */
export function getOrderItemEffectivePrice(item: OrderItem): number {
  if (item.unit_price != null && !isNaN(Number(item.unit_price))) {
    return Number(item.unit_price);
  }
  return getEffectiveUnitPrice(0, item.selected_modifiers || []);
}

/**
 * Computes itemized subtotal, tax amount, and grand total for order items
 */
export function calculateBill(items: OrderItem[], taxPercent: number = 16, paidAmount: number = 0): BillSummary {
  const subtotal = items.reduce((sum, item) => {
    const effectivePrice = getOrderItemEffectivePrice(item);
    return sum + (effectivePrice * item.quantity);
  }, 0);

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const taxAmount = Math.round(((roundedSubtotal * taxPercent) / 100) * 100) / 100;
  const grandTotal = Math.round((roundedSubtotal + taxAmount) * 100) / 100;
  const remainingBalance = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);

  return {
    subtotal: roundedSubtotal,
    taxPercent,
    taxAmount,
    grandTotal,
    paidAmount,
    remainingBalance
  };
}

/**
 * Splits the grand total equally across guest count, distributing remainder cents.
 */
export function calculateEqualSplit(grandTotal: number, guestCount: number): number[] {
  if (guestCount <= 0) return [grandTotal];
  const perPerson = Math.floor((grandTotal / guestCount) * 100) / 100;
  const shares: number[] = Array(guestCount).fill(perPerson);
  
  // Distribute any remainder cents to the first guest(s)
  const remainder = Math.round((grandTotal - (perPerson * guestCount)) * 100) / 100;
  if (remainder > 0) {
    const centsToAdd = Math.round(remainder * 100);
    for (let i = 0; i < centsToAdd && i < shares.length; i++) {
      shares[i] = Math.round((shares[i] + 0.01) * 100) / 100;
    }
  }

  return shares;
}

/**
 * Computes itemized bill split for guests who claim specific dishes or fractions of dishes (e.g., 0.5 portion).
 * Reconciles any rounding penny drift between individual guest taxes and the total claimed tax.
 */
export function calculateItemizedSplit(
  allOrderItems: OrderItem[],
  claims: ItemizedGuestClaim[],
  taxPercent: number = 16
): ItemizedSplitResult {
  // Track claimed quantities per orderItemId with floating-point tolerance
  const claimedCountMap = new Map<string, number>();

  const shares: ItemizedGuestShare[] = claims.map((claim) => {
    const itemLines: ClaimedItemLine[] = claim.items.map((item) => {
      // Support fractional quantities (e.g. 0.5 portion of fries)
      const qty = Number(item.quantityClaimed);
      const price = Number(item.unitPrice);
      const lineTotal = Math.round(price * qty * 100) / 100;

      const current = claimedCountMap.get(item.orderItemId) || 0;
      claimedCountMap.set(item.orderItemId, current + qty);

      return {
        orderItemId: item.orderItemId,
        itemName: item.itemName,
        unitPrice: price,
        quantityClaimed: qty,
        lineTotal
      };
    });

    const subtotal = Math.round(itemLines.reduce((acc, line) => acc + line.lineTotal, 0) * 100) / 100;
    const initialTax = Math.round(((subtotal * taxPercent) / 100) * 100) / 100;
    const initialGrandTotal = Math.round((subtotal + initialTax) * 100) / 100;

    return {
      guestLabel: claim.guestLabel,
      items: itemLines,
      subtotal,
      taxAmount: initialTax,
      grandTotal: initialGrandTotal
    };
  });

  const claimedSubtotal = Math.round(shares.reduce((sum, s) => sum + s.subtotal, 0) * 100) / 100;
  const expectedTotalTax = Math.round(((claimedSubtotal * taxPercent) / 100) * 100) / 100;
  const sumGuestTaxes = Math.round(shares.reduce((sum, s) => sum + s.taxAmount, 0) * 100) / 100;

  // Reconcile penny drift: ensure sum of guest taxes precisely equals expectedTotalTax
  const taxDriftCents = Math.round((expectedTotalTax - sumGuestTaxes) * 100);
  if (taxDriftCents !== 0 && shares.length > 0) {
    // Only distribute penny adjustments to guests who actually claimed items (subtotal > 0),
    // sorted descending by subtotal
    const eligibleShares = shares
      .map((s, idx) => ({ idx, subtotal: s.subtotal }))
      .filter((s) => s.subtotal > 0)
      .sort((a, b) => b.subtotal - a.subtotal);

    if (eligibleShares.length > 0) {
      const step = taxDriftCents > 0 ? 0.01 : -0.01;
      let remainingCents = Math.abs(taxDriftCents);
      let i = 0;

      while (remainingCents > 0) {
        const targetIdx = eligibleShares[i % eligibleShares.length].idx;
        shares[targetIdx].taxAmount = Math.round((shares[targetIdx].taxAmount + step) * 100) / 100;
        shares[targetIdx].grandTotal = Math.round((shares[targetIdx].subtotal + shares[targetIdx].taxAmount) * 100) / 100;
        remainingCents--;
        i++;
        if (i >= eligibleShares.length * 20) break; // Safety brake
      }
    }
  }

  // Calculate unclaimed items with floating point tolerance
  const unclaimedItems = allOrderItems
    .map((item) => {
      const claimedQty = claimedCountMap.get(item.id) || 0;
      const rawUnclaimed = item.quantity - claimedQty;
      const unclaimedQuantity = rawUnclaimed > 0.0001 ? Math.round(rawUnclaimed * 1000) / 1000 : 0;

      return {
        orderItemId: item.id,
        itemName: item.item_name,
        unitPrice: getOrderItemEffectivePrice(item),
        unclaimedQuantity
      };
    })
    .filter((u) => u.unclaimedQuantity > 0);

  const finalClaimedTax = Math.round(shares.reduce((sum, s) => sum + s.taxAmount, 0) * 100) / 100;
  const finalClaimedGrandTotal = Math.round(shares.reduce((sum, s) => sum + s.grandTotal, 0) * 100) / 100;

  return {
    shares,
    claimedSubtotal,
    claimedTax: finalClaimedTax,
    claimedGrandTotal: finalClaimedGrandTotal,
    unclaimedItems,
    isFullyClaimed: unclaimedItems.length === 0
  };
}
