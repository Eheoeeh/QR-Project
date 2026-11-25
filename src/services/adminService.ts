import { supabase } from './supabaseClient';
import { MenuItem, RestaurantSettings, Table } from '../types';
import { sessionService } from './sessionService';

export interface AdminDashboardData {
  settings: RestaurantSettings;
  menuItems: MenuItem[];
  tables: Table[];
}

export const adminService = {
  /**
   * Fetches restaurant settings, full menu catalog, and all tables in parallel.
   */
  async getAdminData(): Promise<AdminDashboardData> {
    const [settings, menuRes, tablesRes] = await Promise.all([
      sessionService.getRestaurantSettings(),
      supabase.from('menu_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('tables').select('*').order('table_number', { ascending: true })
    ]);

    if (menuRes.error) throw menuRes.error;
    if (tablesRes.error) throw tablesRes.error;

    return {
      settings,
      menuItems: (menuRes.data || []) as MenuItem[],
      tables: (tablesRes.data || []) as Table[]
    };
  },

  /**
   * Flips a menu item between Available and Sold Out immediately.
   */
  async toggleMenuAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId);

    if (error) throw error;
  },

  /**
   * Updates the base price of a dish inline.
   */
  async updateMenuPrice(itemId: string, basePrice: number): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .update({ base_price: basePrice })
      .eq('id', itemId);

    if (error) throw error;
  },

  /**
   * Updates venue settings row (id = 1) such as Seating PIN toggle, tax %, or restaurant name.
   */
  async updateSettings(
    updates: Partial<Pick<RestaurantSettings, 'name' | 'tax_percent' | 'require_seating_pin'>>
  ): Promise<RestaurantSettings> {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data as RestaurantSettings;
  }
};
