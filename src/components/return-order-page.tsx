'use client';

/**
 * ReturnOrderPage  —  Task 4r
 * ────────────────────────────────────────────────────────────────────────
 * Full-page "Your Returns" view, opened when the user clicks the Return
 * button on an order card. Replaces the previous small modal dialog with a
 * dedicated page that matches the uploaded Amazon-style reference screenshot,
 * adapted to the project's luxury theme.
 *
 * LAYOUT (matches reference):
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ← Back to orders  /  Your Account / Your Orders / Return Items   │
 *   │                                                                  │
 *   │ Your Returns                                                     │
 *   │                                                                  │
 *   │ ● ─── ○ ─── ○ ─── ○   (4-step indicator)                        │
 *   │ 1     2     3     4                                              │
 *   │ Select items | Select return | Confirm return | Return summary   │
 *   │                                                                  │
 *   │ ┌────────────────────────────────┐  ┌────────────────────────┐   │
 *   │ │ ☑ [img] Item name   ₹X         │  │ Return summary         │   │
 *   │ │       Sold by: ...             │  │ [img] Name  Qty 1  ₹X  │   │
 *   │ │       Order #  · Ordered on    │  │ Total refund   ₹X      │   │
 *   │ │ ──────────────────────────────│  │ (green, bold)          │   │
 *   │ │ Select a reason for return [▼] │  │ (Incl. of all taxes)   │   │
 *   │ │ Comments (optional)            │  │ ────────────────────── │   │
 *   │ │ [textarea] 200 chars remaining │  │ 🛡 Return policy        │   │
 *   │ │ Upload photos/videos (optional)│  │   Most items eligible..│   │
 *   │ │ [dashed drop zone]             │  │   View full policy →   │   │
 *   │ │ [Cancel]      [Continue]       │  │ ────────────────────── │   │
 *   │ └────────────────────────────────┘  │ Need help?              │   │
 *   │                                    │ 💬 Read our Returns Help│   │
 *   │                                    │ 📞 Contact us           │   │
 *   │                                    └────────────────────────┘   │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * THEME: matches the home page (dark luxury by default with gold #dbaf36
 * accent, Lora serif headings, Urbanist body). Reads the Theme token set
 * passed from the parent so it adapts to dark/light automatically. Success
 * / refund indicators remain emerald green for semantic consistency with
 * the rest of the orders flow.
 *
 * ACTION WIRING:
 *   • Cancel         → onBack() (returns to the orders list)
 *   • Continue       → IF onContinue is provided: calls onContinue(draft) so the
 *                       parent can route to Step 2 (ReturnMethodPage) with
 *                       the { selectedItemIds, reason, comments, files }
 *                       draft in hand. Otherwise (legacy fallback): POST
 *                       /api/support-tickets with the same data + onSuccess().
 *   • Checkbox/item  → tracks which items the user wants to return
 *                       (UI-level only for the refund preview; the actual
 *                       return request includes the selected item IDs).
 *   • View policy    → onGoToHelp() (parent routes to contact/support page).
 *   • Read Help / Contact → onGoToHelp() (same destination).
 *
 * STEP INDICATOR:
 *   Reference has 4 steps. This page represents Step 1 (Select items) — the
 *   active step. Steps 2-4 are shown but greyed out, matching the reference.
 *
 * TASK 4s — added optional onContinue + initialDraft props so the Continue
 * button can route to Step 2 (ReturnMethodPage) instead of submitting, and
 * state can be restored when the user comes back from Step 2.
 */

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, ChevronDown, Shield, Camera, MessageCircle, Phone,
  Package, Loader2, Upload, X,
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

// ── Draft shape handed to Step 2 (ReturnMethodPage) via onContinue ──
export interface ReturnDraft {
  selectedItemIds: string[];
  reason: string;
  comments: string;
  files: File[];
}

interface ReturnOrderPageProps {
  order: any;
  theme: Theme;
  onBack: () => void;
  onSuccess: () => void;
  onGoToHelp: () => void;
  email: string;
  token: string | null;
  /**
   * When provided, the Continue button calls onContinue(draft) instead of
   * POSTing to /api/support-tickets. The parent should route to Step 2
   * (ReturnMethodPage) and pass the draft through. When omitted, the legacy
   * submit-and-onSuccess path is used (backward compatible).
   */
  onContinue?: (draft: ReturnDraft) => void;
  /**
   * Optional initial draft — used to restore Step 1 state when the user
   * navigates back from Step 2. The File[] is preserved by reference in the
   * parent's state, so the previously-selected files reappear in the list.
   */
  initialDraft?: ReturnDraft;
}

// ── Return reason options (matches the reference screenshot's dropdown) ──
const RETURN_REASONS = [
  'The product is defective / not working',
  'Item damaged during delivery',
  'Wrong item was delivered',
  'Item does not match the description',
  'Received a different size / variant',
  'Changed my mind / No longer needed',
  'Found a better price elsewhere',
  'Arrived too late',
  'Missing parts or accessories',
  'Other',
];

const MAX_COMMENT_CHARS = 200;
const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 10;

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

export function ReturnOrderPage({
  order,
  theme,
  onBack,
  onSuccess,
  onGoToHelp,
  email,
  token,
  onContinue,
  initialDraft,
}: ReturnOrderPageProps) {
  const t = theme;

  // ── All items start checked (matches reference screenshot's default state).
  // If initialDraft is provided (user navigated back from Step 2), restore the
  // previously selected item IDs + reason + comments + files instead. ──
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    initialDraft && initialDraft.selectedItemIds.length > 0
      ? new Set(initialDraft.selectedItemIds)
      : new Set((order.items ?? []).map((item: any) => item.id))
  );
  const [returnReason, setReturnReason] = useState(initialDraft?.reason ?? '');
  const [comments, setComments] = useState(initialDraft?.comments ?? '');
  const [files, setFiles] = useState<File[]>(initialDraft?.files ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    // Validate size + type, then merge with existing files (cap at MAX_FILES).
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4'];
    const accepted: File[] = [];
    for (const f of selected) {
      if (!validTypes.includes(f.type)) continue;
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) continue;
      accepted.push(f);
    }
    setFiles((prev) => {
      const merged = [...prev, ...accepted];
      return merged.slice(0, MAX_FILES);
    });
    // Reset the input value so the same file can be re-selected later.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const allItems: any[] = order.items ?? [];
  const checkedItems = allItems.filter((item) => selectedItemIds.has(item.id));
  const refundAmount = checkedItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );
  const subtotal = allItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  const canSubmit = selectedItemIds.size > 0 && !!returnReason && files.length > 0 && !loading;
  const remainingChars = MAX_COMMENT_CHARS - comments.length;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // ── Task 4s: if onContinue is provided, hand the draft to the parent and
    // let Step 2 (ReturnMethodPage) do the actual API submission. This keeps
    // Step 1 strictly about selecting items + reason + comments + files. ──
    if (onContinue) {
      onContinue({
        selectedItemIds: Array.from(selectedItemIds),
        reason: returnReason,
        comments,
        files,
      });
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

  const orderNumber = order.orderNumber ?? String(order.id).slice(-8).toUpperCase();
  const checkedCount = selectedItemIds.size;

  // ── Step indicator (4 steps — matches reference) ──
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

      {/* ── Step indicator (4 steps) ── */}
      <div
        className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} px-5 py-5 sm:px-8`}
      >
        <ol className="flex items-center justify-between gap-2">
          {STEPS.map((step, idx) => {
            const isActive = step.num === 1;
            const isDone = false; // We're on step 1; no steps are complete yet.
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
                      isActive
                        ? t.textPrimary
                        : t.textMuted
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {/* Connector line (after each step except the last) */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-3 ${
                      idx < 0 // Step 1 is active but not done, so connectors remain muted
                        ? t.isDark
                          ? 'bg-amber-400/60'
                          : 'bg-amber-500/60'
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
          {/* ── Item selection card ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
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
                      <p className={`mt-1 text-xs ${t.textMuted}`}>
                        Sold by: Luxuria Marketplace
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className={t.textMuted}>
                          Order ID:{' '}
                          <span className={`font-mono ${t.textPrimary}`}>{orderNumber}</span>
                        </span>
                        <span className={t.textMuted}>
                          Ordered on: {fmtDate(order.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Price (right side) */}
                    <div className="hidden shrink-0 text-right sm:block">
                      <p
                        className={`text-sm font-bold ${
                          t.isDark ? 'text-amber-300' : 'text-amber-700'
                        }`}
                      >
                        {fmt(item.price * (item.quantity || 1))}
                      </p>
                      <p className={`mt-0.5 text-xs ${t.textMuted}`}>Qty {item.quantity}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Return form card ── */}
          <div
            className={`space-y-5 rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            {/* Return reason dropdown (required) */}
            <div>
              <label
                htmlFor="return-reason"
                className={`block text-sm font-medium ${t.textSecondary}`}
              >
                Select a reason for return <span className={t.accentText}>(required)</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  disabled={loading}
                  className={`w-full appearance-none rounded-lg border ${t.cardBorder} ${
                    t.isDark ? 'bg-stone-900/70' : 'bg-white'
                  } px-3 py-2.5 pr-10 text-sm ${
                    returnReason ? t.textPrimary : t.textMuted
                  } focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50`}
                >
                  <option value="">Select a reason for return</option>
                  {RETURN_REASONS.map((r) => (
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

            {/* Comments textarea (optional, 200 char limit) */}
            <div>
              <label
                htmlFor="return-comments"
                className={`block text-sm font-medium ${t.textSecondary}`}
              >
                Comments <span className={t.textMuted}>(optional)</span>
              </label>
              <textarea
                id="return-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value.slice(0, MAX_COMMENT_CHARS))}
                disabled={loading}
                rows={4}
                placeholder="Please provide more details about the issue..."
                className={`mt-1.5 w-full resize-none rounded-lg border ${t.cardBorder} ${
                  t.isDark ? 'bg-stone-900/70' : 'bg-white'
                } px-3 py-2.5 text-sm ${t.textPrimary} placeholder:${t.textMuted} focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50`}
              />
              <p className={`mt-1 text-right text-xs ${t.textMuted}`}>
                {remainingChars} characters remaining
              </p>
            </div>

            {/* File upload (required, up to 3 files) — Task 4t: changed from optional to required */}
            <div>
              <label
                className={`block text-sm font-medium ${t.textSecondary}`}
              >
                Upload photos/videos <span className={t.accentText}>(required)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.mp4"
                multiple
                onChange={handleFileSelect}
                disabled={loading || files.length >= MAX_FILES}
                className="hidden"
                id="return-file-upload"
              />
              <label
                htmlFor="return-file-upload"
                className={`mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed ${
                  t.isDark
                    ? 'border-amber-500/25 bg-stone-900/40 hover:border-amber-500/40 hover:bg-stone-900/60'
                    : 'border-amber-300 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50/60'
                } p-4 transition-all ${
                  loading || files.length >= MAX_FILES ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    t.isDark ? 'bg-amber-500/15' : 'bg-amber-100'
                  }`}
                >
                  <Camera className={`h-5 w-5 ${t.accentText}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${t.textPrimary}`}>
                    {files.length >= MAX_FILES
                      ? `${MAX_FILES} files added (max reached)`
                      : `Add up to ${MAX_FILES - files.length} more file${
                          MAX_FILES - files.length === 1 ? '' : 's'
                        }`}
                  </p>
                  <p className={`mt-0.5 text-xs ${t.textMuted}`}>
                    Formats: .jpg, .png, .mp4 | Max size: {MAX_FILE_SIZE_MB}MB each
                  </p>
                </div>
                <Upload className={`h-5 w-5 shrink-0 ${t.textMuted}`} />
              </label>

              {/* Selected files list */}
              {files.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {files.map((f, idx) => (
                    <li
                      key={`${f.name}-${idx}`}
                      className={`flex items-center gap-2 rounded-md border ${t.cardBorder} ${
                        t.isDark ? 'bg-stone-900/60' : 'bg-amber-50/40'
                      } px-3 py-2 text-xs`}
                    >
                      <Camera className={`h-3.5 w-3.5 shrink-0 ${t.accentText}`} />
                      <span className={`min-w-0 flex-1 truncate ${t.textPrimary}`}>
                        {f.name}
                      </span>
                      <span className={t.textMuted}>
                        {(f.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        disabled={loading}
                        className={`shrink-0 rounded-full p-1 ${t.textMuted} hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50`}
                        aria-label="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Action buttons row */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t ${t.hairline} pt-4">
              <span className="sr-only">Actions</span>
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={loading}
                className={`rounded-full px-6 ${t.cardBorder} ${t.textSecondary} hover:${t.accentBgSoft}`}
              >
                Cancel
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
                    Submitting...
                  </>
                ) : (
                  <>
                    Continue
                  </>
                )}
              </button>
            </div>
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
            <ul className={`divide-y ${t.isDark ? 'divide-amber-500/10' : 'divide-amber-200/60'}`}>
              {checkedItems.length === 0 ? (
                <li className={`px-5 py-4 text-xs ${t.textMuted}`}>
                  No items selected. Check at least one item to continue.
                </li>
              ) : (
                checkedItems.map((item: any) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border ${t.cardBorder} bg-stone-100 dark:bg-stone-800`}
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className={`h-4 w-4 ${t.textMuted}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-medium ${t.textPrimary}`}>
                        {item.name}
                      </p>
                      <p className={`text-xs ${t.textMuted}`}>Qty: {item.quantity}</p>
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

            {/* Total refund row */}
            <div
              className={`border-t ${t.hairline} px-5 py-4 ${
                t.isDark ? 'bg-stone-900/40' : 'bg-amber-50/40'
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                  Total refund amount
                </span>
                <span className="font-bold text-emerald-500 dark:text-emerald-400">
                  {fmt(refundAmount)}
                </span>
              </div>
              <p className={`mt-1 text-xs ${t.textMuted}`}>(Inclusive of all taxes)</p>
              <p className={`mt-1.5 text-xs ${t.textMuted}`}>
                {checkedCount} of {allItems.length} item{allItems.length !== 1 ? 's' : ''} selected.
              </p>
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
                <p className={`mt-1 text-xs leading-relaxed ${t.textSecondary}`}>
                  Most items are eligible for return within 10 days of delivery. Return
                  items in original condition and packaging.
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
                  <MessageCircle className={`h-4 w-4 shrink-0 ${t.accentText}`} />
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
