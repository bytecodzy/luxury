'use client';

/**
 * TrackOrderPage  —  Task 4aa
 * ────────────────────────────────────────────────────────────────────────
 * Full-page "Track your order" view, opened when the user clicks the
 * "Track Order" button on an order card inside the dashboard's Order
 * Tracking list (TrackOrdersView). Mirrors the Amazon-style "Track
 * Package" reference layout, adapted to the project's luxury gold-on-dark
 * theme (Lora serif headings, Urbanist body, #dbaf36 accent).
 *
 * LAYOUT (matches reference screenshot):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ ← Your Orders / Order Details / Track Shipment               │
 *   │                                                          ─── │
 *   │ {Status headline — e.g. "Arriving Fri, 15 Aug"}              │
 *   │ {Status subtitle — e.g. "Your package is on the way."}       │
 *   │                                                              │
 *   │ ●━━━━●━━━━━━●━━━━━━○   (horizontal 4-stage timeline)        │
 *   │ Ordered  Shipped  Out for   Delivered                        │
 *   │ 12 Aug   13 Aug    delivery   15 Aug                         │
 *   │                                                              │
 *   │ ┌────────────────────────────────┐  ┌────────────────────┐   │
 *   │ │ Shipment details               │  │ Shipment details   │   │
 *   │ │ Tracking ID: {trackingNumber}  │  │ Latest update: ... │   │
 *   │ │ ──────────────────────────────│  │ ● 10:15 AM          │   │
 *   │ │ [img] {product name}          │  │   Out for delivery  │   │
 *   │ │ Qty: 1 | ₹X | Sold by: ...    │  │   Bengaluru        │   │
 *   │ │ [Buy it again]                │  │ ○ 8:02 AM           │   │
 *   │ └────────────────────────────────┘  │   Arrived at ...    │   │
 *   │ ┌────────────────────────────────┐  │   ...               │   │
 *   │ │ Delivery status | Delivery to  │  │ [View all updates] │   │
 *   │ │ {status}                       │  └────────────────────┘   │
 *   │ │ {description}                  │  ┌────────────────────┐   │
 *   │ │ [See all updates]              │  │ Order Details      │   │
 *   │ │ ──────────────────────────────│  │ Order placed: ...  │   │
 *   │ │ Delivery to                    │  │ Order #: ...       │   │
 *   │ │ {userName}                     │  │ Order total: ₹X    │   │
 *   │ │ [Change address]               │  │ [View order →]     │   │
 *   │ └────────────────────────────────┘  └────────────────────┘   │
 *   │ ┌────────────────────────────────┐  ┌────────────────────┐   │
 *   │ │ 🚚 🛡 🔔 🔄  (4 service feats) │  │ Need help?         │   │
 *   │ └────────────────────────────────┘  │ [Visit Help Center]│   │
 *   │ ┌────────────────────────────────┐  └────────────────────┘   │
 *   │ │ Products in this order         │                           │
 *   │ │ [img] {name} Qty: 1 ₹X         │                           │
 *   │ │ [View this item]               │                           │
 *   │ └────────────────────────────────┘                           │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * THEME: matches the home page (dark luxury by default with gold #dbaf36
 * accent, Lora serif headings, Urbanist body). Reads the Theme token set
 * passed from the parent so it adapts to dark/light automatically.
 *
 * DATA SOURCES (no hardcoded data — everything comes from the order prop
 * or the tracking-events API):
 *   • `order` prop              — the order object from /api/orders?email=
 *                                 (id, orderNumber, status, totals, items,
 *                                  trackingNumber, trackingUrl,
 *                                  estimatedDelivery, createdAt, …)
 *   • /api/orders/[id]/tracking — list of OrderTrackingEvent rows
 *                                 ({ status, description, location,
 *                                  timestamp }) used to populate the
 *                                 sidebar's vertical event timeline and
 *                                 enrich the horizontal stage dates.
 *
 * ACTION WIRING:
 *   • Back button / breadcrumb  → onBack() (returns to the orders list)
 *   • Buy it again              → onBuyAgain(order)
 *   • View this item            → onViewItem(order)
 *   • Contact Support / Help    → onGoToHelp()
 *   • Track on courier site     → opens order.trackingUrl in a new tab
 *   • See all updates           → scrolls the sidebar timeline into view
 *   • View order details        → toggles the inline items list
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, Package, Loader2, Truck,
  ExternalLink, Shield, Headphones, Eye, Bell,
  ChevronRight, RotateCcw,
} from 'lucide-react';

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

interface TrackOrderPageProps {
  order: any;
  theme: Theme;
  onBack: () => void;
  onBuyAgain: (order: any) => void;
  onViewItem: (order: any) => void;
  onGoToHelp: () => void;
  email: string;
  token: string | null;
  /** Customer's display name — used in the "Delivery to" card. */
  userName?: string;
  /** Optional: parent passes the confirmed-return-request flag + date so
   *  the timeline can append a "Return Requested" stage. */
  hasReturnRequest?: boolean;
  returnRequestedDate?: string;
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

const fmtDateShort = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '—';
  }
};

const fmtTime = (d: string) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const fmtDateTime = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const authH = (t: string | null): Record<string, string> =>
  t ? { Authorization: `Bearer ${t}` } : {};

// ── Status headline + subtitle (derived from order.status + dates) ──
function getStatusHeadline(order: any): string {
  const status = order?.status;
  const ed = order?.estimatedDelivery;
  if (status === 'delivered') {
    return ed ? `Delivered on ${fmtDate(ed)}` : 'Delivered';
  }
  if (status === 'shipped') {
    return ed ? `Arriving ${fmtDate(ed)}` : 'On the way';
  }
  if (status === 'processing') return 'Preparing your order';
  if (status === 'pending') return 'Order received';
  if (status === 'cancelled') return 'Order cancelled';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Track your order';
}

function getStatusSubtitle(order: any, hasReturnRequest: boolean): string {
  if (hasReturnRequest) return 'A return request has been submitted for this order.';
  const status = order?.status;
  if (status === 'delivered') return 'Your package was delivered successfully.';
  if (status === 'shipped')
    return order?.estimatedDelivery
      ? `Your package is on the way. Expected by ${fmtDate(order.estimatedDelivery)}.`
      : 'Your package is on the way.';
  if (status === 'processing') return 'We are preparing your items for shipment.';
  if (status === 'pending') return 'Awaiting order confirmation.';
  if (status === 'cancelled') return 'This order has been cancelled.';
  return 'Follow your shipment\u2019s progress in real time.';
}

// ── Horizontal timeline stages ──
// The standard shipment lifecycle shown as a horizontal progress tracker.
// `key` correlates with backend Order.status / OrderTrackingEvent.status.
type StageState = 'completed' | 'current' | 'pending';
interface HorizontalStage {
  key: string;
  label: string;
  date: string;
  state: StageState;
}

function deriveHorizontalStages(
  order: any,
  hasReturnRequest: boolean,
  returnRequestedDate: string,
  events: { status: string; timestamp?: string }[],
): HorizontalStage[] {
  const status = order?.status ?? '';
  const findEv = (s: string) => events.find((e) => e.status === s);

  const stages: HorizontalStage[] = [
    {
      key: 'ordered',
      label: 'Ordered',
      date: fmtDateShort(order?.createdAt ?? ''),
      state: 'completed',
    },
    {
      key: 'shipped',
      label: 'Shipped',
      date: findEv('shipped')?.timestamp
        ? fmtDateShort(findEv('shipped')!.timestamp!)
        : ['shipped', 'delivered'].includes(status)
        ? 'Shipped'
        : 'Pending',
      state: ['shipped', 'delivered'].includes(status)
        ? 'completed'
        : status === 'processing' || status === 'pending'
        ? 'current'
        : 'pending',
    },
    {
      key: 'out_for_delivery',
      label: 'Out for delivery',
      date: findEv('out_for_delivery')?.timestamp
        ? fmtDateShort(findEv('out_for_delivery')!.timestamp!)
        : status === 'delivered'
        ? 'Done'
        : 'Pending',
      state: status === 'delivered' ? 'completed' : status === 'shipped' ? 'current' : 'pending',
    },
    {
      key: 'delivered',
      label: 'Delivered',
      date: order?.estimatedDelivery
        ? fmtDateShort(order.estimatedDelivery)
        : status === 'delivered'
        ? 'Delivered'
        : 'Pending',
      state:
        status === 'delivered' && !hasReturnRequest
          ? 'completed'
          : hasReturnRequest
          ? 'completed'
          : 'pending',
    },
  ];

  if (hasReturnRequest) {
    stages.push({
      key: 'return_requested',
      label: 'Return Requested',
      date: returnRequestedDate || 'Submitted',
      state: 'current',
    });
  }

  return stages;
}

export function TrackOrderPage({
  order,
  theme,
  onBack,
  onBuyAgain,
  onViewItem,
  onGoToHelp,
  email,
  token,
  userName,
  hasReturnRequest = false,
  returnRequestedDate = '',
}: TrackOrderPageProps) {
  const t = theme;
  const orderNumber =
    order?.orderNumber ?? String(order?.id ?? '').slice(-8).toUpperCase();

  // ── Fetch real tracking events from /api/orders/[id]/tracking ──
  const [events, setEvents] = useState<
    { id?: string; status: string; description?: string; location?: string; timestamp?: string }[]
  >([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setEventsError(false);
    fetch(`/api/orders/${encodeURIComponent(order?.id ?? '')}/tracking`, {
      headers: authH(token),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load tracking events');
        const data = await res.json();
        if (cancelled) return;
        const ev = Array.isArray(data?.events) ? data.events : [];
        setEvents(
          ev.map((e: any) => ({
            id: e.id,
            status: e.status,
            description: e.description,
            location: e.location,
            timestamp: e.timestamp,
          })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setEventsError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.id, token]);

  const horizontalStages = deriveHorizontalStages(
    order,
    hasReturnRequest,
    returnRequestedDate,
    events,
  );

  // Latest event (for the "Latest update" header in the sidebar).
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  const allItems: any[] = order?.items ?? [];
  const itemCount = allItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const firstItem = allItems[0];

  const carrierName = (() => {
    const url = order?.trackingUrl;
    if (!url || typeof url !== 'string') return null;
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      const root = host.split('.')[0];
      if (!root) return null;
      return root.charAt(0).toUpperCase() + root.slice(1);
    } catch {
      return null;
    }
  })();

  const statusHeadline = getStatusHeadline(order);
  const statusSubtitle = getStatusSubtitle(order, hasReturnRequest);
  const effectiveStatus = hasReturnRequest ? 'return' : order?.status;

  // Ref for "See all updates" smooth-scroll target (the sidebar timeline).
  const sidebarTimelineRef = useRef<HTMLDivElement | null>(null);

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
        <span className={t.textMuted}>/</span>
        <span className={t.textMuted}>Your Orders</span>
        <span className={t.textMuted}>/</span>
        <span className={t.textMuted}>Order Details</span>
        <span className={t.textMuted}>/</span>
        <span className={`${t.accentText} font-medium`}>Track Shipment</span>
      </div>

      {/* ── Title + subtitle ── */}
      <div>
        <h1
          className={`text-2xl font-bold ${t.textPrimary}`}
          style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
        >
          {statusHeadline}
        </h1>
        <p className={`mt-1.5 text-sm ${t.textSecondary}`}>{statusSubtitle}</p>
      </div>

      {/* ── Horizontal 4-stage timeline ── */}
      <div
        className={`rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} px-5 py-6 sm:px-8`}
      >
        <div className="flex items-center">
          {horizontalStages.map((stage, idx) => {
            const isLast = idx === horizontalStages.length - 1;
            const isCompleted = stage.state === 'completed';
            const isCurrent = stage.state === 'current';
            return (
              <div
                key={stage.key}
                className={`flex ${isLast ? 'shrink-0' : 'flex-1'} items-start`}
              >
                {/* Node + label column */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-stone-950'
                        : isCurrent
                        ? `border-amber-400 bg-amber-400/10 ${t.accentText} shadow-md shadow-amber-400/30`
                        : `${t.isDark ? 'border-stone-700 bg-stone-900' : 'border-stone-300 bg-white'} ${t.textMuted}`
                    }`}
                  >
                    {isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCompleted ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                  </div>
                  <p
                    className={`mt-2 text-center text-xs font-semibold ${
                      isCompleted || isCurrent ? t.textPrimary : t.textMuted
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className={`mt-0.5 text-center text-[11px] ${t.textMuted}`}>
                    {stage.date}
                  </p>
                </div>
                {/* Connector line (not after the last node) */}
                {!isLast && (
                  <div
                    className={`mx-2 mt-4 h-0.5 flex-1 self-start rounded-full ${
                      isCompleted
                        ? t.isDark
                          ? 'bg-emerald-600/60'
                          : 'bg-emerald-400'
                        : t.isDark
                        ? 'bg-stone-700'
                        : 'bg-stone-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="space-y-5">
          {/* ── Card 1: Shipment details (product summary) ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            <div className="px-5 py-4">
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Shipment details
              </h2>
              <p className={`mt-0.5 text-xs ${t.textMuted}`}>
                {order?.trackingNumber
                  ? `Tracking ID: ${order.trackingNumber}`
                  : 'Tracking ID will be available once shipped'}
              </p>
            </div>
            <div className={`border-t ${t.hairline}`} />

            {/* Product row */}
            <div className="flex items-start gap-4 p-5">
              <div
                className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border ${t.cardBorder} bg-stone-100 dark:bg-stone-800`}
              >
                {firstItem?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firstItem.image}
                    alt={firstItem.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className={`h-8 w-8 ${t.textMuted}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onViewItem(order)}
                  disabled={!firstItem?.productId}
                  className={`block text-left text-sm font-medium leading-snug ${t.accentText} hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline`}
                >
                  {firstItem?.name ?? 'Order item'}
                </button>
                <div className={`mt-1.5 flex flex-wrap items-center gap-3 text-xs ${t.textMuted}`}>
                  <span>
                    Qty: {firstItem?.quantity ?? 1}
                  </span>
                  <span className={t.textMuted}>|</span>
                  <span
                    className={`text-sm font-bold ${
                      t.isDark ? 'text-amber-300' : 'text-amber-700'
                    }`}
                  >
                    {fmt(firstItem?.price ?? 0)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onBuyAgain(order)}
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    t.isDark
                      ? 'border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
                      : 'border-amber-700/60 text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Buy it again
                </button>
              </div>
            </div>

            {/* Tracking link footer */}
            {order?.trackingUrl && (
              <>
                <div className={`border-t ${t.hairline}`} />
                <div className="px-5 py-3">
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${t.accentText} hover:underline`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Track on {carrierName || 'courier'} site
                  </a>
                </div>
              </>
            )}
          </div>

          {/* ── Card 2: Delivery status + Delivery to ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {/* Delivery status */}
              <div className="p-5">
                <p className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>
                  Delivery status
                </p>
                <p className={`mt-1.5 text-sm font-bold ${t.textPrimary}`}>
                  {effectiveStatus === 'return'
                    ? 'Return requested'
                    : order?.status
                    ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                    : '—'}
                </p>
                <p className={`mt-1 text-xs leading-relaxed ${t.textSecondary}`}>
                  {statusSubtitle}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarTimelineRef.current) {
                      sidebarTimelineRef.current.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }
                  }}
                  className={`mt-2.5 inline-flex items-center gap-1 text-xs font-semibold ${t.accentText} hover:underline`}
                >
                  See all updates
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              {/* Vertical divider on sm+ */}
              <div className={`hidden sm:block border-l ${t.hairline}`} />
              {/* Delivery to */}
              <div className={`p-5 ${t.isDark ? 'bg-stone-900/30' : 'bg-amber-50/30'} sm:bg-transparent`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>
                  Delivery to
                </p>
                <p className={`mt-1.5 text-sm font-bold ${t.textPrimary}`}>
                  {userName || 'Customer'}
                </p>
                <p className={`mt-1 text-xs leading-relaxed ${t.textSecondary}`}>
                  The full delivery address was confirmed at checkout and is
                  included in your order confirmation email.
                </p>
              </div>
            </div>
          </div>

          {/* ── Card 3: Service features (4-icon grid) ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Truck,
                  title: 'Shipped by courier',
                  desc: 'Handled by our trusted delivery partner.',
                },
                {
                  icon: Shield,
                  title: 'Secure delivery',
                  desc: 'Every shipment is insured end-to-end.',
                },
                {
                  icon: Bell,
                  title: 'Real-time updates',
                  desc: 'Tracking updates appear here as the package moves.',
                },
                {
                  icon: RotateCcw,
                  title: 'Easy returns',
                  desc: 'Return or replace items within the return window.',
                },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex flex-col items-start gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${t.accentBgSoft}`}
                    >
                      <Icon className={`h-5 w-5 ${t.accentText}`} />
                    </div>
                    <p className={`text-xs font-bold ${t.textPrimary}`}>{f.title}</p>
                    <p className={`text-[11px] leading-relaxed ${t.textMuted}`}>{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Card 4: Products in this order ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Products in this order
              </h2>
              <button
                type="button"
                onClick={onBack}
                className={`inline-flex items-center gap-1 text-xs font-semibold ${t.accentText} hover:underline`}
              >
                View order details
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className={`border-t ${t.hairline}`} />
            <ul
              className={`divide-y ${t.isDark ? 'divide-amber-500/10' : 'divide-amber-200/60'}`}
            >
              {allItems.length === 0 ? (
                <li className="flex items-center justify-center py-8 text-sm text-stone-400">
                  <Package className={`mr-2 h-4 w-4 ${t.textMuted}`} />
                  No items in this order.
                </li>
              ) : (
                allItems.map((item: any) => (
                  <li key={item.id} className="flex items-start gap-4 p-5">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border ${t.cardBorder} bg-stone-100 dark:bg-stone-800`}
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
                      <button
                        type="button"
                        onClick={() => onViewItem({ ...order, items: [item] })}
                        disabled={!item.productId}
                        className={`block text-left text-sm font-medium leading-snug ${t.accentText} hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline`}
                      >
                        {item.name}
                      </button>
                      <div className={`mt-1 flex flex-wrap items-center gap-3 text-xs ${t.textMuted}`}>
                        <span>Qty: {item.quantity}</span>
                        <span
                          className={`text-sm font-bold ${
                            t.isDark ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          {fmt(item.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onViewItem({ ...order, items: [item] })}
                        disabled={!item.productId}
                        className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          t.isDark
                            ? 'border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
                            : 'border-amber-700/60 text-amber-800 hover:bg-amber-50'
                        }`}
                      >
                        <Eye className="h-3 w-3" />
                        View this item
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN — sidebar ════════════ */}
        <div className="space-y-5">
          {/* ── Sidebar Card 1: Shipment details (vertical event timeline) ── */}
          <div
            ref={sidebarTimelineRef}
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor} lg:sticky lg:top-6`}
          >
            <div className="px-5 py-4">
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Shipment details
              </h2>
              <p className={`mt-0.5 text-xs ${t.textMuted}`}>
                {latestEvent?.timestamp
                  ? `Latest update: ${fmtDateTime(latestEvent.timestamp)}`
                  : 'Latest updates will appear here'}
              </p>
            </div>
            <div className={`border-t ${t.hairline}`} />

            {/* Vertical event timeline */}
            <div className="px-5 py-4">
              {eventsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className={`h-4 w-4 animate-spin ${t.accentText}`} />
                  <span className={`ml-2 text-xs ${t.textMuted}`}>
                    Loading tracking events…
                  </span>
                </div>
              ) : events.length === 0 ? (
                <div className="py-4 text-center">
                  <p className={`text-xs ${t.textMuted}`}>
                    {eventsError
                      ? 'Live tracking events are temporarily unavailable.'
                      : 'No tracking events recorded yet.'}
                  </p>
                  <p className={`mt-1 text-[11px] ${t.textMuted}`}>
                    The timeline above reflects the order&apos;s current status.
                  </p>
                </div>
              ) : (
                <ol className="space-y-0">
                  {events
                    .slice()
                    .reverse()
                    .map((ev, idx) => {
                      const isLatest = idx === 0;
                      return (
                        <li key={ev.id ?? idx} className="flex gap-3">
                          {/* Time column */}
                          <div className="w-20 shrink-0 pt-0.5">
                            <p className={`text-[11px] font-medium ${t.textMuted}`}>
                              {ev.timestamp ? fmtTime(ev.timestamp) : '—'}
                            </p>
                          </div>
                          {/* Dot + connector */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                isLatest
                                  ? 'bg-emerald-500 ring-2 ring-emerald-500/30'
                                  : t.isDark
                                  ? 'bg-stone-600'
                                  : 'bg-stone-300'
                              }`}
                            />
                            {idx < events.length - 1 && (
                              <div
                                className={`mt-0.5 h-10 w-0.5 ${
                                  t.isDark ? 'bg-stone-700' : 'bg-stone-200'
                                }`}
                              />
                            )}
                          </div>
                          {/* Text column */}
                          <div className={`min-w-0 flex-1 ${idx < events.length - 1 ? 'pb-3' : 'pb-0'}`}>
                            <p
                              className={`text-xs font-semibold ${
                                isLatest ? t.textPrimary : t.textSecondary
                              }`}
                            >
                              {ev.description || ev.status}
                            </p>
                            {ev.location && (
                              <p className={`mt-0.5 text-[11px] ${t.textMuted}`}>
                                {ev.location}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ol>
              )}
            </div>

            {/* Tracking link */}
            {order?.trackingNumber && (
              <>
                <div className={`border-t ${t.hairline}`} />
                <div className="px-5 py-3">
                  <p className={`text-[11px] ${t.textMuted}`}>
                    Tracking #{' '}
                    <span className={`font-mono ${t.textPrimary}`}>{order.trackingNumber}</span>
                  </p>
                  {carrierName && (
                    <p className={`mt-0.5 text-[11px] ${t.textMuted}`}>Carrier: {carrierName}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Sidebar Card 2: Order Details ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            <div className="px-5 py-4">
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Order details
              </h2>
            </div>
            <div className={`border-t ${t.hairline}`} />
            <dl className="space-y-2.5 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className={t.textMuted}>Order placed</dt>
                <dd className={`${t.textPrimary} font-medium`}>
                  {fmtDate(order?.createdAt ?? '')}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={t.textMuted}>Order #</dt>
                <dd className={`font-mono text-xs ${t.textPrimary}`}>{orderNumber}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={t.textMuted}>Items</dt>
                <dd className={`${t.textPrimary} font-medium`}>{itemCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={t.textMuted}>Order total</dt>
                <dd
                  className={`text-sm font-bold ${
                    t.isDark ? 'text-amber-300' : 'text-amber-700'
                  }`}
                >
                  {fmt(order?.total)}
                </dd>
              </div>
              {order?.estimatedDelivery && (
                <div className="flex items-center justify-between">
                  <dt className={t.textMuted}>Est. delivery</dt>
                  <dd className="font-medium text-emerald-500 dark:text-emerald-400">
                    {fmtDate(order.estimatedDelivery)}
                  </dd>
                </div>
              )}
            </dl>
            <div className={`border-t ${t.hairline}`} />
            <div className="px-5 py-3">
              <button
                type="button"
                onClick={onBack}
                className={`inline-flex w-full items-center justify-between text-xs font-semibold ${t.accentText} hover:underline`}
              >
                View order details
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── Sidebar Card 3: Need help? ── */}
          <div
            className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
          >
            <div className="px-5 py-4">
              <h2
                className={`text-base font-bold ${t.textPrimary}`}
                style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
              >
                Need help?
              </h2>
            </div>
            <div className={`border-t ${t.hairline}`} />
            <div className="px-5 py-3">
              <button
                type="button"
                onClick={onGoToHelp}
                className={`inline-flex w-full items-center justify-between text-xs font-semibold ${t.accentText} hover:underline`}
              >
                <span className="inline-flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  Visit our Help Center
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className={`border-t ${t.hairline}`} />
            <div className={`px-5 py-4 ${t.isDark ? 'bg-amber-500/5' : 'bg-amber-50/60'}`}>
              <div className="flex items-start gap-2.5">
                <Shield className={`mt-0.5 h-4 w-4 shrink-0 ${t.accentText}`} />
                <p className={`text-[11px] leading-relaxed ${t.textSecondary}`}>
                  Every shipment is insured. Only you can view this tracking page
                  for order{' '}
                  <span className={`font-mono ${t.textPrimary}`}>{orderNumber}</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
