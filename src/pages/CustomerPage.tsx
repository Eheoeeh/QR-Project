import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { sessionService } from '../services/sessionService';
import { orderService } from '../services/orderService';
import { useSessionStore } from '../store/useSessionStore';
import { TableSession, MenuItem, Modifier, OrderItem, ServiceRequestType } from '../types';

// Components
import BrandedLoader from '../components/customer/BrandedLoader';
import PinGate from '../components/customer/PinGate';
import ExpiredSessionScreen from '../components/customer/ExpiredSessionScreen';
import MenuCard from '../components/customer/MenuCard';
import ModifierModal from '../components/customer/ModifierModal';
import SharedCartDrawer from '../components/customer/SharedCartDrawer';
import BillModal from '../components/customer/BillModal';
import OrderStatusTracker from '../components/customer/OrderStatusTracker';
import ServiceRequestModal from '../components/customer/ServiceRequestModal';

// Icons
import {
  Bell,
  ShoppingBag,
  Receipt,
  AlertTriangle,
  ArrowLeft,
  Search,
  CheckCircle,
  X,
  ArrowRight
} from 'lucide-react';

export const CustomerPage: React.FC = () => {
  const { tableNumber: tableNumberParam } = useParams<{ tableNumber: string }>();
  const tableNumber = parseInt(tableNumberParam || '', 10);

  const {
    table,
    settings,
    currentSession,
    isSessionExpired,
    guestId,
    cartItems,
    orders,
    activeRequests,
    setGuestId,
    setTable,
    setSettings,
    setCurrentSession,
    setIsSessionExpired,
    setCartItems,
    setOrders,
    setActiveRequests
  } = useSessionStore();

  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Scene 2: Menu & Filtering State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers State
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize Anonymous Guest ID, Session & Data
  const initSession = useCallback(async () => {
    if (isNaN(tableNumber) || tableNumber <= 0) {
      setInitError('Invalid table number. Please scan a valid table QR code.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setInitError(null);

      // 1. Establish guest identity
      const gid = sessionService.getOrCreateGuestId();
      setGuestId(gid);

      // 2. Fetch Restaurant Settings & Table Information in parallel
      const [fetchedSettings, fetchedTable, fetchedMenu] = await Promise.all([
        sessionService.getRestaurantSettings(),
        sessionService.getTableByNumber(tableNumber),
        orderService.getMenuItems()
      ]);

      setSettings(fetchedSettings);
      setMenuItems(fetchedMenu);

      if (!fetchedTable) {
        setInitError(`Table ${tableNumber} was not found in the restaurant system.`);
        setIsLoading(false);
        return;
      }
      setTable(fetchedTable);

      // 3. Check if local browser holds a token for a session that has since closed
      const storedStatus = await sessionService.checkStoredSessionStatus(tableNumber);
      if (storedStatus.isClosed) {
        setIsSessionExpired(true);
        setIsLoading(false);
        return;
      }

      // 4. Resolve or create table session
      const session = await sessionService.resolveOrCreateTableSession(
        fetchedTable,
        fetchedSettings.require_seating_pin
      );

      setCurrentSession(session);
      setIsSessionExpired(session.status === 'CLOSED');

      // 5. Fetch cart items, existing orders, and active service requests
      const [items, sessionOrders, requests] = await Promise.all([
        orderService.getCartItems(session.id),
        supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('session_id', session.id)
          .neq('status', 'CANCELLED')
          .order('created_at', { ascending: true }),
        sessionService.getActiveServiceRequests(session.id)
      ]);

      setCartItems(items);
      if (sessionOrders.data) setOrders(sessionOrders.data);
      setActiveRequests(requests);
    } catch (err: any) {
      console.error('Session initialization error:', err);
      setInitError('Could not connect to table session. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  }, [tableNumber, setGuestId, setSettings, setTable, setCurrentSession, setIsSessionExpired, setCartItems, setOrders, setActiveRequests]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Real-time listener for current session status changes
  useEffect(() => {
    if (!currentSession?.id) return;

    const channel = supabase
      .channel(`session-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
          filter: `id=eq.${currentSession.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as TableSession;
            setCurrentSession(updated);
            if (updated.status === 'CLOSED') {
              setIsSessionExpired(true);
            }
          } else if (payload.eventType === 'DELETE') {
            setIsSessionExpired(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id, setCurrentSession, setIsSessionExpired]);

  // Real-time listener for Menu Items Availability (Instant Sold Out Toggle)
  useEffect(() => {
    const channel = supabase
      .channel('menu-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as MenuItem;
            setMenuItems((prev) =>
              prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
            );
          } else if (payload.eventType === 'INSERT' && payload.new) {
            const newItem = payload.new as MenuItem;
            setMenuItems((prev) => [...prev, newItem]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setMenuItems((prev) => prev.filter((item) => item.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time listener for Shared Table Cart (Inserts, Updates, Deletions)
  useEffect(() => {
    if (!currentSession?.id) return;

    const channel = supabase
      .channel(`cart-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `session_id=eq.${currentSession.id}`
        },
        async () => {
          const updatedCart = await orderService.getCartItems(currentSession.id);
          setCartItems(updatedCart);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id, setCartItems]);

  // Scene 4: Real-time listener for Orders & Order Items status changes
  useEffect(() => {
    if (!currentSession?.id) return;

    const channel = supabase
      .channel(`orders-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `session_id=eq.${currentSession.id}`
        },
        async () => {
          const { data: updatedOrders } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('session_id', currentSession.id)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: true });

          if (updatedOrders) {
            setOrders(updatedOrders);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id, setOrders]);

  // Scene 4: Real-time listener for Service Requests (Anti-spam lock & Waiter responses)
  useEffect(() => {
    if (!currentSession?.id) return;

    const channel = supabase
      .channel(`service-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `session_id=eq.${currentSession.id}`
        },
        async () => {
          const requests = await sessionService.getActiveServiceRequests(currentSession.id);
          setActiveRequests(requests);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id, setActiveRequests]);

  // Mobile Lock-Screen & Visibility Recovery
  useEffect(() => {
    if (!currentSession?.id) return;

    const handleResume = async () => {
      if (document.visibilityState === 'visible') {
        const [refreshedSession, refreshedMenu, refreshedCart, refreshedOrders, refreshedRequests] = await Promise.all([
          sessionService.refreshSession(currentSession.id),
          orderService.getMenuItems(),
          orderService.getCartItems(currentSession.id),
          supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('session_id', currentSession.id)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: true }),
          sessionService.getActiveServiceRequests(currentSession.id)
        ]);

        if (refreshedSession) {
          setCurrentSession(refreshedSession);
          if (refreshedSession.status === 'CLOSED') {
            setIsSessionExpired(true);
          }
        }
        if (refreshedMenu.length > 0) setMenuItems(refreshedMenu);
        setCartItems(refreshedCart);
        if (refreshedOrders.data) setOrders(refreshedOrders.data);
        setActiveRequests(refreshedRequests);
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('online', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('online', handleResume);
    };
  }, [currentSession?.id, setCurrentSession, setIsSessionExpired, setCartItems, setOrders, setActiveRequests]);

  // Categories list with 'All' prepended
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  // Filtered dishes
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.name_alt && item.name_alt.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Handle dish card selection
  const handleSelectDish = (item: MenuItem) => {
    setSelectedItemForModal(item);
    setIsModifierModalOpen(true);
  };

  // Handle adding customized item to shared cart
  const handleAddToCart = async (
    item: MenuItem,
    selectedModifiers: Modifier[],
    note: string,
    quantity: number
  ) => {
    if (!currentSession) return;

    try {
      await orderService.addToCart(
        currentSession.id,
        item.id,
        quantity,
        selectedModifiers,
        note,
        guestId || 'guest_user'
      );

      setToastMessage(`Added ${quantity}x ${item.name} to shared cart`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  // Cart operations
  const handleUpdateCartQuantity = async (cartItemId: string, newQuantity: number) => {
    await orderService.updateCartQuantity(cartItemId, newQuantity);
  };

  const handleRemoveCartItem = async (cartItemId: string) => {
    await orderService.removeFromCart(cartItemId);
  };

  // Submit Order Workflow (Scene 3)
  const handlePlaceOrder = async () => {
    if (!currentSession || cartItems.length === 0 || !table) return;

    try {
      await orderService.submitOrder(currentSession.id, cartItems, table.table_number);

      const { data: updatedOrders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('session_id', currentSession.id)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: true });

      if (updatedOrders) {
        setOrders(updatedOrders);
      }

      setCartItems([]);
      setToastMessage('Order placed! The kitchen is preparing your food.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to place order:', err);
      alert('Could not submit order. Please try again.');
    }
  };

  // Scene 4: Service Request Trigger
  const handleSubmitServiceRequest = async (type: ServiceRequestType, note?: string) => {
    if (!currentSession) return;
    try {
      await sessionService.submitServiceRequest(currentSession.id, type, note);
      const requests = await sessionService.getActiveServiceRequests(currentSession.id);
      setActiveRequests(requests);
      setToastMessage('Service request dispatched to waiter staff.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      if (err?.code === '23505') {
        setToastMessage('A request of this type is already pending for your table.');
      } else {
        setToastMessage('Request sent to waiter.');
      }
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Handle Seating PIN Verification
  const handleVerifyPin = async (enteredPin: string) => {
    if (!currentSession) return { success: false, message: 'No active session found.' };
    const res = await sessionService.verifySeatingPin(currentSession.id, enteredPin);
    if (res.success) {
      setCurrentSession({ ...currentSession, pin_verified: true });
    }
    return res;
  };

  // Handle starting a fresh session after an expired one
  const handleStartFresh = () => {
    sessionService.clearStoredToken(tableNumber);
    setIsSessionExpired(false);
    initSession();
  };

  // Total items and running subtotal currently in shared cart
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => {
    const base = Number(item.menu_item?.base_price) || 0;
    const modDelta = (item.selected_modifiers || []).reduce(
      (sum, m) => sum + (Number(m.price_delta) || 0),
      0
    );
    return acc + (base + modDelta) * item.quantity;
  }, 0);

  // Compute Live Bill Running Total from submitted orders
  const runningTotal = useMemo(() => {
    const allOrderItems: OrderItem[] = orders
      .filter((o) => o.status !== 'CANCELLED')
      .flatMap((o) => o.order_items || []);
    const subtotal = allOrderItems.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0);
    const taxPercent = settings?.tax_percent || 16;
    const tax = (subtotal * taxPercent) / 100;
    return Math.round(subtotal + tax);
  }, [orders, settings]);

  // Check if any service call is currently active for header badge
  const hasActiveServiceCalls = activeRequests.length > 0;

  // 1. Loading State
  if (isLoading) {
    return (
      <BrandedLoader
        restaurantName={settings?.name}
        tableLabel={table ? table.label : `Table ${tableNumber}`}
      />
    );
  }

  // 2. Error State
  if (initError || !table) {
    return (
      <div className="h-[100dvh] w-full flex flex-col justify-between bg-slate-900 text-white p-6">
        <div />
        <div className="max-w-sm mx-auto text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Connection Notice</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{initError}</p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Demo Hub</span>
            </Link>
          </div>
        </div>
        <div className="text-center text-[11px] text-slate-500">
          Make sure your QR code matches an active table in the system.
        </div>
      </div>
    );
  }

  // 3. Expired Session State
  if (isSessionExpired) {
    return (
      <ExpiredSessionScreen
        restaurantName={settings?.name || 'Spice & Sizzle Bistro'}
        tableLabel={table.label}
        onStartFresh={handleStartFresh}
      />
    );
  }

  // 4. Seating PIN Gate
  if (settings?.require_seating_pin && currentSession && !currentSession.pin_verified) {
    return (
      <PinGate
        restaurantName={settings.name}
        tableLabel={table.label}
        onVerify={handleVerifyPin}
      />
    );
  }

  // 5. Active Dining Menu & Ordering Experience
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 pb-36">
      {/* Sticky Top Header: Restaurant Name & Table on Left; Service Bell & Live Bill pill on Right */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {/* Left: Restaurant Name + Table Number Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider block truncate">
                {settings?.name || 'Spice & Sizzle Bistro'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                  {table.label}
                </h1>
              </div>
            </div>
          </div>

          {/* Right: Service Bell Button & Live Bill Pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsServiceModalOpen(true)}
              title="Request Waiter or Service"
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full border transition shadow-2xs active:scale-95 ${
                hasActiveServiceCalls
                  ? 'bg-orange-500 text-white border-orange-500 animate-pulse'
                  : 'bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{hasActiveServiceCalls ? 'Pending' : 'Service'}</span>
            </button>

            {/* Live Bill Pill */}
            <button
              type="button"
              onClick={() => setIsBillModalOpen(true)}
              title="Running Live Bill"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-2xs border border-slate-800 transition active:scale-95 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-orange-400" />
              <span>
                {settings?.currency_symbol || 'Rs.'} {runningTotal.toLocaleString()}
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto px-4 pb-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes, burgers, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Pinned Single Horizontal Row of Category Pills */}
        <div className="max-w-2xl mx-auto overflow-x-auto no-scrollbar px-4 pb-2.5 flex items-center gap-2">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition select-none shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </header>

      {/* Scene 4: Always-Reachable Live Order Status Strip (Shows when orders are placed) */}
      <OrderStatusTracker
        orders={orders}
        currencySymbol={settings?.currency_symbol || 'Rs.'}
        tableLabel={table.label}
      />

      {/* Main Dishes Catalog Feed */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Category Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            {selectedCategory === 'All' ? 'All Dishes' : selectedCategory} ({filteredItems.length})
          </h2>
        </div>

        {/* Dish Cards Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2 shadow-2xs">
            <p className="text-sm font-bold text-slate-700">No dishes found</p>
            <p className="text-xs text-slate-400">Try a different search term or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                currencySymbol={settings?.currency_symbol || 'Rs.'}
                onSelect={handleSelectDish}
              />
            ))}
          </div>
        )}
      </main>

      {/* Ephemeral Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-fade-in">
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Scene 3 Floating Bottom Cart Bar (Appears when cart has items) */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-40 px-4 pointer-events-none animate-slide-up">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div
              onClick={() => setIsCartDrawerOpen(true)}
              className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-850 active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  {cartItemCount}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400 block">
                    Shared Table Cart
                  </span>
                  <div className="text-sm font-black text-white truncate">
                    {settings?.currency_symbol || 'Rs.'} {cartSubtotal.toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow transition shrink-0"
              >
                <span>Review Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Nav Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-2.5 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* View Bill Button */}
          <button
            type="button"
            onClick={() => setIsBillModalOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition active:scale-[0.99]"
          >
            <Receipt className="w-4 h-4 text-slate-600" />
            <span>View Bill</span>
          </button>

          {/* Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition active:scale-[0.99]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Shared Cart ({cartItemCount})</span>
          </button>
        </div>
      </nav>

      {/* Modifier Bottom Sheet Modal */}
      <ModifierModal
        item={selectedItemForModal}
        currencySymbol={settings?.currency_symbol || 'Rs.'}
        isOpen={isModifierModalOpen}
        onClose={() => {
          setIsModifierModalOpen(false);
          setSelectedItemForModal(null);
        }}
        onAddToCart={handleAddToCart}
      />

      {/* Shared Cart Drawer (Scene 3) */}
      <SharedCartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cartItems={cartItems}
        currencySymbol={settings?.currency_symbol || 'Rs.'}
        tableLabel={table.label}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* Live Bill Modal (Scene 5) */}
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        tableLabel={table.label}
        orders={orders}
        settings={settings}
        cartItemCount={cartItemCount}
        onOpenCart={() => {
          setIsBillModalOpen(false);
          setIsCartDrawerOpen(true);
        }}
      />

      {/* Scene 4: Service Request Sheet Modal */}
      <ServiceRequestModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        tableLabel={table.label}
        activeRequests={activeRequests}
        onSubmitRequest={handleSubmitServiceRequest}
      />
    </div>
  );
};

export default CustomerPage;
