import { supabase } from './supabaseClient';
import { CartItem, OrderStatus } from '../types';

export const orderService = {
  /**
   * Fetches all available menu catalog items
   */
  async getMenuItems() {
    return await supabase
      .from('menu_items')
      .select('*')
      .order('sort_order', { ascending: true });
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
   * Submits active cart items as an immutable order
   */
  async submitOrder(sessionId: string, items: CartItem[]) {
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

    // 2. Snapshot order items
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

    // 3. Clear session cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId);

    return order;
  }
};
