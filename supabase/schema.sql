-- ==============================================================================
-- QR-Based Dining System — Prototype Schema, RLS Demo Policies & Seed Data
-- ==============================================================================

-- 1. Restaurant Settings
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#EA580C',
  currency_symbol TEXT DEFAULT 'Rs.',
  tax_percent NUMERIC(5,2) DEFAULT 16.00,
  require_seating_pin BOOLEAN DEFAULT false,
  kds_enabled BOOLEAN DEFAULT true
);

-- 2. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  name_alt TEXT,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  spice_level SMALLINT DEFAULT 0,
  modifiers JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- 3. Tables
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  table_number INTEGER UNIQUE NOT NULL,
  label TEXT NOT NULL,
  current_session_id UUID
);

-- 4. Table Sessions
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id INTEGER NOT NULL REFERENCES tables(id),
  session_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  seating_pin CHAR(4) NOT NULL,
  pin_verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Foreign key link back to tables
ALTER TABLE tables 
  DROP CONSTRAINT IF EXISTS fk_tables_session,
  ADD CONSTRAINT fk_tables_session 
  FOREIGN KEY (current_session_id) 
  REFERENCES table_sessions(id) 
  ON DELETE SET NULL;

-- 5. Shared Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  selected_modifiers JSONB DEFAULT '[]'::jsonb,
  note TEXT,
  added_by_guest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL UNIQUE,
  session_id UUID NOT NULL REFERENCES table_sessions(id),
  status TEXT DEFAULT 'RECEIVED',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  selected_modifiers JSONB DEFAULT '[]'::jsonb,
  note TEXT
);

-- 8. Service Requests (with anti-spam unique active request constraint)
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES table_sessions(id),
  type TEXT NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_request_per_type
ON service_requests (session_id, type)
WHERE status IN ('PENDING', 'ON_THE_WAY');

-- 9. Payments Ledger
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES table_sessions(id),
  split_label TEXT DEFAULT 'Full Bill',
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ
);

-- 10. Print Jobs
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES table_sessions(id),
  target TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'QUEUED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- Realtime Publication for Prototype Sync
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;

-- ==============================================================================
-- Full Replica Identity for Realtime Delete Payloads
-- Ensures DELETE events contain complete row data (e.g. session_id) so client-side
-- realtime filters detect removals across shared sessions without dropping payloads.
-- ==============================================================================
ALTER TABLE cart_items REPLICA IDENTITY FULL;
ALTER TABLE service_requests REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE table_sessions REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;

-- ==============================================================================
-- Row Level Security (RLS) Prototype Demo Policies
-- Enables anon & authenticated full read-write access for live browser demos
-- ==============================================================================
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for restaurant_settings" ON restaurant_settings;
CREATE POLICY "Public prototype access for restaurant_settings" ON restaurant_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for menu_items" ON menu_items;
CREATE POLICY "Public prototype access for menu_items" ON menu_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for tables" ON tables;
CREATE POLICY "Public prototype access for tables" ON tables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for table_sessions" ON table_sessions;
CREATE POLICY "Public prototype access for table_sessions" ON table_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for cart_items" ON cart_items;
CREATE POLICY "Public prototype access for cart_items" ON cart_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for orders" ON orders;
CREATE POLICY "Public prototype access for orders" ON orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for order_items" ON order_items;
CREATE POLICY "Public prototype access for order_items" ON order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for service_requests" ON service_requests;
CREATE POLICY "Public prototype access for service_requests" ON service_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for payments" ON payments;
CREATE POLICY "Public prototype access for payments" ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public prototype access for print_jobs" ON print_jobs;
CREATE POLICY "Public prototype access for print_jobs" ON print_jobs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- Table Grants for Anon & Authenticated Roles
-- Grants schema and table level access so the client key can execute queries
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- ==============================================================================
-- Initial Demo Seed Data
-- ==============================================================================

-- Default Restaurant Settings
INSERT INTO restaurant_settings (id, name, logo_url, primary_color, currency_symbol, tax_percent, require_seating_pin, kds_enabled)
VALUES (1, 'Spice & Sizzle Bistro', null, '#EA580C', 'Rs.', 16.00, false, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  primary_color = EXCLUDED.primary_color,
  currency_symbol = EXCLUDED.currency_symbol,
  tax_percent = EXCLUDED.tax_percent;

-- Demo Tables (1 to 6)
INSERT INTO tables (table_number, label) VALUES
  (1, 'Table 1 (Indoor Window)'),
  (2, 'Table 2 (Indoor Center)'),
  (3, 'Table 3 (Patio Booth)'),
  (4, 'Table 4 (Patio Garden)'),
  (5, 'Table 5 (Terrace High)'),
  (6, 'Table 6 (Family Lounge)')
ON CONFLICT (table_number) DO NOTHING;

-- Realistic Menu Items with Modifiers
INSERT INTO menu_items (category, name, name_alt, description, base_price, spice_level, modifiers, image_url, is_available, sort_order) VALUES
  ('Starters', 'Crispy Dynamite Prawns', 'ڈائنامائٹ پرانز', 'Battered jumbo prawns tossed in house special spicy sriracha mayo.', 1150.00, 2, '[{"name": "Extra Dip", "price_delta": 100}, {"name": "Extra Prawns (2 pcs)", "price_delta": 350}]'::jsonb, 'https://images.unsplash.com/photo-1559742811-822873691df8?w=500&auto=format&fit=crop&q=60', true, 1),
  ('Starters', 'Loaded Truffle Fries', 'ٹرفل فرائز', 'Crispy hand-cut fries drizzled with truffle oil, parmesan cheese, and garlic aioli.', 650.00, 0, '[{"name": "Add Jalapeños", "price_delta": 80}, {"name": "Extra Cheese Melt", "price_delta": 150}]'::jsonb, 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&auto=format&fit=crop&q=60', true, 2),
  ('Starters', 'Buffalo Chicken Wings (6 pcs)', 'بفلو ونگز', 'Glazed in tangy hot buffalo sauce, served with cool blue cheese dip.', 850.00, 3, '[{"name": "Extra Ranch Dip", "price_delta": 90}]'::jsonb, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60', true, 3),

  ('Burgers', 'The Prime Smash Cheeseburger', 'اسپیشل سمیش برگر', 'Double smashed prime beef patties, cheddar cheese, caramelized onions, secret sauce.', 1250.00, 1, '[{"name": "Double Cheese", "price_delta": 150}, {"name": "Add Turkey Bacon", "price_delta": 220}, {"name": "Extra Patty", "price_delta": 380}]'::jsonb, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60', true, 4),
  ('Burgers', 'Spicy Nashville Crisp Burger', 'کرسپی چکن برگر', 'Golden fried chicken thigh dunked in chili oil, coleslaw, pickles on toasted brioche.', 990.00, 3, '[{"name": "Extra Cheese", "price_delta": 120}, {"name": "Double Chicken Thigh", "price_delta": 320}]'::jsonb, 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=60', true, 5),

  ('BBQ & Grill', 'Smoky Malai Boti Skewers', 'ملائی بوٹی', 'Tender boneless chicken cubes marinated in heavy cream, green chilies, and mild herbs.', 1350.00, 1, '[{"name": "Add Garlic Naan", "price_delta": 120}, {"name": "Extra Raita Dip", "price_delta": 80}]'::jsonb, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=60', true, 6),
  ('BBQ & Grill', 'Signature Mutton Seekh Kabab', 'مٹن سیخ کباب', 'Charcoal-grilled minced mutton with roasted cumin, coriander, and fresh mint.', 1550.00, 2, '[{"name": "Add Roghani Naan", "price_delta": 140}]'::jsonb, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=500&auto=format&fit=crop&q=60', true, 7),

  ('Drinks', 'Mint Margarita Mocktail', 'منٹ مارگریٹا', 'Fresh mint leaves crushed with lime juice, sea salt, and sparkling soda.', 420.00, 0, '[{"name": "Pitcher (Serves 4)", "price_delta": 800}]'::jsonb, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60', true, 8),
  ('Drinks', 'Iced Spanish Latte', 'اسپینش لیٹے', 'Double shot espresso shaken with condensed sweet milk and chilled fresh milk.', 580.00, 0, '[{"name": "Oat Milk Swap", "price_delta": 150}, {"name": "Extra Espresso Shot", "price_delta": 120}]'::jsonb, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60', true, 9),

  ('Desserts', 'Molten Lava Cake with Gelato', 'لاوا کیک', 'Warm chocolate fudge cake with molten core, accompanied by vanilla bean gelato.', 780.00, 0, '[{"name": "Extra Gelato Scoop", "price_delta": 180}]'::jsonb, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60', true, 10);
