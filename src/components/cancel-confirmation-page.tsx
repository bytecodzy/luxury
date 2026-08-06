'use client';

/**
 * CancelConfirmationPage  —  Task 4q
 * ────────────────────────────────────────────────────────────────────────
 * Full-page "Your item has been cancelled" confirmation view, shown after
 * the user successfully cancels an order from the CancelOrderPage. Replaces
 * the immediate snap-back-to-orders-list behavior with a dedicated success
 * page that matches the uploaded Amazon-style reference screenshot, adapted
 * to the project's luxury theme.
 *
 * LAYOUT (matches reference):
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ← Back to orders  /  Your Orders / Order Details / Cancel Items  │
 *   │                                                                  │
 *   │ ┌──────────────────────────────────────────────────────────────┐ │
 *   │ │  ✓  Your item has been cancelled                              │ │
 *   │ │      We've cancelled the selected item from your order.       │ │
 *   │ │      You will receive an email/SMS confirmation shortly.      │ │
 *   │ │                                                                │ │
 *   │ │      Order ID: 405-XXXX    Cancelled on: 24 May 2025, 11:35   │ │
 *   │ │                                                                │ │
 *   │ │      [View order details]   [Continue shopping]               │ │
 *   │ └──────────────────────────────────────────────────────────────┘ │
 *   │                                                                  │
 *   │ ┌──────────────────────────────┐  ┌──────────────────────────┐   │
 *   │ │ Cancelled item               │  │ Refund Summary           │   │
 *   │ │ ──────────────────────────── │  │ ──────────────────────── │   │
 *   │ │ [img] Name                   │  │ Item subtotal     ₹X     │   │
 *   │ │       Variant                │  │ Refund amount     ₹X     │   │
 *   │ │       Sold by: ...           │  │ (green, bold)           │   │
 *   │ │       ₹X · Qty 1  [Cancelled]│  │                          │   │
 *   │ │ ──────────────────────────── │  │ ⏱ Refund timeline       │   │
 *   │ │ 🎧 Need help?                │  │   3-5 business days      │   │
 *   │ │ Visit our Help section...    │  │                          │   │
 *   │ │ [Go to Help Centre]          │  │ 🛡 Secure Refund         │   │
 *   │ └──────────────────────────────┘  │   original payment method│   │
 *   │                                    └──────────────────────────┘   │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * THEME: matches the home page (dark luxury by default with gold #dbaf36
 * accent, Lora serif headings, Urbanist body). Reads the Theme token set
 * passed from the parent so it adapts to dark/light automatically. Success
 * indicators (heading + checkmark + "Cancelled" badge + refund amount)
 * remain emerald green since that is the universal "success / refund"
 * semantic color — consistent with the CancelOrderPage sidebar.
 *
 * ACTION WIRING:
 *   • View order details  → onViewOrderDetails() (parent resets state and
 *                            returns to the orders list, with the order
 *                            expanded so the user sees its cancelled status)
 *   • Continue shopping   → onContinueShopping() (parent navigates to home)
 *   • Go to Help Centre   → onContinueShopping() falls back; here we route
 *                            to the contact/support page via parent.
 */

import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Shield, Clock, Package, Headphones, ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Theme tokens (mirrors the Theme interface used in user-dashboard.tsx) ──
interface Theme {
  isDark: boolean;
  pageBg: string;
  cardBg: string;
  cardBgSoft: string;
  cardBorder: string;
  cardBorderHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentText: string;
  accentBg: string;
  accentBgSoft: string;
  hairline: string;
  shadowColor: string;
}

interface CancelConfirmationPageProps {
  order: any;
  theme: Theme;
  cancelledAt?: string; // ISO string; defaults to now()
  onViewOrderDetails: () => void;
  onContinueShopping: () => void;
  onGoToHelp: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const fmtDateTime = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

export function CancelConfirmationPage({
  order,
  theme,
  cancelledAt,
  onViewOrderDetails,
  onContinueShopping,
  onGoToHelp,
}: CancelConfirmationPageProps) {
  const t = theme;

  // Use the supplied cancellation timestamp, else fall back to "now". This
  // page is rendered immediately after a successful DELETE, so "now" is a
  // truthful representation of when the cancellation happened.
  const cancelledAtISO = cancelledAt ?? new Date().toISOString();
  const cancelledAtLabel = fmtDateTime(cancelledAtISO);

  const orderNumber = order.orderNumber ?? String(order.id).slice(-8).toUpperCase();
  const allItems: any[] = order.items ?? [];
  const refundAmount = allItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );
  const subtotal = refundAmount; // full refund — order is fully cancelled

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ── Breadcrumb ── */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={t.textMuted}>Your Account</span>
        <span className={t.textMuted}>/</span>
        <span className={t.textMuted}>Your Orders</span>
        <span className={t.textMuted}>/</span>
        <span className={t.textMuted}>Order Details</span>
        <span className={t.textMuted}>/</span>
        <span className={`${t.accentText} font-medium`}>Cancel Items</span>
      </div>

      {/* ── Success header card ── */}
      <div
        className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:gap-6">
          {/* Big green check */}
          <div className="flex shrink-0 justify-center sm:justify-start">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                t.isDark
                  ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30'
                  : 'bg-emerald-100 ring-1 ring-emerald-200'
              }`}
            >
              <Check
                className="h-8 w-8 text-emerald-500 dark:text-emerald-400"
                strokeWidth={3}
              />
            </div>
          </div>

          {/* Title + subtitle + order meta + actions */}
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h1
                className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 sm:text-3xl"
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Your item has been cancelled
              </h1>
              <p className={`mt-1.5 text-sm ${t.textSecondary}`}>
                We&apos;ve cancelled the selected item from your order.
              </p>
              <p className={`text-sm ${t.textSecondary}`}>
                You will receive an email/SMS confirmation shortly.
              </p>
            </div>

            {/* Order meta row */}
            <div
              className={`flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-lg ${
                t.isDark ? 'bg-stone-800/40' : 'bg-amber-50/60'
              } px-4 py-3 text-sm`}
            >
              <div className="flex items-center gap-2">
                <span className={t.textMuted}>Order ID:</span>
                <span className={`font-mono font-semibold ${t.textPrimary}`}>
                  {orderNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={t.textMuted}>Cancelled on:</span>
                <span className={`font-medium ${t.textPrimary}`}>{cancelledAtLabel}</span>
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onViewOrderDetails}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 shadow-sm transition-all hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 hover:shadow-md"
              >
                <ShoppingBag className="h-4 w-4" />
                View order details
              </button>
              <Button
                type="button"
                variant="outline"
                onClick={onContinueShopping}
                className={`rounded-full px-6 ${t.cardBorder} ${t.textSecondary} hover:${t.accentBgSoft}`}
              >
                Continue shopping
              </Button>
            </div>
          </div>

          {/* Decorative package illustration (matches reference's box icon on the right) */}
          <div className="hidden shrink-0 justify-center sm:flex">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full ${
                t.isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
              }`}
            >
              <div className="relative">
                <Package
                  className={`h-12 w-12 ${t.isDark ? 'text-emerald-400/70' : 'text-emerald-500/70'}`}
                  strokeWidth={1.5}
                />
                <div
                  className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ${
                    t.isDark ? 'bg-emerald-500' : 'bg-emerald-500'
                  } ring-2 ${t.isDark ? 'ring-stone-900' : 'ring-white'}`}
                >
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout: cancelled items + help (left) | refund summary (right) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="space-y-5">
          {/* ── Cancelled item card ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            {/* Card header */}
            <div
              className={`flex items-center justify-between px-5 py-4 ${
                t.isDark ? 'bg-stone-900/40' : 'bg-amber-50/40'
              }`}
            >
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Cancelled item
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-400">
                {allItems.length} item{allItems.length !== 1 ? 's' : ''} cancelled
              </span>
            </div>

            <div className={`border-t ${t.hairline}`} />

            {/* Item rows */}
            <ul
              className={`divide-y ${t.isDark ? 'divide-amber-500/10' : 'divide-amber-200/60'}`}
            >
              {allItems.map((item: any) => (
                <li key={item.id} className="flex items-start gap-4 p-5">
                  {/* Image */}
                  <div
                    className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border ${t.cardBorder} bg-stone-100 dark:bg-stone-800`}
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className={`h-6 w-6 ${t.textMuted}`} />
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium leading-snug ${t.textPrimary}`}>
                      {item.name}
                    </p>
                    {item.variantName && (
                      <p className={`mt-0.5 text-xs ${t.textMuted}`}>{item.variantName}</p>
                    )}
                    <p className={`mt-1 text-xs ${t.textMuted}`}>
                      Sold by: Luxuria Marketplace
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <span
                        className={`text-sm font-bold ${
                          t.isDark ? 'text-amber-300' : 'text-amber-700'
                        }`}
                      >
                        {fmt(item.price)}
                      </span>
                      <span className={`text-xs ${t.textMuted}`}>
                        Quantity: {item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Status + date (right side) */}
                  <div className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        t.isDark
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Cancelled
                    </span>
                    <span className={`text-xs ${t.textMuted}`}>{cancelledAtLabel}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Mobile status row (shows under each item on small screens — simpler single-line variant) */}
            <div
              className={`flex items-center justify-between border-t ${t.hairline} px-5 py-3 sm:hidden`}
            >
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  t.isDark
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
                Cancelled
              </span>
              <span className={`text-xs ${t.textMuted}`}>{cancelledAtLabel}</span>
            </div>
          </div>

          {/* ── Need help card ── */}
          <div
            className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    t.isDark ? 'bg-amber-500/10' : 'bg-amber-50'
                  }`}
                >
                  <Headphones className={`h-5 w-5 ${t.accentText}`} />
                </div>
                <div>
                  <p
                    className={`text-sm font-bold ${t.textPrimary}`}
                    style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
                  >
                    Need help?
                  </p>
                  <p className={`mt-0.5 text-xs leading-relaxed ${t.textSecondary}`}>
                    You can visit our Help section or contact our Customer Service.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onGoToHelp}
                className={`shrink-0 rounded-full px-5 ${t.cardBorder} ${t.textSecondary} hover:${t.accentBgSoft}`}
              >
                Go to Help Centre
              </Button>
            </div>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN — Refund summary sidebar ════════════ */}
        <div>
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} lg:sticky lg:top-6`}
          >
            {/* Header */}
            <div className="px-5 py-4">
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Refund Summary
              </h2>
            </div>
            <div className={`border-t ${t.hairline}`} />

            {/* Financial details */}
            <div className="space-y-2.5 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className={t.textMuted}>Item subtotal</span>
                <span className={`${t.textPrimary} font-medium`}>{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                  Refund amount
                </span>
                <span className="font-bold text-emerald-500 dark:text-emerald-400">
                  {fmt(refundAmount)}
                </span>
              </div>
              <p className={`pt-1 text-xs ${t.textMuted}`}>
                Full refund for {allItems.length} cancelled item{allItems.length !== 1 ? 's' : ''}.
              </p>
            </div>

            <div className={`border-t ${t.hairline}`} />

            {/* Refund timeline */}
            <div className="px-5 py-4">
              <p
                className={`text-sm font-semibold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Refund will be initiated
              </p>
              <div className="mt-2 flex items-start gap-2.5">
                <Clock className={`mt-0.5 h-4 w-4 shrink-0 ${t.accentText}`} />
                <p className={`text-xs leading-relaxed ${t.textSecondary}`}>
                  Once cancelled, your refund will be initiated. Refund will be credited within{' '}
                  <span className={`font-semibold ${t.textPrimary}`}>3-5 business days</span>.
                </p>
              </div>
            </div>

            <div className={`border-t ${t.hairline}`} />

            {/* Secure refund banner */}
            <div className={`px-5 py-4 ${t.isDark ? 'bg-amber-500/5' : 'bg-amber-50/60'}`}>
              <div className="flex items-start gap-2.5">
                <Shield className={`mt-0.5 h-4 w-4 shrink-0 ${t.accentText}`} />
                <div>
                  <p className={`text-sm font-semibold ${t.textPrimary}`}>Secure Refund</p>
                  <p className={`mt-1 text-xs leading-relaxed ${t.textSecondary}`}>
                    Your refund will be processed to your original payment method.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Back-to-orders link (footer escape hatch) ── */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onViewOrderDetails}
          className={`inline-flex items-center gap-1.5 text-xs ${t.accentText} hover:underline`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to your orders
        </button>
      </div>
    </motion.div>
  );
}
