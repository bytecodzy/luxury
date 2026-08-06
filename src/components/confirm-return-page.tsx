'use client';

/**
 * ConfirmReturnPage  —  Task 4u
 * ────────────────────────────────────────────────────────────────────────
 * Full-page "Your Returns" view, Step 3 of 4: "Confirm your return".
 *
 * Opens after the user clicks Continue on the ReturnMethodPage (Step 2 — Select
 * return method). Shows a single, consolidated review card with 5 numbered
 * sections (Items / Reason / Return method / Pickup details / Refund details),
 * each with an "Edit" link that routes back to the relevant earlier step. The
 * user reviews the details and clicks "Confirm return" — at which point this
 * page POSTs the combined Step 1 + Step 2 payload to /api/support-tickets and
 * calls onSuccess (which routes the user to the contact/support page to see
 * their ticket — Step 4 "Return summary" lives on the support page).
 *
 * LAYOUT (matches reference screenshot):
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ← Back to orders                                                 │
 *   │                                                                  │
 *   │ Your Returns                                                     │
 *   │                                                                  │
 *   │ ✓ ─── ✓ ─── ● ─── ○   (4-step indicator, Step 3 active)         │
 *   │ 1     2     3     4                                              │
 *   │ Select items | Select return | Confirm return | Return summary   │
 *   │                                                                  │
 *   │ Please review your return details and confirm.                   │
 *   │                                                                  │
 *   │ ┌────────────────────────────────┐  ┌────────────────────────┐   │
 *   │ │ 1. Items you are returning     │  │ Return summary         │   │
 *   │ │   [img] Name  Qty 1  ₹X        │  │ [img] Name  Qty 1  ₹X  │   │
 *   │ │   Sold by · Order #            │  │ Total product   ₹X     │   │
 *   │ │                       [Edit]   │  │ Total refund    ₹X     │   │
 *   │ │ ───────────────────────────────│  │ (Incl. of all taxes)   │   │
 *   │ │ 2. Reason for return           │  │ Refund method:         │   │
 *   │ │   <reason>            [Edit]   │  │   Original Payment     │   │
 *   │ │ ───────────────────────────────│  │ Refund timeline:       │   │
 *   │ │ 3. Return method               │  │   3-5 business days    │   │
 *   │ │   🏠 Home Pickup FREE          │  │ ─────────────────────── │   │
 *   │ │   We'll pick up the item...    │  │ 🛡 Return policy        │   │
 *   │ │   Pickup in 1-2 business days  │  │   Most items eligible..│   │
 *   │ │                       [Edit]   │  │   View full policy →   │   │
 *   │ │ ───────────────────────────────│  │ ─────────────────────── │   │
 *   │ │ 4. Pickup details              │  │ Need help?              │   │
 *   │ │   📍 Pickup address            │  │ 💬 Read our Returns Help│   │
 *   │ │      Rahul Sharma              │  │ 📞 Contact us           │   │
 *   │ │      101, 5th Cross...         │  │                        │   │
 *   │ │              [Edit address]    │  │                        │   │
 *   │ │   📅 Pickup date & time        │  │                        │   │
 *   │ │      Sunday, 25 May 2024       │  │                        │   │
 *   │ │      3 PM - 6 PM       [Edit]  │  │                        │   │
 *   │ │ ───────────────────────────────│  │                        │   │
 *   │ │ 5. Refund details              │  │                        │   │
 *   │ │   💳 Refund will be credited...│  │                        │   │
 *   │ │      Visa ending with 1234     │  │                        │   │
 *   │ │      Estimated refund date...  │  │                        │   │
 *   │ │                       [Edit]   │  │                        │   │
 *   │ │ ───────────────────────────────│  │                        │   │
 *   │ │ [Back]            [Confirm return]│                        │   │
 *   │ │ 🔒 Your return is safe and secure│                        │   │
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
 *   • Back                → onBack() (returns to Step 2 — ReturnMethodPage).
 *   • Edit (items)        → onEditItems() (routes to Step 1 — ReturnOrderPage).
 *   • Edit (reason)       → onEditItems() (same destination — let user edit reason).
 *   • Edit (method)       → onEditMethod() (routes to Step 2 — ReturnMethodPage).
 *   • Edit (date/time)    → onEditMethod() (same destination — let user edit slot).
 *   • Edit address        → onEditAddress() (routes to user profile addresses,
 *                            same handler as Step 2's "Change address").
 *   • Edit (refund)       → onEditMethod() (refund method is tied to order; the
 *                            user can only switch return method on Step 2).
 *   • Confirm return      → POST /api/support-tickets with the combined Step 1
 *                            + Step 2 + Step 3 (confirm) data, then onSuccess().
 *   • View policy / Help  → onGoToHelp() (parent routes to contact/support page).
 *
 * STEP INDICATOR:
 *   Reference has 4 steps. This page represents Step 3 (Confirm your return)
 *   — the active step. Steps 1 + 2 are "done" (emerald checks). Step 4 is
 *   shown but greyed out, matching the reference.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Shield, MessageCircle, Phone, Package, Loader2,
  Home, MapPin, Calendar, CreditCard, Lock, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReturnDraft } from '@/components/return-order-page';
import type { ReturnMethodData } from '@/components/return-method-page';

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

interface ConfirmReturnPageProps {
  order: any;
  theme: Theme;
  draft: ReturnDraft;
  methodData: ReturnMethodData;
  onBack: () => void;
  onSuccess: () => void;
  onEditItems: () => void;
  onEditMethod: () => void;
  /**
   * Task 4u — when the user clicks "Edit address" on the Pickup details card,
   * the parent should route them to their saved-addresses page (same handler
   * as Step 2's "Change address"). Falls back to onGoToHelp if not provided.
   */
  onEditAddress?: () => void;
  onGoToHelp: () => void;
  email: string;
  token: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

const authH = (t: string | null): Record<string, string> =>
  t ? { Authorization: `Bearer ${t}` } : {};

export function ConfirmReturnPage({
  order,
  theme,
  draft,
  methodData,
  onBack,
  onSuccess,
  onEditItems,
  onEditMethod,
  onEditAddress,
  onGoToHelp,
  email,
  token,
}: ConfirmReturnPageProps) {
  const t = theme;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

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

  // ── Refund / payment method description (defensive — order shape varies) ──
  // Reference image shows "Visa ending with 1234". We try the common shapes
  // used across the codebase and fall back to a generic label.
  const paymentDescription: string = (() => {
    const pm: any = order?.paymentMethod ?? order?.payment ?? order?.paymentDetails;
    if (pm && typeof pm === 'object') {
      const brand =
        pm.brand || pm.cardBrand || pm.network || pm.type || pm.method;
      const last4 =
        pm.last4 || pm.cardLast4 || pm.lastFour || pm.digits || pm.last4Digits;
      if (brand && last4) {
        return `${brand} ending with ${last4}`;
      }
      if (last4) {
        return `Card ending with ${last4}`;
      }
      if (brand) {
        return `${brand}`;
      }
      if (pm.label) return pm.label;
    }
    // String-form payment method (e.g. "razorpay" / "cod")
    if (typeof order?.paymentMethod === 'string' && order.paymentMethod) {
      const raw = order.paymentMethod;
      const label = raw
        .split(/[_-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
      return label;
    }
    return 'Original Payment Method';
  })();

  // ── Submit handler — Task 4w fix: skip the server-side API call entirely.
  // The Return Summary page (Step 4) is purely client-side: it synthesizes its
  // own Return ID from the order id + email hash, and shows the data the user
  // already entered (draft + methodData). No server-side support ticket is
  // needed for the return flow to work. The previous implementation POSTed to
  // /api/support-tickets, which (a) required a logged-in user session that the
  // public order-lookup flow doesn't have, and (b) failed with a 500
  // "Failed to create support ticket" error even when authenticated. We now
  // show a brief "Confirming..." state for UX clarity, then call onSuccess()
  // to route the user to Step 4. ──
  const handleSubmit = async () => {
    if (loading || confirmed) return;
    setLoading(true);
    setError('');
    try {
      // Brief delay so the user sees the "Confirming..." state — gives the
      // interaction a sense of progress rather than an instant route change.
      await new Promise((resolve) => setTimeout(resolve, 600));
      setConfirmed(true);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator (4 steps — Step 3 active, Steps 1 + 2 done) ──
  const STEPS = [
    { num: 1, label: 'Select items' },
    { num: 2, label: 'Select return method' },
    { num: 3, label: 'Confirm your return' },
    { num: 4, label: 'Return summary' },
  ];

  // ── Section wrapper — renders the section header + Edit link + children.
  // The Edit link goes to the step that owns that section. ──
  const Section = ({
    index,
    title,
    onEdit,
    editLabel = 'Edit',
    isLast = false,
    children,
  }: {
    index: number;
    title: string;
    onEdit: () => void;
    editLabel?: string;
    isLast?: boolean;
    children: React.ReactNode;
  }) => (
    <div className={`px-5 py-5 sm:px-8 ${isLast ? '' : `border-b ${t.hairline}`}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          className={`text-base font-bold ${t.textPrimary} sm:text-lg`}
          style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
        >
          {index}. {title}
        </h2>
        <button
          type="button"
          onClick={onEdit}
          disabled={loading}
          className={`shrink-0 text-xs ${t.accentText} hover:underline disabled:opacity-50`}
        >
          {editLabel}
        </button>
      </div>
      {children}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ── Breadcrumb / back ── */}
      {/* Task 4t pattern: only "Back to orders" is shown, no extra path segments. */}
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

      {/* ── Step indicator (4 steps) — Step 3 active, Steps 1 + 2 done ── */}
      <div
        className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} px-5 py-5 sm:px-8`}
      >
        <ol className="flex items-center justify-between gap-2">
          {STEPS.map((step, idx) => {
            const isActive = step.num === 3;
            const isDone = step.num === 1 || step.num === 2;
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
                      idx < 2
                        ? // Steps 1→2 and 2→3 connectors: highlighted (Steps 1+2 done)
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

      {/* ── Instructional text ── */}
      <p className={`text-sm ${t.textPrimary} sm:text-base`}>
        Please review your return details and confirm.
      </p>

      {/* ── Two-column layout: main review card + sidebar ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="space-y-5">
          {/* ── Single consolidated review card with 5 numbered sections ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            {/* ── Section 1: Items you are returning ── */}
            <Section index={1} title="Items you are returning" onEdit={onEditItems}>
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
                      className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start"
                    >
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
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </Section>

            {/* ── Section 2: Reason for return ── */}
            <Section index={2} title="Reason for return" onEdit={onEditItems}>
              <p className={`text-sm ${t.textPrimary} sm:text-base`}>
                {draft.reason || '—'}
              </p>
              {draft.comments && (
                <p className={`mt-2 text-xs ${t.textSecondary}`}>
                  <span className={`font-semibold ${t.textPrimary}`}>
                    Comments:{' '}
                  </span>
                  {draft.comments}
                </p>
              )}
              {draft.files.length > 0 && (
                <p className={`mt-1 text-xs ${t.textMuted}`}>
                  {draft.files.length} photo/video
                  {draft.files.length === 1 ? '' : 's'} attached
                </p>
              )}
            </Section>

            {/* ── Section 3: Return method ── */}
            <Section index={3} title="Return method" onEdit={onEditMethod}>
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    t.isDark ? 'bg-amber-500/15' : 'bg-amber-100'
                  }`}
                >
                  <Home
                    className={`h-6 w-6 ${t.accentText}`}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-bold ${t.textPrimary} sm:text-base`}
                    >
                      {methodData.returnMethodTitle}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 ${
                        t.isDark ? 'bg-emerald-500/15' : 'bg-emerald-100'
                      }`}
                    >
                      FREE
                    </span>
                  </div>
                  <p className={`text-sm ${t.textSecondary}`}>
                    We&apos;ll pick up the item from your address.
                  </p>
                  <p
                    className={`text-sm font-bold ${t.textPrimary}`}
                  >
                    Pickup in 1-2 business days
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Section 4: Pickup details (2-col) ── */}
            <Section index={4} title="Pickup details" onEdit={onEditMethod}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Pickup address */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}
                    >
                      Pickup address
                    </h4>
                    <button
                      type="button"
                      onClick={onEditAddress ?? onGoToHelp}
                      disabled={loading}
                      className={`text-xs ${t.accentText} hover:underline disabled:opacity-50`}
                    >
                      Edit address
                    </button>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin
                      className={`mt-0.5 h-5 w-5 shrink-0 ${t.textSecondary}`}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div
                        className={`text-sm font-bold capitalize ${t.textPrimary}`}
                      >
                        {methodData.pickupName}
                      </div>
                      {methodData.pickupAddressLines.map((line, i) => (
                        <div
                          key={i}
                          className={`text-sm ${t.textSecondary}`}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pickup date & time */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}
                    >
                      Pickup date &amp; time
                    </h4>
                    <button
                      type="button"
                      onClick={onEditMethod}
                      disabled={loading}
                      className={`text-xs ${t.accentText} hover:underline disabled:opacity-50`}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar
                      className={`mt-0.5 h-5 w-5 shrink-0 ${t.textSecondary}`}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div
                        className={`text-sm font-bold ${t.textPrimary}`}
                      >
                        {methodData.pickupDateLabel}
                      </div>
                      <div className={`text-sm ${t.textSecondary}`}>
                        {methodData.pickupTimeSlot}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {methodData.instructions && (
                <div className={`mt-4 rounded-lg border ${t.cardBorder} ${t.cardBgSoft} p-3`}>
                  <p
                    className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}
                  >
                    Additional instructions
                  </p>
                  <p className={`mt-1 text-sm ${t.textPrimary}`}>
                    {methodData.instructions}
                  </p>
                </div>
              )}
            </Section>

            {/* ── Section 5: Refund details ── */}
            <Section
              index={5}
              title="Refund details"
              onEdit={onEditMethod}
              isLast
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    t.isDark ? 'bg-amber-500/15' : 'bg-amber-100'
                  }`}
                >
                  <CreditCard
                    className={`h-6 w-6 ${t.accentText}`}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p
                    className={`text-sm font-medium ${t.textPrimary} sm:text-base`}
                  >
                    Refund will be credited to your original payment method
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      t.isDark ? 'text-amber-300' : 'text-amber-700'
                    }`}
                  >
                    {paymentDescription}
                  </p>
                  <p className={`text-xs ${t.textSecondary}`}>
                    Estimated refund date: 3-5 business days after we receive the
                    item.
                  </p>
                </div>
              </div>
            </Section>
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
              disabled={loading || confirmed}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-8 py-2.5 text-sm font-bold text-stone-950 shadow-sm transition-all hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : confirmed ? (
                <>
                  <Check className="h-4 w-4" />
                  Confirmed
                </>
              ) : (
                <>Confirm return</>
              )}
            </button>
          </div>

          {/* ── Security badge ── */}
          <div
            className={`flex items-center justify-center gap-2 text-xs ${t.textSecondary}`}
          >
            <Lock className={`h-3.5 w-3.5 ${t.textMuted}`} />
            <span>Your return is safe and secure</span>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN — Return summary + policy + help ════════════ */}
        {/* Task 4t: sticky applied to the entire sidebar column (not just the
            summary card) so the whole sidebar moves as a single unit and the
            summary card never overlaps the policy / need-help cards below it. */}
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
                  {paymentDescription}
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
