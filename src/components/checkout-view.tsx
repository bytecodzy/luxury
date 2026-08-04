'use client';

import { useStore } from '@/lib/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  CheckCircle,
  XCircle,
  Check,
  MapPin,
  Home,
  Briefcase,
  Map,
  Plus,
  Pencil,
  ChevronRight,
  Truck,
  Package,
  Sparkles,
  Star,
  X,
  Trash2,
  LocateFixed,
  ShieldCheck,
  Lock,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

interface SavedAddress {
  id: string;
  label: 'home' | 'work' | 'others';
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export function CheckoutView() {
  const { cartItems, setView, authUser, setPendingOrder } = useStore();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const appTheme = useStore((s) => s.appTheme);
  const isDark = appTheme === 'dark';
  const accentColor = 'var(--luxury-accent, #dbaf36)';

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  // ── Theme tokens (matching cart-view.tsx) ──
  const cardBg = isDark ? 'rgba(28, 25, 23, 0.6)' : 'rgba(255, 255, 255, 0.95)';
  const cardBorder = isDark ? 'rgba(212, 164, 55, 0.1)' : 'rgba(212, 164, 55, 0.15)';
  const textPrimary = isDark ? 'rgba(245, 230, 163, 0.9)' : '#1c1917';
  const textSecondary = isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)';
  const textMuted = isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.35)';
  const inputBg = isDark ? 'rgba(12, 10, 9, 0.5)' : 'rgba(245, 240, 230, 0.6)';
  const inputBorder = isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.15)';
  const inputText = isDark ? 'rgba(245, 230, 163, 0.9)' : '#1c1917';
  const inputPlaceholder = isDark ? 'rgba(245, 230, 163, 0.2)' : 'rgba(28, 25, 23, 0.3)';

  // ── Saved Addresses State ──
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([
    {
      id: 'addr-1',
      label: 'home',
      name: authUser?.name || 'Customer',
      phone: authUser?.phone || '+91 98765 43210',
      address: '338/14, Sri Nilyam, Yelahanka',
      city: 'Bengaluru',
      state: 'Karnataka',
      zipCode: '560064',
      country: 'India',
      isDefault: true,
    },
  ]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('addr-1');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: 'home' as 'home' | 'work' | 'others',
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    isDefault: false,
  });

  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];

  const handleAddAddress = () => {
    if (!addressForm.address || !addressForm.city || !addressForm.state || !addressForm.zipCode) return;
    const newAddress: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: addressForm.label,
      name: addressForm.name || authUser?.name || 'Customer',
      phone: addressForm.phone,
      address: addressForm.address,
      city: addressForm.city,
      state: addressForm.state,
      zipCode: addressForm.zipCode,
      country: addressForm.country,
      isDefault: addressForm.isDefault || savedAddresses.length === 0,
    };
    setSavedAddresses((prev) => {
      if (newAddress.isDefault) {
        return [...prev.map((a) => ({ ...a, isDefault: false })), newAddress];
      }
      return [...prev, newAddress];
    });
    setSelectedAddressId(newAddress.id);
    setAddingNew(false);
    setAddressForm({ label: 'home', name: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'India', isDefault: false });
  };

  const handleEditAddress = () => {
    if (!editingAddressId || !addressForm.address || !addressForm.city) return;
    setSavedAddresses((prev) => {
      const updated = prev.map((a) =>
        a.id === editingAddressId
          ? {
              ...a,
              label: addressForm.label,
              name: addressForm.name || a.name,
              phone: addressForm.phone || a.phone,
              address: addressForm.address,
              city: addressForm.city,
              state: addressForm.state,
              zipCode: addressForm.zipCode,
              country: addressForm.country,
              isDefault: addressForm.isDefault,
            }
          : a
      );
      if (addressForm.isDefault) {
        return updated.map((a) =>
          a.id === editingAddressId ? { ...a, isDefault: true } : { ...a, isDefault: false }
        );
      }
      return updated;
    });
    setEditingAddressId(null);
    setAddressForm({ label: 'home', name: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'India', isDefault: false });
  };

  const openEditForm = (addr: SavedAddress) => {
    setAddingNew(false);
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label,
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country,
      isDefault: addr.isDefault,
    });
  };

  const handleDeleteAddress = (addrId: string) => {
    setSavedAddresses((prev) => {
      const filtered = prev.filter((a) => a.id !== addrId);
      // If the deleted address was default, make the first remaining one default
      if (prev.find((a) => a.id === addrId)?.isDefault && filtered.length > 0) {
        filtered[0] = { ...filtered[0], isDefault: true };
      }
      return filtered;
    });
    // If the deleted address was selected, select the first remaining
    if (selectedAddressId === addrId) {
      const remaining = savedAddresses.filter((a) => a.id !== addrId);
      setSelectedAddressId(remaining.length > 0 ? remaining[0].id : '');
    }
    // Close edit form if deleting the address being edited
    if (editingAddressId === addrId) {
      setEditingAddressId(null);
    }
  };

  const openAddForm = () => {
    setEditingAddressId(null);
    setAddingNew(true);
    setAddressForm({ label: 'home', name: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'India', isDefault: false });
  };

  const closeForm = () => {
    setEditingAddressId(null);
    setAddingNew(false);
    setAddressForm({ label: 'home', name: '', phone: '', address: '', city: '', state: '', zipCode: '', country: 'India', isDefault: false });
  };

  const handleChangeLabel = (addrId: string, newLabel: 'home' | 'work' | 'others') => {
    setSavedAddresses((prev) =>
      prev.map((a) => (a.id === addrId ? { ...a, label: newLabel } : a))
    );
  };

  const getLabelIcon = (label: 'home' | 'work' | 'others') => {
    switch (label) {
      case 'home': return Home;
      case 'work': return Briefcase;
      case 'others': return Map;
    }
  };

  const getLabelColors = (label: 'home' | 'work' | 'others', active: boolean) => {
    if (!active) {
      return {
        bg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
        text: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
        glow: 'none',
      };
    }
    const map = {
      home: {
        bg: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.12)',
        border: isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.35)',
        text: isDark ? '#93c5fd' : '#2563eb',
        glow: isDark ? '0 0 10px rgba(59, 130, 246, 0.25)' : '0 0 8px rgba(37, 99, 235, 0.15)',
      },
      work: {
        bg: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(126, 34, 206, 0.12)',
        border: isDark ? 'rgba(192, 132, 252, 0.4)' : 'rgba(126, 34, 206, 0.35)',
        text: isDark ? '#d8b4fe' : '#7c3aed',
        glow: isDark ? '0 0 10px rgba(168, 85, 247, 0.25)' : '0 0 8px rgba(126, 34, 206, 0.15)',
      },
      others: {
        bg: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(5, 150, 105, 0.12)',
        border: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(5, 150, 105, 0.35)',
        text: isDark ? '#86efac' : '#059669',
        glow: isDark ? '0 0 10px rgba(34, 197, 94, 0.25)' : '0 0 8px rgba(5, 150, 105, 0.15)',
      },
    };
    return map[label];
  };

  const mutation = useMutation({
    mutationFn: async (): Promise<CheckoutResponse> => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authUser?.email || '',
          firstName: selectedAddress?.name?.split(' ')[0] || '',
          lastName: selectedAddress?.name?.split(' ').slice(1).join(' ') || '',
          address: selectedAddress?.address || '',
          city: selectedAddress?.city || '',
          state: selectedAddress?.state || '',
          zipCode: selectedAddress?.zipCode || '',
          country: selectedAddress?.country || '',
          phone: selectedAddress?.phone || '',
          items: cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          subtotal: subtotal.toFixed(2),
          shipping: shipping.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          deliveryType: 'standard',
          giftWrapping: false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Checkout failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Stash the pending order + total so the payment gateway knows what to charge.
      // The gateway will setLastOrderId + clear pending + switch to order-confirmation
      // once payment is verified. (Cart is cleared here since the order is already created.)
      //
      // We ALSO stash a full order snapshot (items + breakdown) so the order-confirmation
      // page can render WITHOUT calling /api/orders/[id] (which requires auth and would
      // 401 for guest checkouts). The snapshot is built from the checkout API response,
      // which now includes items[], subtotal, shipping, tax, discount, total, etc.
      //
      // IMPORTANT: useStore.getState() is used for ALL updates (not the destructured
      // hooks) because React Query mutation onSuccess callbacks can capture stale closures
      // if the component re-renders between mutate() and the response. getState() always
      // reads the live store. This is the recommended pattern for mutation side-effects.
      const store = useStore.getState();
      // Reset the payment-failure flag so this fresh checkout starts the simulation
      // from the beginning (processing → failed → success). The flag may be true
      // if the user previously clicked "View Failure Details" on an earlier order
      // and then came back to checkout a new order.
      store.setHasFailedPayment(false);
      store.setFailureReason(null);
      store.setPendingOrder(data.orderId, data.total);
      store.setLastOrderSnapshot({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        status: data.status,
        subtotal: data.subtotal,
        shipping: data.shipping,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        estimatedDelivery: data.estimatedDelivery,
        createdAt: data.createdAt,
        items: (data.items ?? []).map((item: {
          id?: string;
          productId: string;
          name: string;
          price: number;
          image: string | null;
          quantity: number;
          variantId?: string | null;
          variantName?: string | null;
        }) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          variantId: item.variantId ?? null,
          variantName: item.variantName ?? null,
        })),
      });
      store.clearCart();
      store.setView('payment-gateway');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p style={{ color: textMuted }}>{t('cart.empty')}</p>
        <Button
          onClick={() => setView('home')}
          className="mt-4 luxury-accent-gradient-bg text-stone-950 hover:opacity-90 transition-all duration-200"
        >
          {t('cart.shopNow')}
        </Button>
      </div>
    );
  }

  // ── Address Form Component (reused for add & edit) ──
  const renderAddressForm = (mode: 'add' | 'edit') => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div
        className="rounded-xl p-5 mt-3 space-y-4"
        style={{
          background: isDark ? 'rgba(212, 164, 55, 0.04)' : 'rgba(212, 164, 55, 0.03)',
          border: isDark ? '1px solid rgba(212, 164, 55, 0.12)' : '1px solid rgba(212, 164, 55, 0.1)',
        }}
      >
        <div className="flex items-center justify-between">
          <h4 style={{ color: textPrimary, fontFamily: "'Urbanist', sans-serif" }} className="text-sm font-semibold">
            {mode === 'edit' ? 'Edit Address' : 'Add New Address'}
          </h4>
          <button
            type="button"
            onClick={closeForm}
            style={{ color: textMuted }}
            className="text-xs hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
        </div>

        {/* Label Selector */}
        <div>
          <Label style={{ color: textSecondary }} className="text-xs mb-2 block">Address Type</Label>
          <div className="flex items-center gap-2">
            {(['home', 'work', 'others'] as const).map((label) => {
              const LIcon = getLabelIcon(label);
              const lStyle = getLabelColors(label, addressForm.label === label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAddressForm((f) => ({ ...f, label }))}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200"
                  style={{
                    background: lStyle.bg,
                    border: `1px solid ${lStyle.border}`,
                    color: lStyle.text,
                    boxShadow: lStyle.glow,
                  }}
                >
                  <LIcon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label style={{ color: textSecondary }} className="text-xs">Full Name</Label>
            <Input
              value={addressForm.name}
              onChange={(e) => setAddressForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={authUser?.name || 'Your Name'}
              className="mt-1 text-sm"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
            />
          </div>
          <div>
            <Label style={{ color: textSecondary }} className="text-xs">Phone</Label>
            <Input
              value={addressForm.phone}
              onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210"
              className="mt-1 text-sm"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
            />
          </div>
          <div className="sm:col-span-2">
            <Label style={{ color: textSecondary }} className="text-xs">Address</Label>
            <Input
              value={addressForm.address}
              onChange={(e) => setAddressForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="House No, Street, Area"
              className="mt-1 text-sm"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
            />
          </div>
          <div>
            <Label style={{ color: textSecondary }} className="text-xs">City</Label>
            <Input
              value={addressForm.city}
              onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="City"
              className="mt-1 text-sm"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
            />
          </div>
          <div>
            <Label style={{ color: textSecondary }} className="text-xs">State</Label>
            <Input
              value={addressForm.state}
              onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="State"
              className="mt-1 text-sm"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
            />
          </div>
          <div>
            <Label style={{ color: textSecondary }} className="text-xs">ZIP Code</Label>
            <Input
              value={addressForm.zipCode}
              onChange={(e) => setAddressForm((f) => ({ ...f, zipCode: e.target.value }))}
              placeholder="560064"
              className="mt-1 text-sm"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
            />
          </div>
          <div>
            <Label style={{ color: textSecondary }} className="text-xs">Country</Label>
            <Input
              value={addressForm.country}
              onChange={(e) => setAddressForm((f) => ({ ...f, country: e.target.value }))}
              placeholder="India"
              className="mt-1 text-sm"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }}
            />
          </div>
        </div>

        {/* ── Set as Default Toggle ── */}
        <div
          className="flex items-center justify-between pt-2 pb-1"
          style={{ borderTop: isDark ? '1px solid rgba(212, 164, 55, 0.08)' : '1px solid rgba(212, 164, 55, 0.06)' }}
        >
          <div className="flex items-center gap-2">
            <Star
              className="h-4 w-4"
              style={{
                color: addressForm.isDefault ? accentColor : textMuted,
                fill: addressForm.isDefault ? accentColor : 'none',
              }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: addressForm.isDefault ? accentColor : textSecondary }}
            >
              Set as Default Address
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAddressForm((f) => ({ ...f, isDefault: !f.isDefault }))}
            className="relative h-6 w-11 rounded-full transition-all duration-300"
            style={{
              background: addressForm.isDefault
                ? accentColor
                : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}
          >
            <motion.div
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              animate={{ left: addressForm.isDefault ? '22px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="button"
            onClick={mode === 'edit' ? handleEditAddress : handleAddAddress}
            className="luxury-accent-gradient-bg text-stone-950 hover:opacity-90 hover:shadow-lg font-semibold transition-all duration-200"
          >
            {mode === 'edit' ? 'Save Changes' : 'Add Address'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={closeForm}
            style={{ color: textMuted }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-8"
    >
      {/* ── Back Button ── */}
      <Button
        onClick={() => setView('cart')}
        className="mb-6 gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-[1.02]"
        style={{
          background: isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.08)',
          border: isDark ? '1px solid rgba(212, 164, 55, 0.25)' : '1px solid rgba(212, 164, 55, 0.2)',
          color: isDark ? '#dbaf36' : '#b8860b',
          boxShadow: isDark ? '0 0 12px rgba(219, 175, 54, 0.08)' : '0 0 8px rgba(219, 175, 54, 0.06)',
          fontFamily: "'Urbanist', sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.2)' : 'rgba(212, 164, 55, 0.15)';
          e.currentTarget.style.borderColor = isDark ? 'rgba(212, 164, 55, 0.4)' : 'rgba(212, 164, 55, 0.35)';
          e.currentTarget.style.boxShadow = isDark ? '0 0 16px rgba(219, 175, 54, 0.15)' : '0 0 12px rgba(219, 175, 54, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.08)';
          e.currentTarget.style.borderColor = isDark ? '1px solid rgba(212, 164, 55, 0.25)' : '1px solid rgba(212, 164, 55, 0.2)';
          e.currentTarget.style.boxShadow = isDark ? '0 0 12px rgba(219, 175, 54, 0.08)' : '0 0 8px rgba(219, 175, 54, 0.06)';
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back To Cart
      </Button>

      {/* ── Step Indicator ── */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-0">
          {/* Step 1: Checkout */}
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: isDark ? 'rgba(212, 164, 55, 0.9)' : 'rgba(212, 164, 55, 0.85)',
                boxShadow: isDark
                  ? '0 0 12px rgba(219, 175, 54, 0.5), 0 0 24px rgba(219, 175, 54, 0.25)'
                  : '0 0 10px rgba(219, 175, 54, 0.35), 0 0 20px rgba(219, 175, 54, 0.15)',
                border: '2px solid rgba(245, 230, 163, 0.6)',
              }}
            >
              <Check className="h-4 w-4 text-stone-950" />
            </motion.div>
            <span
              className="text-sm font-semibold uppercase tracking-wider"
              style={{
                color: isDark ? '#dbaf36' : '#b8860b',
                textShadow: isDark ? '0 0 8px rgba(219, 175, 54, 0.3)' : '0 0 6px rgba(219, 175, 54, 0.15)',
                fontFamily: "'Urbanist', sans-serif",
              }}
            >
              Check out
            </span>
          </div>

          <div className="mx-4 h-px w-16 sm:w-24" style={{ background: isDark ? 'linear-gradient(90deg, rgba(212, 164, 55, 0.6), rgba(212, 164, 55, 0.15))' : 'linear-gradient(90deg, rgba(212, 164, 55, 0.4), rgba(212, 164, 55, 0.1))' }} />

          {/* Step 2: Payment */}
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: mutation.isPending
                  ? (isDark ? 'rgba(212, 164, 55, 0.9)' : 'rgba(212, 164, 55, 0.85)')
                  : mutation.isError
                    ? 'rgba(220, 38, 38, 0.9)'
                    : (isDark ? 'rgba(28, 25, 23, 0.6)' : 'rgba(0,0,0,0.06)'),
                boxShadow: mutation.isPending
                  ? (isDark ? '0 0 12px rgba(219, 175, 54, 0.5), 0 0 24px rgba(219, 175, 54, 0.25)' : '0 0 10px rgba(219, 175, 54, 0.35), 0 0 20px rgba(219, 175, 54, 0.15)')
                  : mutation.isError
                    ? '0 0 12px rgba(220, 38, 38, 0.5), 0 0 24px rgba(220, 38, 38, 0.25)'
                    : '0 0 4px rgba(212, 164, 55, 0.1)',
                border: mutation.isPending
                  ? '2px solid rgba(245, 230, 163, 0.6)'
                  : mutation.isError
                    ? '2px solid rgba(248, 113, 113, 0.6)'
                    : (isDark ? '2px solid rgba(212, 164, 55, 0.15)' : '2px solid rgba(0,0,0,0.08)'),
                transition: 'all 0.5s ease',
              }}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 text-stone-950 animate-spin" />
              ) : mutation.isError ? (
                <XCircle className="h-4 w-4 text-white" />
              ) : (
                <CreditCard className="h-4 w-4" style={{ color: isDark ? 'rgba(212, 164, 55, 0.4)' : 'rgba(0,0,0,0.2)' }} />
              )}
            </motion.div>
            <span
              className="text-sm font-semibold uppercase tracking-wider"
              style={{
                color: mutation.isPending
                  ? (isDark ? '#dbaf36' : '#b8860b')
                  : mutation.isError
                    ? '#f87171'
                    : (isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(0,0,0,0.2)'),
                textShadow: mutation.isPending
                  ? (isDark ? '0 0 8px rgba(219, 175, 54, 0.3)' : '0 0 6px rgba(219, 175, 54, 0.15)')
                  : mutation.isError
                    ? '0 0 8px rgba(248, 113, 113, 0.3)'
                    : 'none',
                fontFamily: "'Urbanist', sans-serif",
                transition: 'all 0.5s ease',
              }}
            >
              Payment
            </span>
          </div>

          <div className="mx-4 h-px w-16 sm:w-24" style={{ background: isDark ? 'linear-gradient(90deg, rgba(212, 164, 55, 0.15), rgba(212, 164, 55, 0.06))' : 'linear-gradient(90deg, rgba(212, 164, 55, 0.1), rgba(212, 164, 55, 0.04))' }} />

          {/* Step 3: Confirmation */}
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: isDark ? 'rgba(28, 25, 23, 0.6)' : 'rgba(0,0,0,0.06)',
                boxShadow: '0 0 4px rgba(212, 164, 55, 0.1)',
                border: isDark ? '2px solid rgba(212, 164, 55, 0.15)' : '2px solid rgba(0,0,0,0.08)',
                transition: 'all 0.5s ease',
              }}
            >
              <CheckCircle className="h-4 w-4" style={{ color: isDark ? 'rgba(212, 164, 55, 0.4)' : 'rgba(0,0,0,0.2)' }} />
            </motion.div>
            <span
              className="text-sm font-semibold uppercase tracking-wider"
              style={{
                color: isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(0,0,0,0.2)',
                fontFamily: "'Urbanist', sans-serif",
                transition: 'all 0.5s ease',
              }}
            >
              Confirmation
            </span>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold" style={{ color: textPrimary, fontFamily: "'Urbanist', sans-serif" }}>{t('checkout.title')}</h2>

      <form onSubmit={handleSubmit}>
        <div className="mt-6 grid gap-8 lg:grid-cols-3 lg:items-start">
          {/* ── Left Column: Delivering To ── */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl overflow-hidden"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
                WebkitBackdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
              }}
            >
              {/* ── Header ── */}
              <div
                className="px-6 py-5"
                style={{
                  background: isDark ? 'linear-gradient(135deg, rgba(212, 164, 55, 0.08) 0%, rgba(212, 164, 55, 0.02) 100%)' : 'linear-gradient(135deg, rgba(212, 164, 55, 0.06) 0%, rgba(212, 164, 55, 0.01) 100%)',
                  borderBottom: isDark ? '1px solid rgba(212, 164, 55, 0.1)' : '1px solid rgba(212, 164, 55, 0.08)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.1)',
                      border: isDark ? '1px solid rgba(212, 164, 55, 0.25)' : '1px solid rgba(212, 164, 55, 0.2)',
                      boxShadow: isDark ? '0 0 12px rgba(219, 175, 54, 0.1)' : '0 0 8px rgba(219, 175, 54, 0.06)',
                    }}
                  >
                    <Truck className="h-5 w-5" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-bold"
                      style={{ color: accentColor, fontFamily: "'Urbanist', sans-serif" }}
                    >
                      Delivering to {authUser?.name || 'Customer'}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                      {savedAddresses.length} saved address{savedAddresses.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Set Current Location Bar ── */}
              <div
                className="mx-6 mt-4 mb-0"
                style={{
                  borderTop: isDark ? '1px solid rgba(212, 164, 55, 0.08)' : '1px solid rgba(212, 164, 55, 0.06)',
                }}
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 mt-3"
                  style={{
                    background: isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)',
                    border: isDark ? '1px solid rgba(212, 164, 55, 0.12)' : '1px solid rgba(212, 164, 55, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.08)';
                    e.currentTarget.style.borderColor = isDark ? 'rgba(212, 164, 55, 0.25)' : 'rgba(212, 164, 55, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)';
                    e.currentTarget.style.borderColor = isDark ? '1px solid rgba(212, 164, 55, 0.12)' : '1px solid rgba(212, 164, 55, 0.1)';
                  }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                    style={{
                      background: isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.08)',
                      border: isDark ? '1px solid rgba(212, 164, 55, 0.2)' : '1px solid rgba(212, 164, 55, 0.15)',
                    }}
                  >
                    <LocateFixed className="h-4 w-4" style={{ color: accentColor }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold" style={{ color: accentColor, fontFamily: "'Urbanist', sans-serif" }}>
                      Set Current Location
                    </p>
                    <p className="text-[11px]" style={{ color: textMuted }}>Use GPS to auto-fill your address</p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: textMuted }} />
                </motion.button>
              </div>

              {/* ── Address Cards ── */}
              <div className="p-6 space-y-4">
                {savedAddresses.map((addr) => {
                  const isSelected = addr.id === selectedAddressId;
                  const LabelIcon = getLabelIcon(addr.label);
                  const labelStyle = getLabelColors(addr.label, true);
                  const isEditing = editingAddressId === addr.id;

                  return (
                    <div key={addr.id}>
                      {/* ── Single Address Card ── */}
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="relative rounded-xl p-5 transition-all duration-300 cursor-pointer"
                        style={{
                          background: isSelected
                            ? (isDark ? 'linear-gradient(135deg, rgba(212, 164, 55, 0.08) 0%, rgba(212, 164, 55, 0.02) 100%)' : 'linear-gradient(135deg, rgba(212, 164, 55, 0.06) 0%, rgba(255,255,255,0.6) 100%)')
                            : (isDark ? 'rgba(12, 10, 9, 0.4)' : 'rgba(255,255,255,0.5)'),
                          border: isSelected
                            ? (isDark ? '1px solid rgba(212, 164, 55, 0.3)' : '1px solid rgba(212, 164, 55, 0.25)')
                            : (isDark ? '1px solid rgba(212, 164, 55, 0.08)' : '1px solid rgba(212, 164, 55, 0.1)'),
                          boxShadow: isSelected
                            ? (isDark ? '0 0 20px rgba(219, 175, 54, 0.08), inset 0 1px 0 rgba(212, 164, 55, 0.05)' : '0 0 16px rgba(219, 175, 54, 0.06), inset 0 1px 0 rgba(212, 164, 55, 0.04)')
                            : 'none',
                        }}
                        onClick={() => setSelectedAddressId(addr.id)}
                      >
                        {/* Selected gold ring */}
                        {isSelected && (
                          <div
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{
                              border: isDark ? '2px solid rgba(212, 164, 55, 0.2)' : '2px solid rgba(212, 164, 55, 0.15)',
                              boxShadow: isDark ? '0 0 16px rgba(219, 175, 54, 0.06)' : '0 0 10px rgba(219, 175, 54, 0.04)',
                            }}
                          />
                        )}

                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Map Pin Icon */}
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
                              style={{
                                background: isSelected
                                  ? (isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.1)')
                                  : (isDark ? 'rgba(12, 10, 9, 0.5)' : 'rgba(0,0,0,0.04)'),
                                border: isSelected
                                  ? (isDark ? '1px solid rgba(212, 164, 55, 0.25)' : '1px solid rgba(212, 164, 55, 0.2)')
                                  : (isDark ? '1px solid rgba(212, 164, 55, 0.08)' : '1px solid rgba(0,0,0,0.06)'),
                              }}
                            >
                              <MapPin className="h-4 w-4" style={{ color: accentColor, opacity: isSelected ? 1 : 0.4 }} />
                            </div>

                            {/* Address Details */}
                            <div className="flex-1 min-w-0">
                              {/* Label Badge + Default Badge */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <div
                                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                                  style={{
                                    background: labelStyle.bg,
                                    border: `1px solid ${labelStyle.border}`,
                                    boxShadow: labelStyle.glow,
                                  }}
                                >
                                  <LabelIcon className="h-3 w-3" style={{ color: labelStyle.text }} />
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: labelStyle.text }}>
                                    {addr.label}
                                  </span>
                                </div>
                                {addr.isDefault && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                    style={{
                                      color: accentColor,
                                      background: isDark ? 'rgba(212, 164, 55, 0.1)' : 'rgba(212, 164, 55, 0.08)',
                                      border: isDark ? '1px solid rgba(212, 164, 55, 0.2)' : '1px solid rgba(212, 164, 55, 0.15)',
                                    }}
                                  >
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Default
                                  </span>
                                )}
                              </div>

                              <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{addr.name}</p>
                              <p className="text-sm mt-0.5 leading-relaxed" style={{ color: textSecondary }}>{addr.address}</p>
                              <p className="text-sm" style={{ color: textSecondary }}>
                                {addr.city}, {addr.state} - {addr.zipCode}
                              </p>
                              <p className="text-sm" style={{ color: textSecondary }}>{addr.country}</p>
                              {addr.phone && (
                                <p className="text-xs mt-1.5" style={{ color: textMuted }}>Phone: {addr.phone}</p>
                              )}
                            </div>
                          </div>

                          {/* Edit & Delete Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isEditing) {
                                  closeForm();
                                } else {
                                  openEditForm(addr);
                                }
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
                              style={{
                                background: isEditing
                                  ? (isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.1)')
                                  : (isDark ? 'rgba(12, 10, 9, 0.5)' : 'rgba(0,0,0,0.04)'),
                                border: isEditing
                                  ? (isDark ? '1px solid rgba(212, 164, 55, 0.3)' : '1px solid rgba(212, 164, 55, 0.25)')
                                  : (isDark ? '1px solid rgba(212, 164, 55, 0.08)' : '1px solid rgba(0,0,0,0.06)'),
                                color: isEditing ? accentColor : textMuted,
                              }}
                              title="Edit address"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAddress(addr.id);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
                              style={{
                                background: isDark ? 'rgba(220, 38, 38, 0.08)' : 'rgba(220, 38, 38, 0.05)',
                                border: isDark ? '1px solid rgba(220, 38, 38, 0.15)' : '1px solid rgba(220, 38, 38, 0.12)',
                                color: isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(220, 38, 38, 0.5)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isDark ? 'rgba(220, 38, 38, 0.15)' : 'rgba(220, 38, 38, 0.1)';
                                e.currentTarget.style.borderColor = isDark ? 'rgba(220, 38, 38, 0.3)' : 'rgba(220, 38, 38, 0.25)';
                                e.currentTarget.style.color = isDark ? '#f87171' : '#dc2626';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isDark ? 'rgba(220, 38, 38, 0.08)' : 'rgba(220, 38, 38, 0.05)';
                                e.currentTarget.style.borderColor = isDark ? '1px solid rgba(220, 38, 38, 0.15)' : '1px solid rgba(220, 38, 38, 0.12)';
                                e.currentTarget.style.color = isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(220, 38, 38, 0.5)';
                              }}
                              title="Delete address"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* ── Label Switcher: Home / Work / Others ── */}
                        <div
                          className="flex items-center gap-2 mt-4 pt-3"
                          style={{ borderTop: isDark ? '1px solid rgba(212, 164, 55, 0.08)' : '1px solid rgba(212, 164, 55, 0.06)' }}
                        >
                          <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: textMuted }}>Tag as:</span>
                          {(['home', 'work', 'others'] as const).map((label) => {
                            const LIcon = getLabelIcon(label);
                            const lStyle = getLabelColors(label, addr.label === label);
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChangeLabel(addr.id, label);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
                                style={{
                                  background: lStyle.bg,
                                  border: `1px solid ${lStyle.border}`,
                                  color: lStyle.text,
                                  boxShadow: lStyle.glow,
                                }}
                              >
                                <LIcon className="h-3 w-3" />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>

                      {/* ── Edit Form (appears right under this address) ── */}
                      <AnimatePresence>
                        {isEditing && renderAddressForm('edit')}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* ── Add New Address Button ── */}
                {!addingNew && (
                  <motion.button
                    type="button"
                    onClick={openAddForm}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-4 text-sm font-medium transition-all duration-300"
                    style={{
                      borderColor: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.12)',
                      background: isDark ? 'rgba(28, 25, 23, 0.3)' : 'rgba(255,255,255,0.3)',
                      color: textMuted,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(212, 164, 55, 0.25)';
                      e.currentTarget.style.color = accentColor;
                      e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.12)';
                      e.currentTarget.style.color = textMuted;
                      e.currentTarget.style.background = isDark ? 'rgba(28, 25, 23, 0.3)' : 'rgba(255,255,255,0.3)';
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add New Address
                  </motion.button>
                )}

                {/* ── Add New Address Form ── */}
                <AnimatePresence>
                  {addingNew && renderAddressForm('add')}
                </AnimatePresence>

                {/* ── Delivery Estimate ── */}
                <div
                  className="flex items-center gap-3 rounded-xl p-4 mt-2"
                  style={{
                    background: isDark ? 'rgba(12, 10, 9, 0.4)' : 'rgba(255,255,255,0.4)',
                    border: isDark ? '1px solid rgba(212, 164, 55, 0.08)' : '1px solid rgba(212, 164, 55, 0.08)',
                  }}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{
                      background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(5, 150, 105, 0.08)',
                      border: isDark ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(5, 150, 105, 0.15)',
                    }}
                  >
                    <Package className="h-4 w-4" style={{ color: isDark ? '#4ade80' : '#059669' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>
                      Standard Delivery
                      {subtotal > 500 ? (
                        <span style={{ color: isDark ? '#4ade80' : '#059669' }} className="ml-1">Free</span>
                      ) : (
                        <span style={{ color: textSecondary }} className="ml-1">{format(50)}</span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: textMuted }}>Estimated 5-7 business days</p>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto" style={{ color: textMuted }} />
                </div>

                {/* ── Secure Checkout Assurance Block ── */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="rounded-xl overflow-hidden mt-2"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(212, 164, 55, 0.08) 0%, rgba(28, 25, 23, 0.7) 50%, rgba(212, 164, 55, 0.06) 100%)'
                      : 'linear-gradient(135deg, rgba(212, 164, 55, 0.06) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(212, 164, 55, 0.04) 100%)',
                    border: isDark
                      ? '1px solid rgba(212, 164, 55, 0.2)'
                      : '1px solid rgba(212, 164, 55, 0.18)',
                    boxShadow: isDark
                      ? '0 0 30px rgba(219, 175, 54, 0.06), inset 0 1px 0 rgba(212, 164, 55, 0.08)'
                      : '0 0 20px rgba(219, 175, 54, 0.04), inset 0 1px 0 rgba(212, 164, 55, 0.06)',
                  }}
                >
                  {/* ── Header: Lock icon + Title ── */}
                  <div
                    className="px-5 py-4"
                    style={{
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(212, 164, 55, 0.1) 0%, rgba(212, 164, 55, 0.02) 100%)'
                        : 'linear-gradient(135deg, rgba(212, 164, 55, 0.08) 0%, rgba(212, 164, 55, 0.01) 100%)',
                      borderBottom: isDark
                        ? '1px solid rgba(212, 164, 55, 0.12)'
                        : '1px solid rgba(212, 164, 55, 0.1)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
                        style={{
                          background: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.1)',
                          border: isDark ? '1px solid rgba(212, 164, 55, 0.3)' : '1px solid rgba(212, 164, 55, 0.25)',
                          boxShadow: isDark ? '0 0 12px rgba(219, 175, 54, 0.15)' : '0 0 8px rgba(219, 175, 54, 0.08)',
                        }}
                      >
                        <Lock className="h-4 w-4" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <h4
                          className="text-base font-bold"
                          style={{ color: accentColor, fontFamily: "'Urbanist', sans-serif" }}
                        >
                          Secure Checkout
                        </h4>
                        <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                          Complete your payment confidently
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Body ── */}
                  <div className="px-5 py-4 space-y-4">
                    {/* Razorpay trust line */}
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck
                        className="h-4 w-4 mt-0.5 flex-shrink-0"
                        style={{ color: isDark ? '#4ade80' : '#059669' }}
                      />
                      <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                        Powered by <span className="font-semibold" style={{ color: isDark ? '#f5d063' : '#b8860b' }}>Razorpay</span>'s trusted payment infrastructure with bank-grade encryption.
                      </p>
                    </div>

                    {/* Accepted Methods */}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2.5" style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}>
                        Accepted Methods
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* UPI */}
                        <div
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                          }}
                        >
                          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0.5" y="0.5" width="17" height="13" rx="2" stroke={isDark ? 'rgba(245,230,163,0.4)' : 'rgba(28,25,23,0.3)'} strokeDasharray="2 1" />
                            <text x="9" y="9.5" textAnchor="middle" fontSize="6" fontWeight="700" fill={accentColor} fontFamily="sans-serif">UPI</text>
                          </svg>
                          <span className="text-[10px] font-semibold" style={{ color: textSecondary }}>UPI</span>
                        </div>
                        {/* Credit Card */}
                        <div
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                          }}
                        >
                          <CreditCard className="h-3.5 w-3.5" style={{ color: accentColor }} />
                          <span className="text-[10px] font-semibold" style={{ color: textSecondary }}>Cards</span>
                        </div>
                        {/* Net Banking */}
                        <div
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                          }}
                        >
                          <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1" y="3" width="14" height="10" rx="1.5" stroke={accentColor} strokeWidth="1.2" />
                            <line x1="1" y1="6" x2="15" y2="6" stroke={accentColor} strokeWidth="1" />
                            <rect x="3" y="8.5" width="4" height="1.5" rx="0.5" fill={isDark ? 'rgba(245,230,163,0.3)' : 'rgba(28,25,23,0.2)'} />
                          </svg>
                          <span className="text-[10px] font-semibold" style={{ color: textSecondary }}>Net Banking</span>
                        </div>
                        {/* Wallets */}
                        <div
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                          }}
                        >
                          <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1" y="2" width="14" height="10" rx="2" stroke={accentColor} strokeWidth="1.2" />
                            <circle cx="12" cy="8" r="2" fill={isDark ? 'rgba(245,230,163,0.3)' : 'rgba(28,25,23,0.2)'} />
                          </svg>
                          <span className="text-[10px] font-semibold" style={{ color: textSecondary }}>Wallets</span>
                        </div>
                      </div>
                    </div>

                    {/* Credential safety note */}
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                      style={{
                        background: isDark ? 'rgba(34, 197, 94, 0.06)' : 'rgba(5, 150, 105, 0.04)',
                        border: isDark ? '1px solid rgba(34, 197, 94, 0.12)' : '1px solid rgba(5, 150, 105, 0.1)',
                      }}
                    >
                      <Shield className="h-3.5 w-3.5 flex-shrink-0" style={{ color: isDark ? '#4ade80' : '#059669' }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: isDark ? 'rgba(74, 222, 128, 0.7)' : 'rgba(5, 150, 105, 0.7)' }}>
                        Your payment credentials remain secure and are never stored by us.
                      </p>
                    </div>

                    {/* ── Compliance badges footer ── */}
                    <div
                      className="flex flex-wrap items-center justify-center gap-4 pt-3"
                      style={{
                        borderTop: isDark
                          ? '1px solid rgba(212, 164, 55, 0.1)'
                          : '1px solid rgba(212, 164, 55, 0.08)',
                      }}
                    >
                      {/* Powered by Razorpay */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="flex h-5 w-5 items-center justify-center rounded"
                          style={{ background: isDark ? 'rgba(212, 164, 55, 0.1)' : 'rgba(212, 164, 55, 0.08)' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 6L5 9L10 3" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}>Razorpay</span>
                      </div>
                      {/* SSL Encrypted */}
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3 w-3" style={{ color: isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(5, 150, 105, 0.5)' }} />
                        <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}>SSL Encrypted</span>
                      </div>
                      {/* PCI DSS Compliant */}
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3" style={{ color: isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(5, 150, 105, 0.5)' }} />
                        <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}>PCI DSS</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* ── Order Summary Sidebar ── */}
          <div
            className="lg:sticky lg:top-45 h-fit rounded-xl p-6"
            style={{
              background: isDark ? 'rgba(28, 25, 23, 0.8)' : 'rgba(255, 255, 255, 0.95)',
              border: isDark ? '1px solid rgba(212, 164, 55, 0.15)' : '1px solid rgba(212, 164, 55, 0.2)',
              backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
              WebkitBackdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
            }}
          >
            <div className="flex items-center justify-between">
  <h3
    className="text-lg font-semibold"
    style={{
      color: textPrimary,
      fontFamily: "'Urbanist', sans-serif",
      letterSpacing: '-0.01em',
    }}
  >
    {t('cart.orderSummary')}
  </h3>
  <video
    src="/images/check-out.mp4"
    autoPlay
    loop
    muted
    playsInline
    className="h-30 w-45 object-contain"
  />
</div>

            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="truncate mr-2" style={{ color: textSecondary }}>
                    {item.name} x{item.quantity}
                  </span>
                  <span className="flex-shrink-0" style={{ color: textPrimary }}>
                    {format(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator style={{ background: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.12)', margin: '16px 0' }} />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: textMuted }}>{t('cart.subtotal')}</span>
                <span style={{ color: textPrimary }}>{format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: textMuted }}>{t('cart.shipping')}</span>
                <span style={{ color: textPrimary }}>
                  {shipping === 0 ? (
                    <span style={{ color: isDark ? '#4ade80' : '#059669' }}>{t('common.free')}</span>
                  ) : (
                    format(shipping)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: textMuted }}>{t('cart.tax')}</span>
                <span style={{ color: textPrimary }}>{format(tax)}</span>
              </div>
              <Separator style={{ background: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.12)' }} />
              <div className="flex justify-between">
                <span className="font-semibold" style={{ color: textPrimary }}>{t('cart.total')}</span>
                <span className="text-lg font-bold" style={{ color: accentColor }}>
                  {format(total)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="mt-6 w-full luxury-accent-gradient-bg text-stone-950 hover:opacity-90 hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('checkout.processing')}
                </>
              ) : (
                `${t('checkout.placeOrder')} - ${format(total)}`
              )}
            </Button>

            {mutation.error && (
              <p className="mt-3 text-center text-sm text-red-400">
                {mutation.error.message}
              </p>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
}
