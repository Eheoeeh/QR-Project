# QR-Based Dining System — Prototype Functional & Data Specification

## 1. Overview & Deployment Philosophy

This document specifies the **Practical Working Prototype** for a standalone, QR-based restaurant dining and service management system.

* **Core Value Proposition:** Diners scan a table QR code in their mobile browser (no app, no login) to browse the menu, share a live table cart, place orders, request service, split bills, and pay—while waiters shift from order-takers to timer-guided service staff.
* **Standalone Architecture:** The final software is deployed as an **independent standalone instance per restaurant** (no multi-tenant SaaS overhead), configurable per venue via environment variables and a single `restaurant_settings` record.
* **Prototype Goal:** Deliver a live, scannable, real-time web demo deployed on **Vercel with GitHub integration** so restaurant owners can test the end-to-end dining loop directly on their own smartphones.

---

## 2. Prototype Tech Stack & Production Migration Path

To guarantee zero-config hosting, instant HTTPS, and drop-proof real-time updates on Vercel's serverless platform, the prototype uses the following stack:

| Layer | Prototype Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React + Vite + TypeScript | Fast mobile-first load times for QR scanning; native Vercel deployment. |
| **Styling & Icons** | Tailwind CSS + Lucide React | Responsive customer UI, tablet waiter cards, and 80mm monospace receipt previews. |
| **Routing & State** | React Router v6 + Zustand | Clean route separation across roles with reactive local + synced store slices. |
| **Database** | Supabase (PostgreSQL) | Production-identical relational schema (tables, sessions, orders, ledger). |
| **Real-Time Engine** | Supabase Realtime (Postgres Changes) | Sub-100ms live sync across phones, waiter tablets, and kitchen screens without serverless WebSocket timeout issues. |
| **QR Generation** | `qrcode.react` | Generates live, scannable QR codes dynamically for every table URL. |
| **CI/CD & Hosting** | GitHub → Vercel | Automatic builds on push to `main` and preview links on pull requests. |

### Production Migration Strategy (Standalone Docker / Local LAN)
All database queries and real-time listeners must be isolated strictly inside `src/services/`. When transitioning from the Vercel prototype to a standalone restaurant deployment (Cloud VPS or Local LAN Cashier PC via Docker Compose):
1. Replace the `src/services/` adapter to communicate with a standalone **Node.js + Express + Socket.io + PostgreSQL** backend.
2. Connect the backend directly to local USB/LAN **ESC/POS thermal printers** (or via a lightweight print agent if cloud-hosted).
3. Reuse 100% of the React UI components, business rules, and PostgreSQL schema.

---

## 3. Application Routes & Functional Specification

All interfaces live within a single React application to streamline live demonstrations.

### 3.1 Demo Launcher (`/`)
* **Purpose:** Pitch and testing hub for demonstrating the system across multiple devices simultaneously.
* **Features:**
  * Displays scannable QR codes for demo tables (`Table 1` through `Table 6`) linking directly to `/t/:tableNumber`.
  * Quick-launch buttons to open the **Waiter Dashboard (`/waiter`)**, **Kitchen & Thermal KOT Screen (`/kitchen`)**, and **Admin Panel (`/admin`)** in new tabs.
  * One-click **"Reset Demo Data"** button to clear active sessions/orders before a new pitch.

### 3.2 Customer Mobile Web App (`/t/:tableNumber`)
* **Temporary Table Sessions & Security:**
  * On scan, the app queries for an active (`OPEN` or `BILL_REQUESTED`) session for `tableNumber`.
  * **New Table:** Automatically creates a new `table_session` with a cryptographic UUID `session_token` stored in `localStorage`. If `require_seating_pin` is enabled in settings, prompts the guest for the 4-digit PIN displayed on the Waiter Dashboard before unlocking ordering.
  * **Shared Table:** If another diner at the same table scans the QR code, they automatically bind to the active `session_token` and share the same cart and live bill.
  * **Session Invalidation:** Once the waiter marks the table paid and closes the session, the `session_token` is revoked immediately. Stale browser tabs opened later display a clean *"Session Closed — Scan the QR code at your table to start a new order"* screen, preventing remote or accidental ordering onto another guest's bill.
* **Menu Browsing:**
  * Category tabs, dish photos, descriptions, optional secondary name (`name_alt`, e.g., Urdu/Roman Urdu), portion sizes, and spice level indicators.
  * Priced modifiers (e.g., `+ Extra Cheese`, `Large Portion`) and free-text item notes (e.g., `"no onions"`).
  * **Live Availability:** Items toggled to Sold Out by the admin immediately dim and disable adding to cart without requiring a page reload.
* **Shared Live Cart & Ordering:**
  * Multiple phones at the same table see cart additions, quantity edits, and removals in real time.
  * Tapping **Place Order** commits the shared cart as an immutable `order` record, clears the shared cart, and broadcasts immediately to `/waiter` and `/kitchen`.
  * Diners can place additional rounds of orders onto the same session at any time.
* **Live Order Tracking:**
  * Displays each submitted order with live status badges: `RECEIVED` → `PREPARING` → `READY` → `SERVED` (or `CANCELLED`).
* **Service Requests (with Anti-Spam Protection):**
  * One-tap action buttons: **Call Waiter**, **Need Water**, and **Other** (short custom text input).
  * **Rate Limit / Spam Lock:** Only one active (`PENDING` or `ON_THE_WAY`) request of each type is allowed per table session at a time. The button shows live progress (*"Waiter is on the way..."*) until marked `DONE`.
* **Live Bill, Bill Splitting & Payment:**
  * Always-accessible bill summary showing itemized orders, subtotal, configured tax (`tax_percent`), and grand total.
  * **Split Bill Calculator:**
    * *Split Equally:* Divide the grand total evenly across `2` to `8` guests.
    * *Split by Item:* Let diners select specific ordered items (or divide shared items) to calculate individual shares.
    * Generates trackable payment entries (`payments` table) so partial shares can be settled independently.
  * **Payment Options:**
    * **Pay Cash (Primary):** Triggers a `PAY_CASH` service request on the Waiter Dashboard and moves the session to `BILL_REQUESTED`.
    * **Pay Online (Prototype Demo Mode):** Simulated instant checkout screen that records a verified `ONLINE_DEMO` payment and notifies the waiter.
  * Displays a clean digital receipt once the full balance is paid.

### 3.3 Waiter & Cashier POS Dashboard (`/waiter`)
* **Live Table Grid:**
  * Color-coded cards for all tables showing real-time status:
    * `Free` (Grey)
    * `Occupied` (Blue)
    * `Order Pending / Ready for Pickup` (Amber / Green Pulse)
    * `Service Request Active` (Red Alert)
    * `Bill Requested` (Purple)
  * Displays the current 4-digit `seating_pin` on occupied/new tables when PIN mode is active.
* **Service Request Queue & Timers:**
  * Pinned alert banner with optional audio chime whenever a customer requests help, water, or cash checkout.
  * Live elapsed timer (`01:42`) showing how long the table has waited.
  * Two-step resolution workflow: **On my way** (`ON_THE_WAY`) → **Done** (`DONE`).
* **Order & Table Controls:**
  * Mark `READY` kitchen orders as **Served**.
  * Cancel fake/prank orders (`CANCELLED`) with instant bill recalculation.
  * Force-close/reset an abandoned table session.
* **Cashier Settlement & Split Ledger:**
  * View itemized bill and individual split shares for any table.
  * Tap **Mark Share Paid** (for split bills) or **Mark Full Bill Paid (Cash)**.
  * Once `SUM(PAID payments) >= grand_total`, the system automatically closes the `table_session`, revokes the `session_token`, and triggers a cashier receipt print job.

### 3.4 Kitchen Display (KDS) & Virtual Thermal Printer (`/kitchen`)
* **Incoming Order Queue:**
  * Time-sorted ticket cards displaying Table Number, Order Number, elapsed prep time, item quantities, priced modifiers, and customer notes highlighted in bold.
  * Status buttons: **Start Preparing** (`PREPARING`) → **Mark Ready** (`READY`), which immediately alerts the Waiter Dashboard for pickup.
* **80mm Virtual Thermal Printer (POS & KOT Simulation):**
  * Side drawer / toggleable feed showing live formatted **80mm monospace thermal slips**:
    * **Kitchen Order Ticket (KOT):** Auto-generated on every new order (no prices, bold modifiers/notes, timestamp, table number).
    * **Customer Cash Receipt:** Auto-generated when a table is marked paid (restaurant header, itemized prices, tax breakdown, split summary, total).
  * Includes a **"Print Slip"** button (`window.print()` with `@media print` 80mm CSS styling) to allow testing with a real USB thermal printer directly from Chrome during demos.

### 3.5 Mini Admin Panel (`/admin`)
* **Menu Management:**
  * Live **Sold Out / Available** toggle per dish (propagates instantaneously to all active customer screens).
  * Quick inline editing for item prices, descriptions, and adding new menu items.
* **Restaurant Settings:**
  * Update restaurant name, primary brand color, tax percentage, **Seating PIN requirement** toggle, and **KDS screen enabled** toggle.
* **Table & QR Code Sheet:**
  * Add/remove tables and view a printable grid of all table QR codes (`/t/1` to `/t/N`) with table labels ready for physical printing.

---

## 4. Data Specification (PostgreSQL Schema)

All tables operate in a standalone database (no `restaurant_id` foreign key required).

### 4.1 Entity Relationship Summary
* `tables` 1 — 0..1 active `table_sessions` (1 — many historical sessions)
* `table_sessions` 1 — many `cart_items`, `orders`, `service_requests`, `payments`
* `orders` 1 — many `order_items`
* `table_sessions` / `orders` 1 — many `print_jobs`

### 4.2 Table Definitions

#### 1. `restaurant_settings`
Stores single-row restaurant configuration and branding.
| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY DEFAULT 1` | Enforced single-row config (`CHECK (id = 1)`). |
| `name` | `TEXT` | `NOT NULL` | Display name of the restaurant. |
| `logo_url` | `TEXT` | `NULL` | URL to restaurant logo. |
| `primary_color` | `TEXT` | `DEFAULT '#EA580C'` | Hex color for customer app theming. |
| `currency_symbol` | `TEXT` | `DEFAULT 'Rs.'` | Displayed currency prefix. |
| `tax_percent` | `NUMERIC(5,2)` | `DEFAULT 16.00` | Tax percentage applied to bills. |
| `require_seating_pin` | `BOOLEAN` | `DEFAULT false` | Toggles 4-digit PIN gate on new sessions. |
| `kds_enabled` | `BOOLEAN` | `DEFAULT true` | Toggles Kitchen Display routing vs. direct waiter/KOT mode. |

#### 2. `menu_items`
Stores menu catalog, pricing, modifiers, and live availability.
| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique item ID. |
| `category` | `TEXT` | `NOT NULL` | Category name (e.g., `Starters`, `BBQ`, `Burgers`, `Drinks`). |
| `name` | `TEXT` | `NOT NULL` | Primary English dish name. |
| `name_alt` | `TEXT` | `NULL` | Optional secondary language name (e.g., Urdu/Roman Urdu). |
| `description` | `TEXT` | `NULL` | Ingredients, portion info, and description. |
| `base_price` | `NUMERIC(10,2)` | `NOT NULL` | Base price before modifiers. |
| `spice_level` | `SMALLINT` | `DEFAULT 0` | `0` = None, `1` = Mild, `2` = Medium, `3` = Hot. |
| `modifiers` | `JSONB` | `DEFAULT '[]'` | Array of `{ "name": "Extra Cheese", "price_delta": 150 }`. |
| `image_url` | `TEXT` | `NULL` | Dish photo URL. |
| `is_available` | `BOOLEAN` | `DEFAULT true` | Live sold-out toggle. |
| `sort_order` | `INTEGER` | `DEFAULT 0` | Display ordering within category. |

#### 3. `tables`
Physical dining tables mapped to permanent printed QR codes.
| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Internal table ID. |
| `table_number` | `INTEGER` | `UNIQUE NOT NULL` | Printed table number (used in `/t/:tableNumber`). |
| `label` | `TEXT` | `NOT NULL` | Display label (e.g., `"Table 12"`, `"Patio 3"`). |
| `current_session_id` | `UUID` | `NULL REFERENCES table_sessions(id)` | Pointer to the currently active session, if any. |

#### 4. `table_sessions`
Ephemeral session lifecycle ensuring QR anti-hijacking and isolated billing.
| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Session ID. |
| `table_id` | `INTEGER` | `NOT NULL REFERENCES tables(id)` | Associated physical table. |
| `session_token` | `UUID` | `UNIQUE NOT NULL DEFAULT gen_random_uuid()` | Secret bearer token saved in guest `localStorage`; invalidated when `CLOSED`. |
| `seating_pin` | `CHAR(4)` | `NOT NULL` | Random 4-digit PIN generated on session creation. |
| `pin_verified` | `BOOLEAN` | `DEFAULT false` | Marks whether the table has unlocked ordering (auto-true if PIN disabled). |
| `status` | `TEXT` | `DEFAULT 'OPEN'` | Enum: `OPEN`, `BILL_REQUESTED`, `CLOSED`. |
| `opened_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Session start timestamp. |
| `closed_at` | `TIMESTAMPTZ` | `NULL` | Timestamp when paid and closed. |

#### 5. `cart_items`
Shared real-time cart synchronized across all devices sitting at the same table.
| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Cart line ID. |
| `session_id` | `UUID` | `NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE` | Active table session. |
| `menu_item_id` | `UUID` | `NOT NULL REFERENCES menu_items(id)` | Reference to dish. |
| `quantity` | `INTEGER` | `NOT NULL CHECK (quantity > 0)` | Item quantity. |
| `selected_modifiers` | `JSONB` | `DEFAULT '[]'` | Chosen modifiers array `[{ "name", "price_delta" }]`. |
| `note` | `TEXT` | `NULL` | Customer prep note (e.g., `"no onions"`). |
| `added_by_guest_id` | `TEXT` | `NOT NULL` | Anonymous client UUID generated per browser to label who added what. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Insertion timestamp. |

#### 6. `orders` & `order_items`
Immutable submitted orders with price snapshots so future menu edits never alter historical bills.
* **`orders`:**
  | Column | Type | Constraints / Default | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Order ID. |
  | `order_number` | `SERIAL` | `UNIQUE` | Human-readable sequential KOT number (`#104`). |
  | `session_id` | `UUID` | `NOT NULL REFERENCES table_sessions(id)` | Owning table session. |
  | `status` | `TEXT` | `DEFAULT 'RECEIVED'` | Enum: `RECEIVED`, `PREPARING`, `READY`, `SERVED`, `CANCELLED`. |
  | `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Order placement timestamp. |
  | `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Last status change timestamp. |

* **`order_items`:**
  | Column | Type | Constraints / Default | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Line item ID. |
  | `order_id` | `UUID` | `NOT NULL REFERENCES orders(id) ON DELETE CASCADE` | Parent order. |
  | `menu_item_id` | `UUID` | `NULL REFERENCES menu_items(id) ON DELETE SET NULL` | Original menu reference. |
  | `item_name` | `TEXT` | `NOT NULL` | Snapshotted dish name at order time. |
  | `unit_price` | `NUMERIC(10,2)` | `NOT NULL` | Snapshotted base price + modifier deltas. |
  | `quantity` | `INTEGER` | `NOT NULL CHECK (quantity > 0)` | Ordered quantity. |
  | `selected_modifiers` | `JSONB` | `DEFAULT '[]'` | Snapshotted modifier details. |
  | `note` | `TEXT` | `NULL` | Preparation instructions. |

#### 7. `service_requests`
Live waiter task queue with anti-spam constraints and wait-time tracking.
| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Request ID. |
| `session_id` | `UUID` | `NOT NULL REFERENCES table_sessions(id)` | Requesting table session. |
| `type` | `TEXT` | `NOT NULL` | Enum: `CALL_WAITER`, `WATER`, `PAY_CASH`, `OTHER`. |
| `note` | `TEXT` | `NULL` | Short text when `type = 'OTHER'` or cash split note. |
| `status` | `TEXT` | `DEFAULT 'PENDING'` | Enum: `PENDING`, `ON_THE_WAY`, `DONE`. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Drives live wait timer on Waiter Dashboard. |
| `resolved_at` | `TIMESTAMPTZ` | `NULL` | Timestamp when marked `DONE`. |

*Database Spam Guard:* A partial unique index prevents duplicate open requests of the same type per session:
```sql
CREATE UNIQUE INDEX unique_active_request_per_type
ON service_requests (session_id, type)
WHERE status IN ('PENDING', 'ON_THE_WAY');
```

#### 8. `payments`
Payment ledger supporting both single-bill settlement and equal/itemized bill splitting.
| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Payment record ID. |
| `session_id` | `UUID` | `NOT NULL REFERENCES table_sessions(id)` | Associated table session. |
| `split_label` | `TEXT` | `DEFAULT 'Full Bill'` | E.g., `"Full Bill"`, `"Guest 1 of 3"`, `"Ali's Items"`. |
| `amount` | `NUMERIC(10,2)` | `NOT NULL CHECK (amount > 0)` | Amount due/paid for this share. |
| `method` | `TEXT` | `NOT NULL` | Enum: `CASH`, `ONLINE_DEMO`. |
| `status` | `TEXT` | `DEFAULT 'PENDING'` | Enum: `PENDING`, `PAID`. |
| `paid_at` | `TIMESTAMPTZ` | `NULL` | Confirmation timestamp. |

#### 9. `print_jobs`
Drives the 80mm Virtual Thermal Printer in the prototype and the real ESC/POS printer in production.
| Column | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Print job ID. |
| `session_id` | `UUID` | `NOT NULL REFERENCES table_sessions(id)` | Related session. |
| `target` | `TEXT` | `NOT NULL` | Enum: `KITCHEN_KOT`, `CASHIER_RECEIPT`. |
| `payload` | `JSONB` | `NOT NULL` | Structured ticket snapshot (table, items, modifiers, totals). |
| `status` | `TEXT` | `DEFAULT 'QUEUED'` | Enum: `QUEUED`, `PRINTED`, `FAILED`. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Print dispatch timestamp. |

---

## 5. Real-Time Synchronization & Drop Recovery

1. **Supabase Realtime Subscriptions:** Enable Realtime replication on `menu_items`, `tables`, `table_sessions`, `cart_items`, `orders`, `service_requests`, `payments`, and `print_jobs`.
2. **Channel Scoping:**
   * **Customer Client (`/t/:tableNumber`):** Subscribes to `menu_items` updates + session-scoped changes filtered by `session_id`.
   * **Waiter & Kitchen Clients (`/waiter`, `/kitchen`):** Subscribe to all active `tables`, `orders`, `service_requests`, `payments`, and `print_jobs`.
3. **Mobile Lock-Screen Recovery:** Attach a `document.addEventListener('visibilitychange', ...)` hook in the Customer and Waiter views. Whenever a phone wakes from sleep or regains network connectivity (`window.online`), trigger a silent REST re-fetch of the current session/dashboard state so no updates are ever missed.

---

## 6. Repository Structure & Vercel Configuration

```text
qr-dining-prototype/
├── public/
├── src/
│   ├── components/
│   │   ├── customer/      # MenuCard, ModifierModal, SharedCart, OrderTracker, SplitBillModal
│   │   ├── waiter/        # TableCard, RequestAlertBar, CashCheckoutModal
│   │   ├── kitchen/       # OrderTicketCard, ThermalSlipPreview (80mm KOT & Receipt)
│   │   └── admin/         # MenuManager, SettingsForm, QrCodePrintSheet
│   ├── pages/             # DemoHubPage, CustomerPage, WaiterPage, KitchenPage, AdminPage
│   ├── services/          # supabaseClient.ts, sessionService.ts, orderService.ts, printService.ts
│   ├── store/             # Zustand reactive stores (useSessionStore, useStaffStore)
│   ├── types/             # TypeScript domain models & enums
│   └── utils/             # billCalculator.ts (subtotal, tax, equal & itemized split math)
├── supabase/
│   └── schema.sql         # Full DDL, indexes, Realtime publication, and realistic demo seed menu
├── vercel.json            # SPA rewrite rules for client-side routing
├── .env.example           # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
└── package.json
```

### Required `vercel.json`
Ensures direct QR scans to `/t/12` or refreshes on `/waiter` always resolve cleanly to the React app without 404 errors:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 7. Prototype Scope Boundaries

| Included in Prototype (Now) | Deferred to Production / Later Phases |
| :--- | :--- |
| QR scan → temporary session + optional 4-digit PIN | Staff JWT login & role-based access control (RBAC) |
| Shared multi-phone cart & live order status tracker | Real payment gateway integration (JazzCash, EasyPaisa, Stripe, etc.) |
| Service requests with spam lock & live timers | Standalone Docker Compose + physical LAN ESC/POS print agent |
| Live bill + Equal & Itemized Bill Splitting | Owner analytics dashboard (daily sales, prep times, peak hours) |
| Cash checkout (`Mark as Paid`) + simulated online pay | Solo & cross-table waiting mini-games (Phase 4) |
| Virtual 80mm Thermal KOT & Receipt preview + browser print | Multi-station kitchen routing (e.g., Bar printer vs. Grill printer) |
| Live Sold Out toggles & printable QR sheet | Automated daily backups & inventory deduction |