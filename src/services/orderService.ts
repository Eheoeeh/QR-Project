import { supabase } from './supabaseClient';
import { CartItem, OrderStatus, Modifier } from '../types';

export const orderService = {
  /**
   * Fetches all menu catalog items ordered by sort_order
   */
  async getMenuItems() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Fetches all current cart items for a session, joining menu item details
   */
  async getCartItems(sessionId: string): Promise<CartItem[]> {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, menu_item:menu_items(*)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching cart items:', error);
      return [];
    }
    return (data as CartItem[]) || [];
  },

  /**
   * Adds an item with modifiers to the shared table cart.
   * If an identical item + modifiers + note already exists, merges quantity.
   */
  async addToCart(
    sessionId: string,
    menuItemId: string,
    quantity: number,
    selectedModifiers: Modifier[],
    note: string | null,
    addedByGuestId: string
  ) {
    // Check for identical existing cart line
    const { data: existingLines } = await supabase
      .from('cart_items')
      .select('*')
      .eq('session_id', sessionId)
      .eq('menu_item_id', menuItemId);

    const match = existingLines?.find((line) => {
      const sameNote = (line.note || '') === (note || '');
      const lineMods = (line.selected_modifiers || []) as Modifier[];
      const sameMods =
        lineMods.length === selectedModifiers.length &&
        selectedModifiers.every((sm) => lineMods.some((lm) => lm.name === sm.name));
      return sameNote && sameMods;
    });

    if (match) {
      return await supabase
        .from('cart_items')
        .update({ quantity: match.quantity + quantity })
        .eq('id', match.id);
    }

    return await supabase
      .from('cart_items')
      .insert({
        session_id: sessionId,
        menu_item_id: menuItemId,
        quantity,
        selected_modifiers: selectedModifiers,
        note: note || null,
        added_by_guest_id: addedByGuestId
      });
  },

  /**
   * Updates quantity of a cart line or deletes if quantity <= 0
   */
  async updateCartQuantity(cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      return await supabase.from('cart_items').delete().eq('id', cartItemId);
    }
    return await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
  },

  /**
   * Deletes a cart item line
   */
  async removeFromCart(cartItemId: string) {
    return await supabase.from('cart_items').delete().eq('id', cartItemId);
  },

  /**
   * Updates an order's status (RECEIVED -> PREPARING -> READY -> SERVED / CANCELLED)
   */
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
  },

  /**
   * Submits active cart items as an immutable order and queues a kitchen print job
   */
  async submitOrder(sessionId: string, items: CartItem[], tableNumber: number = 1) {
    // 1. Create order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        session_id: sessionId,
        status: 'RECEIVED'
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError || new Error('Failed to create order');
    }

    // 2. Snapshot order items with base price + modifiers
    const orderItemsPayload = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      item_name: item.menu_item?.name || 'Dish Item',
      unit_price: (item.menu_item?.base_price || 0) + 
        (item.selected_modifiers?.reduce((sum, m) => sum + (m.price_delta || 0), 0) || 0),
      quantity: item.quantity,
      selected_modifiers: item.selected_modifiers || [],
      note: item.note || null
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) {
      throw itemsError;
    }

    // 3. Queue Virtual Thermal KOT print job
    await supabase
      .from('print_jobs')
      .insert({
        session_id: sessionId,
        target: 'KITCHEN_KOT',
        payload: {
          order_id: order.id,
          order_number: order.order_number,
          table_number: tableNumber,
          items: orderItemsPayload,
          created_at: new Date().toISOString()
        },
        status: 'QUEUED'
      });

    // 4. Clear session cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId);

    return order;
  }
};
