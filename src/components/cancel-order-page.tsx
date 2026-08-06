'use client';

/**
 * CancelOrderPage  —  Task 4p
 * ────────────────────────────────────────────────────────────────────────
 * Full-page "Cancel items from this order" view, opened when the user clicks
 * the Cancel button on an order card. Replaces the previous small modal
 * dialog with a dedicated page that matches the uploaded Amazon-style
 * reference screenshot, adapted to the project's luxury theme.
 *
 * LAYOUT (matches reference):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ← Back to orders  /  Your Orders / Order Details / Cancel   │
 *   │                                                          ─── │
 *   │ Cancel items from this order                                 │
 *   │ You can cancel individual items until the order enters...    │
 *   │                                                              │
 *   │ ┌────────────────────────────────┐  ┌────────────────────┐   │
 *   │ │ Delivery by [date]  | Order #  │  │ Refund summary     │   │
 *   │ │ ──────────────────────────────│  │ ────────────────── │   │
 *   │ │ ☑ [img] Item name             │  │ Item subtotal  ₹X  │   │
 *   │ │       Sold by: ...            │  │ Refund amount ₹X   │   │
 *   │ │       ₹X · Qty 1              │  │ (green, bold)      │   │
 *   │ │ ──────────────────────────────│  │                    │   │
 *   │ │ Cancel reason (required) [▼]  │  │ ⏱ Refund timeline  │   │
 *   │ │ Please tell us more (opt)     │  │   3-5 business days│   │
 *   │ │ [textarea]                    │  │                    │   │
 *   │ │ ℹ Note: shipped items...      │  │ 🛡 Secure Refund   │   │
 *   │ │ [Keep order] [Cancel items]   │  │   original payment │   │
 *   │ └────────────────────────────────┘  └────────────────────┘   │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * THEME: matches the home page (dark luxury by default with gold #dbaf36
 * accent, Lora serif headings, Urbanist body). Reads the Theme token set
 * passed from the parent so it adapts to dark/light automatically.
 *
 * ACTION WIRING:
 *   • Keep order     → onBack() (returns to the orders list)
 *   • Cancel items   → DELETE /api/orders/[id] with { reason, email, details }
 *                      then onSuccess(order) (parent renders the
 *                      CancelConfirmationPage with the cancelled order)
 *   • Checkbox per item → tracks which items the user wants to cancel
 *     (UI-level only; the API currently cancels the whole order. The
 *      refund amount in the sidebar reflects the checked items.)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, ChevronDown, Shield, Clock, Info, Package, Loader2,
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

interface CancelOrderPageProps {
  order: any;
  theme: Theme;
  onBack: () => void;
  // Task 4q: onSuccess now receives the cancelled order (with items) so the
  // parent can render the CancelConfirmationPage. Older callers that pass a
  // zero-arg callback still work because the parent simply ignores the arg.
  onSuccess: (cancelledOrder?: any) => void;
  email: string;
  token: string | null;
}

// ── Cancel reason options (matches the reference screenshot) ──
const CANCEL_REASONS = [
  'Change of mind',
  'Ordered by mistake',
  'Found a better price',
  'Item is too expensive',
  'Delivery taking too long',
  'Need to change shipping address',
  'Other',
];

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

const authH = (t: string | null): Record<string, string> =>
  t ? { Authorization: `Bearer ${t}` } : {};

export function CancelOrderPage({
  order,
  theme,
  onBack,
  onSuccess,
  email,
  token,
}: CancelOrderPageProps) {
  const t = theme;

  // ── All items start checked (matches reference screenshot's default state) ──
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set((order.items ?? []).map((item: any) => item.id))
  );
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const allItems: any[] = order.items ?? [];
  const checkedItems = allItems.filter((item) => selectedItemIds.has(item.id));
  const refundAmount = checkedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const subtotal = allItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const canSubmit = selectedItemIds.size > 0 && !!cancelReason && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      // Compose a single reason string that includes the dropdown selection
      // and any optional details the user typed — the DELETE endpoint stores
      // this as `cancelReason` on the order row.
      const composedReason = cancelDetails
        ? `${cancelReason} — ${cancelDetails}`
        : cancelReason;

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authH(token) },
        body: JSON.stringify({
          reason: composedReason,
          email,
          // Item-level selection is sent for future API support; the current
          // DELETE endpoint cancels the whole order but ignores extra fields.
          itemIds: Array.from(selectedItemIds),
        }),
      });

      if (res.ok) {
        // Task 4q: pass the cancelled order (with items) back to the parent so
        // it can render the CancelConfirmationPage instead of immediately
        // snapping back to the orders list.
        onSuccess(order);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Failed to cancel order. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const orderNumber = order.orderNumber ?? String(order.id).slice(-8).toUpperCase();
  const checkedCount = selectedItemIds.size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ── Breadcrumb / back ── */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className={`inline-flex items-center gap-1 ${t.accentText} hover:underline disabled:opacity-50`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to orders
        </button>
        <span className={t.textMuted}>/</span>
        <span className={t.textMuted}>Your Orders</span>
        <span className={t.textMuted}>/</span>
        <span className={t.textMuted}>Order Details</span>
        <span className={t.textMuted}>/</span>
        <span className={`${t.accentText} font-medium`}>Cancel Items</span>
      </div>

      {/* ── Title ── */}
      <div>
        <h1
          className={`text-2xl font-bold ${t.textPrimary}`}
          style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
        >
          Cancel items from this order
        </h1>
        <p className={`mt-1.5 text-sm ${t.textSecondary}`}>
          You can cancel individual items until the order enters the shipping process.
        </p>
      </div>

      {/* ── Two-column layout: main form + refund sidebar ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="space-y-5">
          {/* ── Item details card ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            {/* Delivery info row */}
            <div
              className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                t.isDark ? 'bg-stone-900/40' : 'bg-amber-50/40'
              }`}
            >
              <div className="text-sm">
                <span className={t.textMuted}>Delivery by </span>
                <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                  {order.estimatedDelivery ? fmtDate(order.estimatedDelivery) : '—'}
                </span>
              </div>
              <div className="text-right text-sm">
                <p className={t.textMuted}>
                  Order #{' '}
                  <span className={`font-mono ${t.textPrimary}`}>{orderNumber}</span>
                </p>
                <p className={`text-xs ${t.textMuted}`}>
                  Order placed: {fmtDate(order.createdAt)}
                </p>
              </div>
            </div>

            <div className={`border-t ${t.hairline}`} />

            {/* Item list (one row per item, each with a checkbox) */}
            <ul
              className={`divide-y ${t.isDark ? 'divide-amber-500/10' : 'divide-amber-200/60'}`}
            >
              {allItems.map((item: any) => {
                const checked = selectedItemIds.has(item.id);
                return (
                  <li key={item.id} className="flex items-start gap-4 p-5">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      disabled={loading}
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all disabled:opacity-50 ${
                        checked
                          ? 'border-amber-500 bg-amber-500 text-stone-950'
                          : `${t.cardBorder} ${t.isDark ? 'bg-stone-800' : 'bg-white'} ${t.textMuted}`
                      }`}
                      aria-label={checked ? 'Uncheck item' : 'Check item'}
                      aria-pressed={checked}
                    >
                      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>

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
                      <p className={`mt-1 text-xs ${t.textMuted}`}>Sold by: Luxuria Marketplace</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <span
                          className={`text-sm font-bold ${
                            t.isDark ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          {fmt(item.price)}
                        </span>
                        <span className={`text-xs ${t.textMuted}`}>Qty {item.quantity}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Cancellation form card ── */}
          <div
            className={`space-y-5 rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            {/* Cancel reason dropdown (required) */}
            <div>
              <label
                htmlFor="cancel-reason"
                className={`block text-sm font-medium ${t.textSecondary}`}
              >
                Cancel reason <span className={t.accentText}>(required)</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={loading}
                  className={`w-full appearance-none rounded-lg border ${t.cardBorder} ${
                    t.isDark ? 'bg-stone-900/70' : 'bg-white'
                  } px-3 py-2.5 pr-10 text-sm ${
                    cancelReason ? t.textPrimary : t.textMuted
                  } focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50`}
                >
                  <option value="">Select a reason for cancellation</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${t.textMuted}`}
                />
              </div>
            </div>

            {/* Optional details textarea */}
            <div>
              <label
                htmlFor="cancel-details"
                className={`block text-sm font-medium ${t.textSecondary}`}
              >
                Please tell us more <span className={t.textMuted}>(optional)</span>
              </label>
              <textarea
                id="cancel-details"
                value={cancelDetails}
                onChange={(e) => setCancelDetails(e.target.value)}
                disabled={loading}
                rows={4}
                placeholder="Please provide more details"
                className={`mt-1.5 w-full resize-none rounded-lg border ${t.cardBorder} ${
                  t.isDark ? 'bg-stone-900/70' : 'bg-white'
                } px-3 py-2.5 text-sm ${t.textPrimary} placeholder:${t.textMuted} focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50`}
              />
            </div>

            {/* Info banner */}
            <div
              className={`flex items-start gap-3 rounded-lg ${
                t.isDark ? 'bg-stone-800/60' : 'bg-amber-50/70'
              } p-3.5`}
            >
              <Info className={`mt-0.5 h-4 w-4 shrink-0 ${t.accentText}`} />
              <p className={`text-xs leading-relaxed ${t.textSecondary}`}>
                <span className={`font-semibold ${t.textPrimary}`}>Note:</span> If your order has
                already been shipped, you may need to return the item after delivery.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={loading}
                className={`rounded-full px-6 ${t.cardBorder} ${t.textSecondary} hover:${t.accentBgSoft}`}
              >
                Keep order
              </Button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 shadow-sm transition-all hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    {checkedCount > 0
                      ? `Cancel ${checkedCount} item${checkedCount > 1 ? 's' : ''}`
                      : 'Cancel items'}
                  </>
                )}
              </button>
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
                Refund summary
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
                {checkedCount} of {allItems.length} item{allItems.length > 1 ? 's' : ''} selected for
                cancellation
              </p>
            </div>

            <div className={`border-t ${t.hairline}`} />

            {/* Refund timeline */}
            <div className="px-5 py-4">
              <div className="flex items-start gap-2.5">
                <Clock className={`mt-0.5 h-4 w-4 shrink-0 ${t.accentText}`} />
                <div>
                  <p className={`text-sm font-semibold ${t.textPrimary}`}>Refund timeline</p>
                  <p className={`mt-1 text-xs leading-relaxed ${t.textSecondary}`}>
                    Once cancelled, your refund will be initiated. Refund will be credited within{' '}
                    <span className={`font-semibold ${t.textPrimary}`}>3-5 business days</span>.
                  </p>
                </div>
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
    </motion.div>
  );
}
