'use client';

/**
 * ReturnSummaryPage  —  Task 4v
 * ────────────────────────────────────────────────────────────────────────
 * Full-page "Your Returns" view, Step 4 of 4: "Return summary".
 *
 * Opens AFTER the user clicks "Confirm return" on the ConfirmReturnPage
 * (Step 3). Shows a single consolidated confirmation card with:
 *   • Success banner ("Your return request is confirmed!")
 *   • Return ID + Requested-on date row
 *   • 5 numbered review sections (Items / Reason / Return method /
 *     Pickup details / Refund details) — same content as Step 3, but
 *     read-only (no Edit links).
 *   • Action footer: "Download return summary" + "Done" buttons.
 *
 * Right sidebar replaces Step 3's "Need help" card with a new
 * "What happens next?" timeline card (3 steps: We'll pick up the item →
 * Item is inspected → Refund is issued), in addition to the Return summary
 * card and Return policy card.
 *
 * LAYOUT (matches reference screenshot):
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ← Back to orders                                                 │
 *   │                                                                  │
 *   │ Your Returns                                                     │
 *   │                                                                  │
 *   │ ✓ ─── ✓ ─── ✓ ─── ●   (4-step indicator, Step 4 active)         │
 *   │ 1     2     3     4                                              │
 *   │ Select items | Select return | Confirm return | Return summary   │
 *   │                                                                  │
 *   │ ┌────────────────────────────────┐  ┌────────────────────────┐   │
 *   │ │ ✓ Your return request is       │  │ Return summary         │   │
 *   │ │   confirmed!                   │  │ [img] Name  Qty 1  ₹X  │   │
 *   │ │   We've sent you an email...   │  │ Total product   ₹X     │   │
 *   │ │ ─────────────────────────────  │  │ Total refund    ₹X     │   │
 *   │ │ Return ID: RET-XXX  📋         │  │ (Incl. of all taxes)   │   │
 *   │ │ Requested on: 25 May 2024...   │  │ Refund method: ...     │   │
 *   │ │ ─────────────────────────────  │  │ Refund timeline: ...   │   │
 *   │ │ 1. Items you are returning     │  │ ─────────────────────── │   │
 *   │ │   [img] Name  Qty 1  ₹X        │  │ What happens next?     │   │
 *   │ │   Sold by · Order #            │  │  ① We'll pick up...    │   │
 *   │ │ ─────────────────────────────  │  │  ② Item is inspected   │   │
 *   │ │ 2. Reason for return           │  │  ③ Refund is issued    │   │
 *   │ │   <reason>                     │  │ ─────────────────────── │   │
 *   │ │ ─────────────────────────────  │  │ 🛡 Return policy        │   │
 *   │ │ 3. Return method               │  │   Most items eligible..│   │
 *   │ │   🏠 Home Pickup FREE          │  │   View full policy →   │   │
 *   │ │   We'll pick up the item...    │  │                        │   │
 *   │ │   Pickup in 1-2 business days  │  │                        │   │
 *   │ │ ─────────────────────────────  │  │                        │   │
 *   │ │ 4. Pickup details              │  │                        │   │
 *   │ │   📍 Pickup address            │  │                        │   │
 *   │ │      Rahul Sharma              │  │                        │   │
 *   │ │      101, 5th Cross...         │  │                        │   │
 *   │ │   📅 Pickup date & time        │  │                        │   │
 *   │ │      Sunday, 25 May 2024       │  │                        │   │
 *   │ │      3 PM - 6 PM               │  │                        │   │
 *   │ │ ─────────────────────────────  │  │                        │   │
 *   │ │ 5. Refund details              │  │                        │   │
 *   │ │   💳 Refund will be credited...│  │                        │   │
 *   │ │      Visa ending with 1234     │  │                        │   │
 *   │ │      Estimated refund date...  │  │                        │   │
 *   │ │ ─────────────────────────────  │  │                        │   │
 *   │ │ [Download summary]   [Done]    │  │                        │   │
 *   │ └────────────────────────────────┘  └────────────────────────┘   │
 *   │                                                                  │
 *   │         ❓ Need help? Read our Returns Help                     │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * THEME: matches the home page (dark luxury by default with gold #dbaf36
 * accent, Lora serif headings, Urbanist body). Reads the Theme token set
 * passed from the parent so it adapts to dark/light automatically. Success
 * / refund indicators remain emerald green for semantic consistency with
 * the rest of the orders flow.
 *
 * ACTION WIRING:
 *   • Back to orders       → onBack() (returns to orders list / dashboard).
 *   • Download summary     → handleDownloadSummary() — generates a client-side
 *                            PDF via jsPDF with the return details.
 *   • Done                 → onDone() (parent invalidates queries + clears
 *                            state + routes to orders list / home).
 *   • View policy / Help   → onGoToHelp() (parent routes to contact/support).
 *   • Edit address         → onEditAddress() (same handler as Step 2/3).
 *
 * STEP INDICATOR:
 *   Reference has 4 steps. This page represents Step 4 (Return summary)
 *   — the active step. Steps 1 + 2 + 3 are "done" (emerald checks).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Shield, Package,
  Home, MapPin, Calendar, CreditCard,
  Copy, Download, ClipboardList, PackageCheck, IndianRupee,
  HelpCircle, FileText,
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

interface ReturnSummaryPageProps {
  order: any;
  theme: Theme;
  draft: ReturnDraft;
  methodData: ReturnMethodData;
  /**
   * Timestamp the return was confirmed (ISO string). Falls back to "now"
   * if not provided. Used in the "Requested on:" row.
   */
  confirmedAt?: string;
  /**
   * Optional return ID to display. If not provided, we synthesize one from
   * the order id (e.g. "RET-XXXX-XXXXXXXX-XXXXXXXX") so the row always
   * has something to show + copy.
   */
  returnId?: string;
  /** Email of the logged-in user (used for the PDF download header). */
  email: string;
  /** Auth token — not used for any API call on this page (read-only view),
   *  but kept for symmetry with the other return-flow pages. */
  token: string | null;
  /** "Back to orders" link / browser back. */
  onBack: () => void;
  /** "Done" button — parent clears state + routes to orders list / home. */
  onDone: () => void;
  /** "View full return policy" / "Read our Returns Help" / "Contact us". */
  onGoToHelp: () => void;
  /** "View or edit address" link on the Pickup details card. Falls back to
   *  onGoToHelp if not provided. */
  onEditAddress?: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDateTime = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

// ── Synthesize a stable return ID from the order id ──
// Format: "RET-{orderId last 3}-{8 hex}-{8 hex}" — looks like Amazon's
// RET-XXX-XXXX-XXXX pattern. We hash chunks of the order id + email so the
// same order always produces the same return ID across renders.
const synthesizeReturnId = (orderId: string, email: string): string => {
  const seed = `${orderId}::${email}`;
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = (h1 * 31 + c) >>> 0;
    h2 = (h2 * 37 + c * 7) >>> 0;
  }
  const last3 = (orderId.replace(/[^a-zA-Z0-9]/g, '') || '000').slice(-3).toUpperCase().padStart(3, '0');
  const p1 = h1.toString(16).padStart(8, '0').toUpperCase().slice(0, 7);
  const p2 = h2.toString(16).padStart(8, '0').toUpperCase().slice(0, 7);
  return `RET-${last3}-${p1}-${p2}`;
};

export function ReturnSummaryPage({
  order,
  theme,
  draft,
  methodData,
  confirmedAt,
  returnId,
  email,
  token: _token,
  onBack,
  onDone,
  onGoToHelp,
  onEditAddress,
}: ReturnSummaryPageProps) {
  const t = theme;

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  // ── Return ID + requested-on timestamp ──
  const displayReturnId =
    returnId || synthesizeReturnId(String(order.id), email || '');
  const requestedOnLabel = fmtDateTime(confirmedAt) || fmtDateTime(new Date().toISOString());

  // ── Step indicator (4 steps — Step 4 active, Steps 1-3 done) ──
  const STEPS = [
    { num: 1, label: 'Select items' },
    { num: 2, label: 'Select return method' },
    { num: 3, label: 'Confirm your return' },
    { num: 4, label: 'Return summary' },
  ];

  // ── Copy return ID to clipboard ──
  const handleCopyReturnId = async () => {
    try {
      await navigator.clipboard.writeText(displayReturnId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silently ignore.
    }
  };

  // ── Download return summary as PDF (client-side via jsPDF) ──
  // Lazy-import jsPDF so the bundle stays light if the user never downloads.
  const handleDownloadSummary = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const maxWidth = pageWidth - margin * 2;
      let y = 0;

      // ── Header band (matches invoice PDF style) ──
      doc.setFillColor(20, 16, 14);
      doc.rect(0, 0, pageWidth, 80, 'F');
      doc.setTextColor(219, 175, 54);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('3 BOXES LUXURY', margin, 35);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(245, 230, 163);
      doc.text('Where luxury meets personalization', margin, 52);
      doc.setFontSize(12);
      doc.setTextColor(219, 175, 54);
      doc.text('RETURN SUMMARY', pageWidth - margin, 35, { align: 'right' });

      // ── Success banner ──
      y = 110;
      doc.setTextColor(0, 118, 0); // emerald-700
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Your return request is confirmed!', margin, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(86, 89, 89);
      doc.text("We've sent you an email with return details and instructions.", margin, y);
      y += 24;

      // ── Return ID + Requested on ──
      doc.setDrawColor(213, 217, 217);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(`Return ID:`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(displayReturnId, margin + 65, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`Requested on:`, pageWidth - margin - 200, y);
      doc.setFont('helvetica', 'normal');
      doc.text(requestedOnLabel, pageWidth - margin, y, { align: 'right' });
      y += 22;
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;

      // ── Helper: section heading ──
      const sectionHeading = (idx: number, title: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(20, 16, 14);
        const txt = `${idx}. ${title}`;
        doc.text(txt, margin, y);
        y += 16;
        // small underline accent
        doc.setDrawColor(219, 175, 54);
        doc.setLineWidth(1);
        doc.line(margin, y - 4, margin + doc.getTextWidth(txt), y - 4);
        doc.setDrawColor(213, 217, 217);
        doc.setLineWidth(0.5);
      };

      // ── Helper: wrapped paragraph ──
      const wrapped = (text: string, indent = 0) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        const lines = doc.splitTextToSize(text, maxWidth - indent);
        lines.forEach((line: string) => {
          if (y > pageHeight - 60) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin + indent, y);
          y += 14;
        });
      };

      const labeledLine = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        if (y > pageHeight - 60) {
          doc.addPage();
          y = margin;
        }
        doc.text(label, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(value, margin + 130, y);
        y += 14;
      };

      // ── Section 1: Items ──
      sectionHeading(1, 'Items you are returning');
      checkedItems.forEach((item: any) => {
        const line1 = `${item.name}`;
        const line2 = `Qty: ${item.quantity}     Price: ${fmt(item.price * (item.quantity || 1))}`;
        const line3 = `Sold by: Luxuria Marketplace`;
        wrapped(line1, 0);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(219, 175, 54);
        doc.text(line2, margin, y);
        y += 14;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(9);
        doc.text(line3, margin, y);
        y += 18;
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
      });
      y += 6;

      // ── Section 2: Reason ──
      sectionHeading(2, 'Reason for return');
      wrapped(draft.reason || '—');
      if (draft.comments) {
        doc.setFont('helvetica', 'bold');
        doc.text('Comments:', margin, y);
        y += 14;
        wrapped(draft.comments, 14);
      }
      if (draft.files.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(9);
        doc.text(
          `${draft.files.length} photo/video${draft.files.length === 1 ? '' : 's'} attached`,
          margin,
          y
        );
        y += 18;
      }
      y += 6;

      // ── Section 3: Return method ──
      sectionHeading(3, 'Return method');
      labeledLine('Method:', `${methodData.returnMethodTitle} (FREE)`);
      wrapped('We will pick up the item from your address.');
      wrapped('Pickup in 1-2 business days.');
      y += 6;

      // ── Section 4: Pickup details ──
      sectionHeading(4, 'Pickup details');
      doc.setFont('helvetica', 'bold');
      doc.text('Pickup address:', margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.text(methodData.pickupName, margin + 14, y);
      y += 14;
      methodData.pickupAddressLines.forEach((line) => {
        wrapped(line, 14);
      });
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Pickup date & time:', margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.text(`${methodData.pickupDateLabel} • ${methodData.pickupTimeSlot}`, margin + 14, y);
      y += 18;
      if (methodData.instructions) {
        doc.setFont('helvetica', 'bold');
        doc.text('Additional instructions:', margin, y);
        y += 14;
        wrapped(methodData.instructions, 14);
      }
      y += 6;

      // ── Section 5: Refund details ──
      sectionHeading(5, 'Refund details');
      labeledLine('Refund method:', paymentDescription);
      labeledLine('Refund amount:', fmt(refundAmount));
      wrapped('Estimated refund date: 3-5 business days after we receive the item.');
      y += 12;

      // ── Footer band ──
      doc.setDrawColor(213, 217, 217);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'This return summary was generated for your records. Please retain it until the refund is processed.',
        margin,
        y
      );
      y += 14;
      doc.text(
        `3 BOXES LUXURY · support@3boxesluxury.com · +91 80 4567 8900`,
        margin,
        y
      );

      // ── Page numbers ──
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 20,
          { align: 'right' }
        );
      }

      doc.save(`Return-Summary-${displayReturnId}.pdf`);
    } catch {
      // jsPDF load failure — silently ignore for now.
    } finally {
      setDownloading(false);
    }
  };

  // ── "What happens next?" timeline (right sidebar) ──
  const NEXT_STEPS = [
    {
      icon: ClipboardList,
      title: "We'll pick up the item",
      desc: 'Our delivery partner will pick up the item on the scheduled date and time.',
    },
    {
      icon: PackageCheck,
      title: 'Item is inspected',
      desc: 'Once we receive the item, it will be inspected within 1-2 business days.',
    },
    {
      icon: IndianRupee,
      title: 'Refund is issued',
      desc: 'Refund will be credited to your original payment method.',
    },
  ];

  // ── Section wrapper (read-only — no Edit link) ──
  const Section = ({
    index,
    title,
    isLast = false,
    children,
  }: {
    index: number;
    title: string;
    isLast?: boolean;
    children: React.ReactNode;
  }) => (
    <div className={`px-5 py-5 sm:px-8 ${isLast ? '' : `border-b ${t.hairline}`}`}>
      <div className="mb-4 flex items-center gap-3">
        <h2
          className={`text-base font-bold ${t.textPrimary} sm:text-lg`}
          style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
        >
          {index}. {title}
        </h2>
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
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center gap-1 ${t.accentText} hover:underline`}
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

      {/* ── Step indicator (4 steps) — Step 4 active, Steps 1-3 done ── */}
      <div
        className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} px-5 py-5 sm:px-8`}
      >
        <ol className="flex items-center justify-between gap-2">
          {STEPS.map((step, idx) => {
            const isActive = step.num === 4;
            const isDone = step.num === 1 || step.num === 2 || step.num === 3;
            return (
              <li key={step.num} className="flex flex-1 items-center">
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
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-3 ${
                      idx < 3
                        ? t.isDark
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

      {/* ── Two-column layout: main summary card + sidebar ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="space-y-5">
          {/* ── Single consolidated summary card ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            {/* ── Success banner ── */}
            <div
              className={`flex items-start gap-4 px-5 py-6 sm:px-8 ${
                t.isDark
                  ? 'bg-gradient-to-br from-emerald-900/30 via-emerald-800/15 to-transparent'
                  : 'bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-transparent'
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md`}
              >
                <Check className="h-6 w-6" strokeWidth={3} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h2
                  className={`text-lg font-bold ${t.textPrimary} sm:text-xl`}
                  style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
                >
                  Your return request is confirmed!
                </h2>
                <p className={`text-sm ${t.textSecondary}`}>
                  We&apos;ve sent you an email with return details and
                  instructions.
                </p>
              </div>
            </div>

            {/* ── Return ID + Requested on ── */}
            <div
              className={`flex flex-col gap-3 border-b ${t.hairline} px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}
                >
                  Return ID:
                </span>
                <span
                  className={`font-mono text-sm font-bold ${t.textPrimary}`}
                >
                  {displayReturnId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReturnId}
                  className={`inline-flex items-center justify-center rounded p-1 transition-colors ${
                    t.isDark
                      ? 'text-amber-300/70 hover:bg-amber-500/15 hover:text-amber-300'
                      : 'text-stone-400 hover:bg-amber-100 hover:text-amber-700'
                  }`}
                  title="Copy return ID"
                  aria-label="Copy return ID"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {requestedOnLabel && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}
                  >
                    Requested on:
                  </span>
                  <span className={`text-sm ${t.textPrimary}`}>
                    {requestedOnLabel}
                  </span>
                </div>
              )}
            </div>

            {/* ── Section 1: Items you are returning ── */}
            <Section index={1} title="Items you are returning">
              <ul
                className={`divide-y ${t.isDark ? 'divide-amber-500/10' : 'divide-amber-200/60'}`}
              >
                {checkedItems.length === 0 ? (
                  <li className={`py-3 text-sm ${t.textMuted}`}>
                    No items were selected for this return.
                  </li>
                ) : (
                  checkedItems.map((item: any) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start"
                    >
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
                      <div className={`text-right text-sm font-bold ${t.textPrimary} sm:w-28 sm:shrink-0`}>
                        {fmt(item.price * (item.quantity || 1))}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </Section>

            {/* ── Section 2: Reason for return ── */}
            <Section index={2} title="Reason for return">
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
            <Section index={3} title="Return method">
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
                  <p className={`text-sm font-bold ${t.textPrimary}`}>
                    Pickup in 1-2 business days
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Section 4: Pickup details (2-col) ── */}
            <Section index={4} title="Pickup details">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Pickup address */}
                <div className="space-y-2">
                  <h4
                    className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}
                  >
                    Pickup address
                  </h4>
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
                  <h4
                    className={`text-xs font-bold uppercase tracking-wide ${t.textSecondary}`}
                  >
                    Pickup date &amp; time
                  </h4>
                  <div className="flex items-start gap-3">
                    <Calendar
                      className={`mt-0.5 h-5 w-5 shrink-0 ${t.textSecondary}`}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className={`text-sm font-bold ${t.textPrimary}`}>
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
            <Section index={5} title="Refund details" isLast>
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
                  <p className={`text-sm font-medium ${t.textPrimary} sm:text-base`}>
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

          {/* ── Action buttons row ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadSummary}
              disabled={downloading}
              className={`rounded-full px-6 ${t.cardBorder} ${t.textSecondary} hover:${t.accentBgSoft}`}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {downloading ? 'Generating...' : 'Download return summary'}
            </Button>
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-10 py-2.5 text-sm font-bold text-stone-950 shadow-sm transition-all hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 hover:shadow-md"
            >
              Done
            </button>
          </div>

          {/* ── Bottom help link ── */}
          <div
            className={`flex items-center justify-center gap-2 text-xs ${t.textSecondary}`}
          >
            <HelpCircle className={`h-3.5 w-3.5 ${t.textMuted}`} />
            <span>Need help?</span>
            <button
              type="button"
              onClick={onGoToHelp}
              className={`${t.accentText} hover:underline`}
            >
              Read our Returns Help
            </button>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN — Return summary + What happens next + policy ════════════ */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
          {/* ── Return summary card ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            <div className="px-5 py-4">
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Return summary
              </h2>
            </div>
            <div className={`border-t ${t.hairline}`} />

            {/* Selected items list */}
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
                <span className={t.textSecondary}>Total items</span>
                <span className={`${t.textPrimary} font-medium`}>
                  {checkedItems.length}
                </span>
              </div>
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
                <div className={`font-bold ${t.textPrimary}`}>
                  Refund method
                </div>
                <div className={`${t.textSecondary}`}>
                  {paymentDescription}
                </div>
              </div>
              <div>
                <div className={`font-bold ${t.textPrimary}`}>
                  Refund timeline
                </div>
                <div className={`${t.textSecondary}`}>
                  3-5 business days after we receive the item
                </div>
              </div>
            </div>
          </div>

          {/* ── What happens next? card ── */}
          <div
            className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} p-5`}
          >
            <h3
              className={`text-sm font-bold ${t.textPrimary}`}
              style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
            >
              What happens next?
            </h3>
            <ol className="mt-4 space-y-4">
              {NEXT_STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <li key={idx} className="flex gap-3">
                    {/* Icon column with vertical connector line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                          t.isDark
                            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                            : 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      {idx < NEXT_STEPS.length - 1 && (
                        <div
                          className={`mt-1 w-px flex-1 ${
                            t.isDark ? 'bg-amber-500/15' : 'bg-stone-200'
                          }`}
                          style={{ minHeight: 20 }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p
                        className={`text-sm font-bold ${t.textPrimary}`}
                      >
                        {step.title}
                      </p>
                      <p
                        className={`mt-0.5 text-xs leading-relaxed ${t.textSecondary}`}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
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
                  className={`mt-2 inline-flex items-center gap-1 text-xs ${t.accentText} hover:underline`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  View full return policy →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
