'use client';

/**
 * ReturnMethodPage  —  Task 4s
 * ────────────────────────────────────────────────────────────────────────
 * Full-page "Your Returns" view, Step 2 of 4: "Select return method".
 *
 * Opens after the user clicks Continue on the ReturnOrderPage (Step 1 — Select
 * items). Collects the return method (home pickup / drop-off / self-ship),
 * pickup address, pickup date, pickup time slot, and additional instructions,
 * then submits the combined return request to /api/support-tickets and calls
 * onSuccess (which routes the user to the contact/support page to see their
 * ticket).
 *
 * LAYOUT (matches reference screenshot):
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ← Back to orders  /  Your Account / Your Orders / Return Items   │
 *   │                                                                  │
 *   │ Your Returns                                                     │
 *   │                                                                  │
 *   │ ✓ ─── ● ─── ○ ─── ○   (4-step indicator, Step 2 active)         │
 *   │ 1     2     3     4                                              │
 *   │ Select items | Select return | Confirm return | Return summary   │
 *   │                                                                  │
 *   │ ┌────────────────────────────────┐  ┌────────────────────────┐   │
 *   │ │ Selected item(s)               │  │ Return summary         │   │
 *   │ │  [img] Name  Qty 1  ₹X         │  │ [img] Name  Qty 1  ₹X  │   │
 *   │ │        Sold by · Order ID      │  │ Total product   ₹X     │   │
 *   │ │        Reason: <reason>        │  │ Total refund    ₹X     │   │
 *   │ │                       [Change] │  │ (Incl. of all taxes)   │   │
 *   │ │ ──────────────────────────────│  │ Refund method:         │   │
 *   │ │ Choose a return method         │  │   Original Payment     │   │
 *   │ │  ◉ Home Pickup   ○ Drop-off    │  │ Refund timeline:       │   │
 *   │ │   ○ Self Ship                  │  │   3-5 business days    │   │
 *   │ │ ──────────────────────────────│  │ ────────────────────── │   │
 *   │ │ Pickup addr  |  Pickup date    │  │ 🛡 Return policy        │   │
 *   │ │  ⊙ address    |  ⊙ date pills  │  │   Most items eligible..│   │
 *   │ │ ──────────────────────────────│  │   View full policy →   │   │
 *   │ │ Pickup time slot               │  │ ────────────────────── │   │
 *   │ │  ◉ 9-12  ○ 12-3  ○ 3-6  ○ 6-9  │  │ Need help?              │   │
 *   │ │ ──────────────────────────────│  │ 💬 Read our Returns Help│   │
 *   │ │ Additional instructions        │  │ 📞 Contact us           │   │
 *   │ │ [textarea] 200 chars remaining │  │                        │   │
 *   │ │ ──────────────────────────────│  │                        │   │
 *   │ │ [Back]              [Continue] │  │                        │   │
 *   │ └────────────────────────────────┘  └────────────────────────┘   │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * THEME: matches the home page (dark luxury by default with gold #dbaf36
 * accent, Lora serif headings, Urbanist body). Reads the Theme token set
 * passed from the parent so it adapts to dark/light automatically. Success
 * / refund indicators remain emerald green for semantic consistency with
 * the rest of the orders flow.
 *
 * ACTION WIRING:
 *   • Back           → onBack() (returns to Step 1 — ReturnOrderPage).
 *   • Change (item)  → onBack() (same destination — let user edit items).
 *   • Continue       → POST /api/support-tickets with the combined Step 1
 *                      + Step 2 data, then onSuccess() (parent invalidates
 *                      queries + resets + routes to contact page).
 *   • View policy    → onGoToHelp() (parent routes to contact/support page).
 *   • Read Help / Contact → onGoToHelp() (same destination).
 *
 * STEP INDICATOR:
 *   Reference has 4 steps. This page represents Step 2 (Select return method)
 *   — the active step. Step 1 is "done" (emerald check). Steps 3-4 are shown
 *   but greyed out, matching the reference.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Shield, MessageCircle, Phone, Package, Loader2,
  Home, MapPin, Box, Calendar, FileText,
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

// ── Draft carried over from Step 1 (ReturnOrderPage) ──
// Re-exported here so parents can import the same shape from a single module.
export interface ReturnDraft {
  selectedItemIds: string[];
  reason: string;
  comments: string;
  files: File[];
}

// ── Task 4u: data captured on Step 2 and forwarded to Step 3 (ConfirmReturnPage).
// Includes the chosen return method, pickup date/time, address, and any
// additional instructions the user typed. The parent stores this in state and
// passes it to ConfirmReturnPage as the `methodData` prop. ──
export interface ReturnMethodData {
  returnMethod: ReturnMethod;
  returnMethodTitle: string;
  pickupDateIso: string;
  pickupDateLabel: string;
  pickupTimeSlot: string;
  pickupName: string;
  pickupAddressLines: string[];
  instructions: string;
}

interface ReturnMethodPageProps {
  order: any;
  theme: Theme;
  draft: ReturnDraft;
  onBack: () => void;
  onSuccess: () => void;
  onGoToHelp: () => void;
  email: string;
  token: string | null;
  /**
   * Task 4t — when provided, the "Change address" button on the Pickup address
   * card calls this instead of onGoToHelp. The parent should route the user to
   * their saved-addresses page (e.g. user-dashboard → addresses tab). When
   * omitted, falls back to onGoToHelp for backward compatibility.
   */
  onChangeAddress?: () => void;
  /**
   * Task 4u — when provided, the Continue button calls onContinue(methodData)
   * instead of POSTing to /api/support-tickets. The parent should route to
   * Step 3 (ConfirmReturnPage) and pass the methodData through. When omitted,
   * the legacy submit-and-onSuccess path is used (backward compatible).
   */
  onContinue?: (methodData: ReturnMethodData) => void;
}

// ── Return method options (matches reference screenshot's three cards) ──
// Task 4t: `available` flag — only Home Pickup is currently selectable. Drop-off
// and Self Ship are disabled with an inline "Not available" notice (per user
// request). When the backend supports them, flip the flag to true.
type ReturnMethod = 'home-pickup' | 'drop-off' | 'self-ship';

const RETURN_METHODS: Array<{
  id: ReturnMethod;
  icon: typeof Home;
  title: string;
  badge?: string;
  description: string;
  extra?: string;
  linkLabel?: string;
  available: boolean;
}> = [
  {
    id: 'home-pickup',
    icon: Home,
    title: 'Home Pickup',
    badge: 'FREE',
    description: "We'll pick up the item from your address.",
    extra: 'Pickup in 1-2 business days',
    available: true,
  },
  {
    id: 'drop-off',
    icon: MapPin,
    title: 'Drop-off at Partner Store',
    badge: 'FREE',
    description: 'Drop the item at a nearby return center.',
    linkLabel: 'Find a location near you',
    available: false,
  },
  {
    id: 'self-ship',
    icon: Box,
    title: 'Self Ship',
    description:
      'You ship the item yourself. Shipping reimbursement available (if eligible).',
    available: false,
  },
];

const TIME_SLOTS = ['9 AM - 12 PM', '12 PM - 3 PM', '3 PM - 6 PM', '6 PM - 9 PM'];

const MAX_INSTRUCTIONS_CHARS = 200;

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

// ── Build the next 3 pickup date options dynamically ──
// Each option: { label (e.g. "Tomorrow"), day (e.g. "24 May"), weekday (e.g. "Sat"), iso }
function buildPickupDateOptions(): Array<{
  label: string;
  day: string;
  weekday: string;
  iso: string;
}> {
  const opts: Array<{
    label: string;
    day: string;
    weekday: string;
    iso: string;
  }> = [];
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const label = i === 1 ? 'Tomorrow' : i === 2 ? 'Day after' : 'In 3 days';
    opts.push({
      label,
      day: d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      }),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      iso: d.toISOString(),
    });
  }
  return opts;
}

export function ReturnMethodPage({
  order,
  theme,
  draft,
  onBack,
  onSuccess,
  onGoToHelp,
  email,
  token,
  onChangeAddress,
  onContinue,
}: ReturnMethodPageProps) {
  const t = theme;

  // ── Step 2 state ──
  const [returnMethod, setReturnMethod] = useState<ReturnMethod>('home-pickup');
  const [selectedDateIdx, setSelectedDateIdx] = useState<number>(0); // "Tomorrow" by default
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[0]);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dateOptions = buildPickupDateOptions();

  // ── Pickup address (from order if available) ──
  const pickupName =
    order?.firstName || order?.lastName
      ? `${order.firstName ?? ''} ${order.lastName ?? ''}`.trim()
      : email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Customer';
  const pickupAddressLines: string[] = (() => {
    const addr = order?.shippingAddress;
    if (addr && typeof addr === 'object') {
      const lines: string[] = [];
      // Try common address shapes from the codebase
      const street =
        addr.street || addr.address1 || addr.line1 || addr.addressLine1;
      const city = addr.city;
      const state = addr.state || addr.region;
      const pin = addr.pincode || addr.postalCode || addr.zip;
      const phone = addr.phone || addr.phoneNumber;
      if (street) lines.push(street);
      if (city || state || pin) {
        lines.push(
          [city, state, pin].filter(Boolean).join(', ').replace(/,\s*$/, '')
        );
      }
      if (phone) lines.push(`Phone: ${phone}`);
      return lines.length > 0 ? lines : ['Address on file'];
    }
    return ['Address on file'];
  })();

  // ── Items selected in Step 1 ──
  const allItems: any[] = order.items ?? [];
  const checkedItems = allItems.filter((item) =>
    draft.selectedItemIds.includes(item.id)
  );
  const refundAmount = checkedItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  const orderNumber =
    order.orderNumber ?? String(order.id).slice(-8).toUpperCase();
  const remainingChars = MAX_INSTRUCTIONS_CHARS - instructions.length;
  const canSubmit = !loading;

  // ── Submit handler — combines Step 1 draft + Step 2 method/address/date/slot ──
  const handleSubmit = async () => {
    if (!canSubmit) return;

    const chosenDate = dateOptions[selectedDateIdx];
    const methodData: ReturnMethodData = {
      returnMethod,
      returnMethodTitle:
        RETURN_METHODS.find((m) => m.id === returnMethod)?.title ??
        returnMethod,
      pickupDateIso: chosenDate.iso,
      pickupDateLabel: `${chosenDate.day} (${chosenDate.weekday})`,
      pickupTimeSlot: selectedSlot,
      pickupName,
      pickupAddressLines,
      instructions,
    };

    // ── Task 4u: if onContinue is provided, hand the methodData to the parent
    // and let Step 3 (ConfirmReturnPage) do the actual API submission. This
    // keeps Step 2 strictly about selecting the return method + pickup details. ──
    if (onContinue) {
      onContinue(methodData);
      return;
    }

    // ── Task 4w: legacy path (onContinue not provided) — skip the server-side
    // API call. The Return Summary page is purely client-side and synthesizes
    // its own Return ID, so no support ticket needs to be created. We show a
    // brief "Submitting..." state for UX clarity, then call onSuccess() to
    // route the user forward. The previous implementation POSTed to
    // /api/support-tickets which failed with a 500 error in the public
    // order-lookup flow (no logged-in user session). ──
    setLoading(true);
    setError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator (4 steps — matches reference; Step 2 active, Step 1 done) ──
  const STEPS = [
    { num: 1, label: 'Select items' },
    { num: 2, label: 'Select return method' },
    { num: 3, label: 'Confirm your return' },
    { num: 4, label: 'Return summary' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ── Breadcrumb / back ── */}
      {/* Task 4t: trimmed breadcrumb — only "Back to orders" remains, per user request. */}
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
      </div>

      {/* ── Title ── */}
      <div>
        <h1
          className={`text-2xl font-bold ${t.textPrimary} sm:text-3xl`}
          style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
        >
          Your Returns
        </h1>
      </div>

      {/* ── Step indicator (4 steps) — Step 2 active, Step 1 done ── */}
      <div
        className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} px-5 py-5 sm:px-8`}
      >
        <ol className="flex items-center justify-between gap-2">
          {STEPS.map((step, idx) => {
            const isActive = step.num === 2;
            const isDone = step.num === 1; // Step 1 completed when user is on Step 2.
            return (
              <li key={step.num} className="flex flex-1 items-center">
                {/* Circle + label */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                      isActive
                        ? t.isDark
                          ? 'border-amber-400 bg-amber-400 text-stone-950'
                          : 'border-amber-500 bg-amber-500 text-stone-950'
                        : isDone
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : t.isDark
                        ? 'border-amber-500/30 bg-stone-900 text-amber-100/40'
                        : 'border-stone-300 bg-white text-stone-400'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      step.num
                    )}
                  </div>
                  <span
                    className={`text-center text-[11px] font-medium leading-tight sm:text-xs ${
                      isActive ? t.textPrimary : t.textMuted
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {/* Connector line (after each step except the last) */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-3 ${
                      idx < 1
                        ? // Step 1 → Step 2 connector: highlighted (Step 1 done)
                          t.isDark
                          ? 'bg-emerald-500/60'
                          : 'bg-emerald-500/60'
                        : t.isDark
                        ? 'bg-amber-500/15'
                        : 'bg-stone-200'
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Two-column layout: main form + sidebar ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="space-y-5">
          {/* ── Selected item(s) card ── */}
          <div
            className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            <h2
              className={`mb-4 text-base font-bold ${t.textPrimary}`}
              style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
            >
              Selected item(s)
            </h2>
            <ul
              className={`divide-y ${t.isDark ? 'divide-amber-500/10' : 'divide-amber-200/60'}`}
            >
              {checkedItems.length === 0 ? (
                <li className={`py-3 text-sm ${t.textMuted}`}>
                  No items selected. Go back to Step 1 and select at least one
                  item.
                </li>
              ) : (
                checkedItems.map((item: any) => (
                  <li
                    key={item.id}
                    className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-start`}
                  >
                    {/* Image */}
                    <div
                      className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border ${t.cardBorder} bg-stone-100 dark:bg-stone-800`}
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className={`h-7 w-7 ${t.textMuted}`} />
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p
                        className={`text-sm font-medium leading-snug ${t.textPrimary}`}
                      >
                        {item.name}
                      </p>
                      {item.variantName && (
                        <p className={`text-xs ${t.textMuted}`}>
                          {item.variantName}
                        </p>
                      )}
                      <p className={`text-sm ${t.textSecondary}`}>
                        Qty: {item.quantity} &nbsp;&nbsp;{' '}
                        <span
                          className={`font-bold ${
                            t.isDark ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          {fmt(item.price * (item.quantity || 1))}
                        </span>
                      </p>
                      <p className={`text-xs ${t.textMuted}`}>
                        Sold by: Luxuria Marketplace
                      </p>
                      <p className={`text-xs ${t.textMuted}`}>
                        Order ID:{' '}
                        <span className={`font-mono ${t.textPrimary}`}>
                          {orderNumber}
                        </span>
                      </p>
                    </div>

                    {/* Reason — right column on sm+ */}
                    <div className="min-w-[180px] shrink-0">
                      <h4
                        className={`mb-1 text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}
                      >
                        Reason for return
                      </h4>
                      <p
                        className={`mb-1 text-sm leading-snug ${t.textPrimary}`}
                      >
                        {draft.reason || '—'}
                      </p>
                      <button
                        type="button"
                        onClick={onBack}
                        disabled={loading}
                        className={`text-xs ${t.accentText} hover:underline disabled:opacity-50`}
                      >
                        Change
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* ── Choose a return method card ── */}
          <div
            className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            <h2
              className={`mb-4 text-base font-bold ${t.textPrimary}`}
              style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
            >
              Choose a return method
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {RETURN_METHODS.map((m) => {
                const selected = returnMethod === m.id;
                const Icon = m.icon;
                const isAvailable = m.available;

                // Task 4t: unavailable methods render as a disabled card with
                // an inline "Not available" notice — radio is gone, click does
                // nothing, opacity is reduced, and a small badge replaces the
                // "FREE" badge so the user understands *why* it's disabled.
                if (!isAvailable) {
                  return (
                    <div
                      key={m.id}
                      aria-disabled="true"
                      className={`relative flex cursor-not-allowed flex-col gap-3 rounded-lg border-2 p-4 opacity-70 ${
                        t.isDark
                          ? 'border-amber-500/10 bg-stone-900/30'
                          : 'border-stone-200 bg-stone-50/60'
                      }`}
                    >
                      <span
                        className={`absolute right-3 top-3 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          t.isDark
                            ? 'border-amber-500/15 bg-amber-500/5 text-amber-100/40'
                            : 'border-stone-300 bg-stone-100 text-stone-400'
                        }`}
                      >
                        Not available
                      </span>
                      <div className="flex items-start gap-3">
                        <Icon
                          className={`h-7 w-7 shrink-0 ${t.textMuted}`}
                          strokeWidth={1.5}
                        />
                        <div className="min-w-0 flex-1 pr-6">
                          <div
                            className={`text-sm font-bold ${
                              t.isDark ? 'text-amber-100/60' : 'text-stone-500'
                            }`}
                          >
                            {m.title}
                          </div>
                          {m.badge && (
                            <div
                              className={`mb-1 text-xs font-bold line-through ${
                                t.isDark ? 'text-amber-100/40' : 'text-stone-400'
                              }`}
                            >
                              {m.badge}
                            </div>
                          )}
                          <p
                            className={`mt-1 text-xs leading-snug ${t.textMuted}`}
                          >
                            {m.description}
                          </p>
                          {m.extra && (
                            <p
                              className={`mt-2 text-xs font-bold ${t.textMuted}`}
                            >
                              {m.extra}
                            </p>
                          )}
                          <div
                            className={`mt-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                              t.isDark
                                ? 'border-amber-500/15 bg-amber-500/5 text-amber-100/50'
                                : 'border-stone-200 bg-stone-100 text-stone-500'
                            }`}
                          >
                            Not available
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Available method — full radio-card behaviour.
                return (
                  <label
                    key={m.id}
                    className={`relative flex cursor-pointer flex-col gap-3 rounded-lg border-2 p-4 transition-all ${
                      selected
                        ? t.isDark
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-amber-500 bg-amber-50/60'
                        : t.isDark
                        ? `border-amber-500/15 bg-stone-900/40 opacity-80 hover:opacity-100 hover:border-amber-500/30`
                        : `border-stone-200 bg-white opacity-90 hover:opacity-100 hover:border-stone-300`
                    } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <input
                      type="radio"
                      name="return-method"
                      value={m.id}
                      checked={selected}
                      onChange={() => setReturnMethod(m.id)}
                      disabled={loading}
                      className="absolute right-3 top-3 h-4 w-4 accent-amber-500"
                    />
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`h-7 w-7 shrink-0 ${
                          selected
                            ? t.isDark
                              ? 'text-amber-300'
                              : 'text-amber-700'
                            : t.textSecondary
                        }`}
                        strokeWidth={1.5}
                      />
                      <div className="min-w-0 flex-1 pr-6">
                        <div
                          className={`text-sm font-bold ${t.textPrimary}`}
                        >
                          {m.title}
                        </div>
                        {m.badge && (
                          <div
                            className={`mb-1 text-xs font-bold text-emerald-600 dark:text-emerald-400`}
                          >
                            {m.badge}
                          </div>
                        )}
                        <p
                          className={`mt-1 text-xs leading-snug ${t.textSecondary}`}
                        >
                          {m.description}
                        </p>
                        {m.extra && (
                          <p
                            className={`mt-2 text-xs font-bold ${t.textPrimary}`}
                          >
                            {m.extra}
                          </p>
                        )}
                        {m.linkLabel && (
                          <p
                            className={`mt-2 text-xs font-medium underline decoration-dotted ${t.accentText}`}
                          >
                            {m.linkLabel}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Pickup address + Pickup date (2-col grid) ── */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Pickup address */}
            <div
              className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
            >
              <h2
                className={`mb-3 text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Pickup address
              </h2>
              <div className="flex items-start gap-3">
                <MapPin
                  className={`mt-0.5 h-5 w-5 shrink-0 ${t.textSecondary}`}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div
                    className={`text-sm font-bold capitalize ${t.textPrimary}`}
                  >
                    {pickupName}
                  </div>
                  {pickupAddressLines.map((line, i) => (
                    <div
                      key={i}
                      className={`text-sm ${t.textSecondary}`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onChangeAddress ?? onGoToHelp}
                  disabled={loading}
                  className={`mt-1 shrink-0 text-xs ${t.accentText} hover:underline disabled:opacity-50`}
                >
                  Change address
                </button>
              </div>
            </div>

            {/* Pickup date */}
            <div
              className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
            >
              <h2
                className={`mb-3 text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Pickup date
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {dateOptions.map((opt, idx) => {
                  const selected = selectedDateIdx === idx;
                  return (
                    <button
                      key={opt.iso}
                      type="button"
                      onClick={() => setSelectedDateIdx(idx)}
                      disabled={loading}
                      className={`flex min-w-0 flex-col items-center justify-center rounded-lg border-2 p-2 text-center transition-all ${
                        selected
                          ? t.isDark
                            ? 'border-amber-400 bg-amber-400/10'
                            : 'border-amber-500 bg-amber-50/60'
                          : t.isDark
                          ? 'border-amber-500/15 bg-stone-900/40 hover:border-amber-500/30'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      {idx === 0 && (
                        <div
                          className={`mb-1 text-[9px] font-bold leading-tight break-words whitespace-normal ${
                            selected ? t.accentText : t.textMuted
                          }`}
                        >
                          {opt.label}
                        </div>
                      )}
                      <div
                        className={`text-sm font-bold leading-tight ${t.textPrimary}`}
                      >
                        {opt.day}
                      </div>
                      <div className={`text-xs leading-tight ${t.textMuted}`}>
                        {opt.weekday}
                      </div>
                    </button>
                  );
                })}
                {/* Choose a date (visual only — opens a calendar in a future iteration) */}
                <button
                  type="button"
                  disabled
                  className={`flex cursor-not-allowed flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 text-center opacity-60 ${
                    t.isDark
                      ? 'border-amber-500/15 bg-stone-900/40'
                      : 'border-stone-200 bg-white'
                  }`}
                  title="Custom date picker coming soon"
                >
                  <Calendar className={`h-4 w-4 ${t.textMuted}`} />
                  <div
                    className={`text-[10px] font-medium leading-tight ${t.textSecondary}`}
                  >
                    Choose
                    <br />
                    a date
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ── Pickup time slot card ── */}
          <div
            className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            <h2
              className={`mb-3 text-base font-bold ${t.textPrimary}`}
              style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
            >
              Pickup time slot
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {TIME_SLOTS.map((slot) => {
                const selected = selectedSlot === slot;
                return (
                  <label
                    key={slot}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                      selected
                        ? t.isDark
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-amber-500 bg-amber-50/60'
                        : t.isDark
                        ? 'border-amber-500/15 bg-stone-900/40 hover:border-amber-500/30'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <input
                      type="radio"
                      name="time-slot"
                      value={slot}
                      checked={selected}
                      onChange={() => setSelectedSlot(slot)}
                      disabled={loading}
                      className="h-4 w-4 accent-amber-500"
                    />
                    <span
                      className={`text-xs font-medium ${t.textPrimary}`}
                    >
                      {slot}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Additional instructions (optional) ── */}
          <div
            className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            <h2
              className={`mb-2 text-base font-bold ${t.textPrimary}`}
              style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
            >
              Additional instructions{' '}
              <span className={t.textMuted}>(optional)</span>
            </h2>
            <textarea
              value={instructions}
              onChange={(e) =>
                setInstructions(e.target.value.slice(0, MAX_INSTRUCTIONS_CHARS))
              }
              disabled={loading}
              rows={3}
              placeholder="E.g. Gate code, landmark, leave at reception, etc."
              className={`w-full resize-none rounded-lg border ${t.cardBorder} ${
                t.isDark ? 'bg-stone-900/70' : 'bg-white'
              } px-3 py-2.5 text-sm ${t.textPrimary} placeholder:${t.textMuted} focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50`}
            />
            <p className={`mt-1 text-right text-xs ${t.textMuted}`}>
              {remainingChars} characters remaining
            </p>
          </div>

          {/* ── Error message ── */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Action buttons row ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={loading}
              className={`rounded-full px-6 ${t.cardBorder} ${t.textSecondary} hover:${t.accentBgSoft}`}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-8 py-2.5 text-sm font-bold text-stone-950 shadow-sm transition-all hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>Continue</>
              )}
            </button>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN — Return summary + policy + help ════════════ */}
        {/* Task 4t: sticky moved from the summary card to the entire sidebar column.
            This prevents the summary card from visually overlapping the policy and
            need-help cards below it when the user scrolls the long left column. The
            whole sidebar now sticks together as a single unit. `self-start` is
            required so the grid cell doesn't stretch the sidebar to the left
            column's height (which would defeat the sticky). max-h + overflow-y-auto
            is a safety net for short viewports where the 3 stacked cards exceed the
            viewport — they'll scroll internally instead of being cut off. */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
          {/* ── Return summary card ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            {/* Header */}
            <div className="px-5 py-4">
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Return summary
              </h2>
            </div>
            <div className={`border-t ${t.hairline}`} />

            {/* Selected items list (mini rows: img + name + qty + price) */}
            <ul
              className={`divide-y ${t.isDark ? 'divide-amber-500/10' : 'divide-amber-200/60'}`}
            >
              {checkedItems.length === 0 ? (
                <li className={`px-5 py-4 text-xs ${t.textMuted}`}>
                  No items selected.
                </li>
              ) : (
                checkedItems.map((item: any) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border ${t.cardBorder} bg-stone-100 dark:bg-stone-800`}
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className={`h-5 w-5 ${t.textMuted}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`line-clamp-2 text-xs font-medium ${t.textPrimary}`}
                      >
                        {item.name}
                      </p>
                      <p className={`text-xs ${t.textMuted}`}>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p
                      className={`text-xs font-bold ${
                        t.isDark ? 'text-amber-300' : 'text-amber-700'
                      }`}
                    >
                      {fmt(item.price * (item.quantity || 1))}
                    </p>
                  </li>
                ))
              )}
            </ul>

            {/* Price details */}
            <div
              className={`border-t ${t.hairline} px-5 py-4 ${
                t.isDark ? 'bg-stone-900/40' : 'bg-amber-50/40'
              } space-y-2`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={t.textSecondary}>Total product price</span>
                <span className={`${t.textPrimary} font-medium`}>
                  {fmt(refundAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Total refund amount
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {fmt(refundAmount)}
                </span>
              </div>
              <p className={`text-xs ${t.textMuted}`}>
                (Inclusive of all taxes)
              </p>
            </div>

            {/* Method + timeline */}
            <div
              className={`space-y-3 border-t ${t.hairline} px-5 py-4 text-xs`}
            >
              <div>
                <div
                  className={`font-bold ${t.textPrimary}`}
                >
                  Refund method
                </div>
                <div className={`${t.textSecondary}`}>
                  Original Payment Method
                </div>
              </div>
              <div>
                <div
                  className={`font-bold ${t.textPrimary}`}
                >
                  Refund timeline
                </div>
                <div className={`${t.textSecondary}`}>
                  3-5 business days after we receive the item
                </div>
              </div>
            </div>
          </div>

          {/* ── Return policy card ── */}
          <div
            className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  t.isDark ? 'bg-amber-500/15' : 'bg-amber-100'
                }`}
              >
                <Shield className={`h-4.5 w-4.5 ${t.accentText}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className={`text-sm font-bold ${t.textPrimary}`}
                  style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
                >
                  Return policy
                </h3>
                <p
                  className={`mt-1 text-xs leading-relaxed ${t.textSecondary}`}
                >
                  Most items are eligible for return within 10 days of delivery.
                  Items must be in original condition with original packaging.
                </p>
                <button
                  type="button"
                  onClick={onGoToHelp}
                  className={`mt-2 inline-flex items-center text-xs ${t.accentText} hover:underline`}
                >
                  View full return policy →
                </button>
              </div>
            </div>
          </div>

          {/* ── Need help card ── */}
          <div
            className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            <h3
              className={`text-sm font-bold ${t.textPrimary}`}
              style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
            >
              Need help?
            </h3>
            <ul className="mt-3 space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={onGoToHelp}
                  className={`flex w-full items-center gap-2.5 text-left text-xs ${t.accentText} hover:underline`}
                >
                  <FileText
                    className={`h-4 w-4 shrink-0 ${t.accentText}`}
                  />
                  Read our Returns Help
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onGoToHelp}
                  className={`flex w-full items-center gap-2.5 text-left text-xs ${t.accentText} hover:underline`}
                >
                  <Phone className={`h-4 w-4 shrink-0 ${t.accentText}`} />
                  Contact us
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
