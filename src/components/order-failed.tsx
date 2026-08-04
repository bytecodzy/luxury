'use client';

/**
 * OrderFailedView
 * ──────────────────
 * Order-failure page for 3 Boxes Luxury — visual sibling of OrderConfirmation.
 *
 * Layout (top → bottom):
 *   1. Brand video block          — `/images/order-failed.mp4` (user uploads this asset,
 *                                    different from the order-confirmed.mp4 used on
 *                                    the success page)
 *   2. "Order Failed!" heading + "Your payment could not be completed" subheading
 *   3. Order info card:
 *        • Product image (large, first item)
 *        • Product name (BIG, gold)
 *        • Order ID (mono, gold)
 *        • Order date + Reason for failure (two-column row)
 *        • "Shipping & Returns" link → setView('shipping')
 *        • Order summary (Subtotal / Shipping / Tax / Total)
 *   4. Action button row (4 buttons):
 *        • Try Again           — setView('payment-gateway')  (re-runs the simulation;
 *                                 the retry succeeds because hasFailedPayment is true)
 *        • View Orders         — setView('orders')
 *        • Continue Shopping   — setView('home')
 *        • Contact Support     — setView('contact')
 *
 * Data sourcing:
 *   Same strategy as OrderConfirmation — uses `lastOrderSnapshot` from the store
 *   (set at checkout time) so the page renders instantly for both logged-in AND
 *   guest users without an API call. The `failureReason` is also pulled from the
 *   store; it's set by payment-gateway-view when the user clicks "View Failure
 *   Details". If no reason was stashed, a sensible default is shown.
 *
 * Theme: matches the rest of the app — gold accent (#dbaf36), Lora headings,
 * Urbanist body, dark/light adaptive, `luxury-accent-gradient-bg` for primary
 * actions. Failure indicators use a muted red (not the gold accent) so the user
 * instantly recognizes the page is an error state.
 */

import { useStore, type OrderSnapshot } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  XCircle, ShoppingBag, Package, RefreshCw,
  Calendar, ArrowRight, Loader2, ImageIcon, AlertCircle, Home, LifeBuoy,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// ── Types matching the /api/orders/[id] response (fallback path) ──
interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  variantId?: string | null;
  variantName?: string | null;
  giftWrapping?: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number | null;
  total: number;
  createdAt: string;
  estimatedDelivery: string | null;
  items: OrderItem[];
}

interface OrderResponse {
  order: Order;
}

// ── Default failure reason ──
// Used if the store doesn't have a `failureReason` stashed (e.g., user navigated
// here directly via URL, or the payment-gateway didn't set one). In production
// this will always be the Razorpay error.description.
const DEFAULT_FAILURE_REASON =
  'Your payment was declined by the bank. This often happens due to insufficient funds, incorrect card details, or a bank security check. Please try again with a different payment method or contact your bank.';

// ── Helper: format currency in INR ──
const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

// ── Helper: format a date string as "Mon, Jan 5, 2026" ──
const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

export function OrderFailedView() {
  const {
    lastOrderId,
    lastOrderSnapshot,
    failureReason,
    setView,
    appTheme,
  } = useStore();

  const isDark = appTheme === 'dark';
  const accent = 'var(--luxury-accent, #dbaf36)';
  // Failure-themed color: muted red. Distinct from the gold accent so the user
  // instantly recognizes this is an error state, not a success state.
  const failColor = isDark ? '#f87171' : '#dc2626';
  const failColorMuted = isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(220, 38, 38, 0.7)';

  // Theme tokens (match order-confirmation palette)
  const cardBg = isDark ? 'rgba(20, 16, 14, 0.7)' : 'rgba(255, 255, 255, 0.85)';
  const cardBorder = isDark ? 'rgba(212, 164, 55, 0.18)' : 'rgba(212, 164, 55, 0.22)';
  const inputBorder = isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(28, 25, 23, 0.12)';
  const textPrimary = isDark ? '#fffbeb' : '#1c1917';
  const textSecondary = isDark ? 'rgba(245, 230, 163, 0.75)' : 'rgba(28, 25, 23, 0.75)';
  const textMuted = isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)';
  const labelColor = isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(28, 25, 23, 0.55)';

  // ── Data sourcing ──
  // PRIMARY: use the `lastOrderSnapshot` stashed in the store at checkout time.
  // This works for BOTH logged-in AND guest users — no API call needed.
  //
  // FALLBACK: only if the snapshot is missing do we try fetching /api/orders/[id].
  // The route requires auth, so it will 401 for guests — in that case we show a
  // friendly error state instead of looping on a loading spinner forever.
  const snapshot = lastOrderSnapshot as OrderSnapshot | null;
  const shouldFetch = !snapshot && !!lastOrderId;
  const { data: fetchedData, isLoading: fetching } = useQuery<OrderResponse>({
    queryKey: ['order', lastOrderId, 'failed'],
    queryFn: () =>
      fetch(`/api/orders/${lastOrderId}`).then((r) => {
        if (!r.ok) throw new Error('Failed to load order');
        return r.json();
      }),
    enabled: shouldFetch,
    retry: 1,
    staleTime: 60_000,
  });

  // Build a unified `order` object from either source.
  const order: Order | null = useMemo(() => {
    if (snapshot) {
      return {
        id: snapshot.orderId,
        orderNumber: snapshot.orderNumber,
        status: snapshot.status,
        subtotal: snapshot.subtotal,
        shipping: snapshot.shipping,
        tax: snapshot.tax,
        discount: snapshot.discount,
        total: snapshot.total,
        createdAt: snapshot.createdAt,
        estimatedDelivery: snapshot.estimatedDelivery,
        items: (snapshot.items ?? []).map((it) => ({
          id: it.id ?? it.productId,
          productId: it.productId,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          image: it.image,
          variantId: it.variantId ?? null,
          variantName: it.variantName ?? null,
        })),
      };
    }
    if (fetchedData?.order) {
      return fetchedData.order;
    }
    return null;
  }, [snapshot, fetchedData]);

  // Pick the first item as the "hero" product for the image + name display
  const heroItem = order?.items?.[0] ?? null;
  const itemCount = order?.items?.length ?? 0;

  // The failure reason from the store, falling back to a sensible default.
  const displayReason = failureReason ?? DEFAULT_FAILURE_REASON;

  // ── Loading state ──
  if (!order && shouldFetch && fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
        <p
          className="mt-4 text-sm uppercase tracking-[0.2em]"
          style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}
        >
          Loading your order…
        </p>
      </div>
    );
  }

  // ── Error state ──
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
          style={{
            background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
          }}
        >
          <AlertCircle className="h-8 w-8" style={{ color: failColor }} />
        </div>
        <h2
          className="text-xl font-bold"
          style={{ color: textPrimary, fontFamily: "'Urbanist', sans-serif" }}
        >
          We couldn&apos;t load your order
        </h2>
        <p className="mt-2 text-sm max-w-md" style={{ color: textSecondary }}>
          This usually happens if you refreshed the page or navigated here directly.
          Please return home and place your order again.
        </p>
        <Button
          onClick={() => setView('home')}
          className="mt-6 h-12 px-8 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 transition-all duration-200"
        >
          <Home className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center py-10 px-4"
    >
      <div className="w-full max-w-2xl">
        {/* ── Brand video block (top) ── */}
        {/* The user uploads their video to /public/images/order-failed.mp4
            (different from order-confirmed.mp4 used on the success page) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 flex flex-col items-center"
        >
          <video
            src="/images/order-failed.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-70 w-140 object-contain mx-auto rounded-xl"
          />
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="luxury-accent-bg h-px w-10 opacity-60" />
            <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
            <span className="luxury-accent-bg h-px w-10 opacity-60" />
          </div>
        </motion.div>

        {/* ── Heading + subheading ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
              border: `2px solid ${failColor}`,
            }}
          >
            <XCircle className="h-8 w-8" style={{ color: failColor }} />
          </motion.div>
          <h2
            className="text-3xl font-bold sm:text-4xl"
            style={{ color: failColor, fontFamily: "'Urbanist', sans-serif" }}
          >
            Order Failed!
          </h2>
          <p
            className="mt-2 text-base"
            style={{ color: textSecondary, fontFamily: "'Urbanist', sans-serif" }}
          >
            Your payment could not be completed.
          </p>
        </motion.div>

        {/* ── Order info card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 rounded-2xl p-6 sm:p-8"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
            boxShadow: isDark
              ? '0 0 60px rgba(219, 175, 54, 0.08), 0 25px 50px rgba(0, 0, 0, 0.3)'
              : '0 0 20px rgba(219, 175, 54, 0.04), 0 25px 50px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* ── Product image + name + order id ── */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Image */}
            <div
              className="relative flex h-48 w-full sm:w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${inputBorder}`,
              }}
            >
              {heroItem?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroItem.image}
                  alt={heroItem.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ color: textMuted }}>
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-[10px] uppercase tracking-wider">No image</span>
                </div>
              )}
            </div>

            {/* Name + Order ID */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {itemCount > 1 && (
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1"
                  style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}
                >
                  {itemCount} items in this order · showing first
                </p>
              )}
              <h3
                className="text-2xl sm:text-3xl font-bold leading-tight break-words"
                style={{ color: textPrimary, fontFamily: "'Urbanist', sans-serif" }}
              >
                {heroItem?.name ?? 'Your Order'}
              </h3>
              <div className="mt-3">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: labelColor, fontFamily: "'Urbanist', sans-serif" }}
                >
                  Order ID
                </p>
                <p
                  className="mt-0.5 font-mono text-sm font-semibold"
                  style={{ color: accent }}
                >
                  {order.orderNumber}
                </p>
              </div>
            </div>
          </div>

          {/* ── Dates + Reason row ── */}
          <div
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl p-4"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(220, 38, 38, 0.03) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.04) 100%)',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.2)'}`,
            }}
          >
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 shrink-0" style={{ color: accent }} />
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}
                >
                  Order Date
                </p>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: textPrimary }}>
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: failColor }} />
              <div className="min-w-0">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}
                >
                  Reason for Failure
                </p>
                <p
                  className="mt-0.5 text-sm font-medium leading-snug"
                  style={{ color: failColorMuted }}
                >
                  {displayReason}
                </p>
              </div>
            </div>
          </div>

          {/* ── Shipping & Returns link ── */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setView('shipping')}
              className="inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-colors hover:opacity-80"
              style={{ color: accent, fontFamily: "'Urbanist', sans-serif" }}
            >
              Shipping &amp; Returns
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* ── Order summary ── */}
          <div
            className="mt-2 rounded-xl p-4"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${inputBorder}`,
            }}
          >
            <p
              className="mb-3 text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: labelColor, fontFamily: "'Urbanist', sans-serif" }}
            >
              Order Summary
            </p>
            <SummaryRow label="Subtotal" value={formatINR(order.subtotal)} isDark={isDark} textMuted={textMuted} textPrimary={textPrimary} />
            <SummaryRow label="Shipping" value={formatINR(order.shipping)} isDark={isDark} textMuted={textMuted} textPrimary={textPrimary} />
            <SummaryRow label="Tax" value={formatINR(order.tax)} isDark={isDark} textMuted={textMuted} textPrimary={textPrimary} />
            {order.discount && order.discount > 0 && (
              <SummaryRow
                label="Discount"
                value={`- ${formatINR(order.discount)}`}
                isDark={isDark}
                textMuted={textMuted}
                textPrimary={textPrimary}
              />
            )}
            <div
              className="mt-2 pt-3 flex items-center justify-between"
              style={{ borderTop: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.2)' : 'rgba(212, 164, 55, 0.25)'}` }}
            >
              <span
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: textPrimary, fontFamily: "'Urbanist', sans-serif" }}
              >
                Total
              </span>
              <span
                className="text-xl font-bold"
                style={{ color: accent, fontFamily: "'Urbanist', sans-serif" }}
              >
                {formatINR(order.total)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Action buttons (4) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {/* Try Again — primary action (gold gradient) */}
          <Button
            onClick={() => setView('payment-gateway')}
            className="h-12 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 transition-all duration-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          {/* View Orders */}
          <Button
            variant="outline"
            onClick={() => setView('orders')}
            className="h-12 border-2 transition-all duration-200"
            style={{
              borderColor: isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(184, 134, 11, 0.35)',
              color: textPrimary,
            }}
          >
            <Package className="mr-2 h-4 w-4" style={{ color: accent }} />
            View Orders
          </Button>

          {/* Continue Shopping */}
          <Button
            variant="outline"
            onClick={() => setView('home')}
            className="h-12 border-2 transition-all duration-200"
            style={{
              borderColor: isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(184, 134, 11, 0.35)',
              color: textPrimary,
            }}
          >
            <ShoppingBag className="mr-2 h-4 w-4" style={{ color: accent }} />
            Continue Shopping
          </Button>

          {/* Contact Support */}
          <Button
            variant="outline"
            onClick={() => setView('contact')}
            className="h-12 border-2 transition-all duration-200"
            style={{
              borderColor: isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(184, 134, 11, 0.35)',
              color: textPrimary,
            }}
          >
            <LifeBuoy className="mr-2 h-4 w-4" style={{ color: accent }} />
            Contact Support
          </Button>
        </motion.div>

        {/* ── Helper note ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-6 text-center text-xs"
          style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}
        >
          Your cart items have been reserved. Clicking &quot;Try Again&quot; will retry the payment
          — no need to re-enter your details.
        </motion.p>
      </div>
    </motion.div>
  );
}

// ── Small presentational helper for summary rows ──
function SummaryRow({
  label, value, isDark, textMuted, textPrimary,
}: {
  label: string;
  value: string;
  isDark: boolean;
  textMuted: string;
  textPrimary: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={{
        borderBottom: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.08)' : 'rgba(28, 25, 23, 0.06)'}`,
      }}
    >
      <span className="text-xs" style={{ color: textMuted }}>
        {label}
      </span>
      <span className="text-xs font-semibold" style={{ color: textPrimary }}>
        {value}
      </span>
    </div>
  );
}
