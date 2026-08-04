'use client';

/**
 * OrderHistory (standalone)  —  Task 4n (Amazon-style card redesign)
 * ────────────────────────────────────────────────────────────────────────
 * This is the standalone order-lookup page rendered when a user navigates
 * to view 'orders' (e.g. from "View All Orders" on the dashboard home).
 *
 * LAYOUT (matches the reference screenshot the user uploaded):
 *   • Email search form at the top (preserved from previous version).
 *   • Each order renders as a self-contained Amazon-style card with:
 *       ┌─────────────────────────────────────────────────────────────┐
 *       │ Order Placed | Total | Ship To | Order # + View/Invoice    │
 *       ├─────────────────────────────────────────────────────────────┤
 *       │ [img]  Status headline                                     │
 *       │        Status subtitle                                      │
 *       │        Product name (link)                                  │
 *       │        Return window / tracking info                        │
 *       │                                                             │
 *       │        [ Cancel Order ]  [ Return Order ]                   │
 *       ├─────────────────────────────────────────────────────────────┤
 *       │ [Buy it again]  [View your item]            [status badge]  │
 *       └─────────────────────────────────────────────────────────────┘
 *
 * ACTION WIRING (per user spec — every button must work its function):
 *   • Cancel Order   → opens dialog → DELETE /api/orders/[id]
 *   • Return Order   → opens dialog → POST /api/support-tickets (category: 'return')
 *   • Invoice        → fetches /api/orders/[id]/invoice, generates PDF via jsPDF, downloads
 *   • Buy it again   → addItem() + setView('checkout')
 *   • View your item → selectProduct(item.id) → product detail page
 *   • View order details → expands an inline list of all items in the order
 *
 * THEME: matches the home page (dark luxury by default with gold #dbaf36 accent,
 * Lora serif headings, Urbanist body). The previous version was hardcoded to
 * dark-only — now reads `appTheme` from the store and adapts.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import {
  Search, ArrowLeft, Truck, ExternalLink, Gift, Tag, XCircle, Loader2,
  Clock, Package, ChevronDown, Download, RotateCcw, RefreshCw, Eye,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  productId?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  total: number;
  createdAt: string;
  itemCount: number;
  items: OrderItem[];
  deliveryType?: string;
  giftWrapping?: boolean;
  giftWrapStyle?: string;
  couponCode?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  firstName?: string;
  lastName?: string;
}

// ── Theme tokens (matches user-dashboard.tsx pattern) ──
interface Theme {
  isDark: boolean;
  cardBg: string;
  cardBgSoft: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentText: string;
  accentBg: string;
  accentBgSoft: string;
  hairline: string;
  shadowColor: string;
}

function useTheme(): Theme {
  const appTheme = useStore((s) => s.appTheme);
  const isDark = appTheme === 'dark';
  return {
    isDark,
    cardBg: isDark ? 'bg-stone-900/70' : 'bg-white',
    cardBgSoft: isDark ? 'bg-stone-800/40' : 'bg-amber-50/40',
    cardBorder: isDark ? 'border-amber-500/15' : 'border-amber-200',
    textPrimary: isDark ? 'text-amber-50' : 'text-stone-900',
    textSecondary: isDark ? 'text-amber-100/70' : 'text-stone-600',
    textMuted: isDark ? 'text-amber-100/40' : 'text-stone-500',
    accentText: isDark ? 'text-amber-300' : 'text-amber-700',
    accentBg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
    accentBgSoft: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
    hairline: isDark ? 'border-amber-500/15' : 'border-amber-200',
    shadowColor: isDark ? 'shadow-black/40' : 'shadow-amber-900/5',
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const statusColor = (s: string, isDark: boolean) => {
  const light = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    shipped: 'bg-purple-100 text-purple-700 border-purple-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  const dark = {
    pending: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    delivered: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
  };
  const map = isDark ? dark : light;
  return map[s] || (isDark ? dark.pending : light.pending);
};

export function OrderHistory() {
  const { setView, selectProduct, addItem, authUser, authToken } = useStore();
  const t = useTheme();
  const [email, setEmail] = useState(authUser?.email ?? '');
  const [searchEmail, setSearchEmail] = useState(authUser?.email ?? '');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnOrderNumber, setReturnOrderNumber] = useState<string>('');
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const authH = (tok: string | null): Record<string, string> =>
    tok ? { Authorization: `Bearer ${tok}` } : {};

  const { data, isLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['orders', searchEmail],
    queryFn: () =>
      fetch(`/api/orders?email=${encodeURIComponent(searchEmail)}`, { headers: authH(authToken) }).then((r) => r.json()),
    enabled: !!searchEmail,
  });

  const orders = data?.orders ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchEmail(email);
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/orders/${cancelOrderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authH(authToken) },
        body: JSON.stringify({ reason: cancelReason, email: searchEmail }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['orders', searchEmail] });
      }
    } catch {
      // ignore
    } finally {
      setCancelLoading(false);
      setCancelDialogOpen(false);
      setCancelReason('');
      setCancelOrderId(null);
    }
  };

  const handleReturnOrder = async () => {
    if (!returnOrderId) return;
    setReturnLoading(true);
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH(authToken) },
        body: JSON.stringify({
          subject: `Return request for order #${returnOrderNumber}`,
          priority: 'medium',
          category: 'return',
          message: `I would like to return order #${returnOrderNumber}.\n\nReason: ${returnReason || 'Not specified'}`,
          metadata: { orderId: returnOrderId, orderNumber: returnOrderNumber, type: 'return_request' },
        }),
      });
      if (res.ok) {
        setView('contact');
      }
    } catch {
      // ignore
    } finally {
      setReturnLoading(false);
      setReturnDialogOpen(false);
      setReturnReason('');
      setReturnOrderId(null);
      setReturnOrderNumber('');
    }
  };

  const handleDownloadInvoice = useCallback(async (order: Order) => {
    setInvoiceLoadingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/invoice`, { headers: authH(authToken) });
      const invoiceData = await res.json().catch(() => null);

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;

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
      doc.text('INVOICE', pageWidth - margin, 35, { align: 'right' });

      let y = 110;
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const displayOrderNumber =
        invoiceData?.order?.orderNumber || order.orderNumber || order.id.slice(-8).toUpperCase();
      doc.text(`Order ${displayOrderNumber}`, margin, y);

      y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Order Date: ${fmtDate(order.createdAt)}`, margin, y);
      if (order.estimatedDelivery) {
        doc.text(`Estimated Delivery: ${fmtDate(order.estimatedDelivery)}`, margin, y + 14);
        y += 14;
      }
      doc.text(`Status: ${order.status}`, margin, y + 14);
      if (invoiceData?.invoice?.invoiceNumber) {
        doc.text(`Invoice #: ${invoiceData.invoice.invoiceNumber}`, margin, y + 28);
        y += 14;
      }
      y += 30;

      doc.setDrawColor(212, 164, 55);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text('Item', margin, y);
      doc.text('Qty', pageWidth - 200, y, { align: 'right' });
      doc.text('Price', pageWidth - 130, y, { align: 'right' });
      doc.text('Total', pageWidth - margin, y, { align: 'right' });
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      for (const item of order.items) {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        const name = (item.name || '').length > 60 ? (item.name || '').slice(0, 57) + '...' : (item.name || '');
        doc.text(name, margin, y);
        doc.text(String(item.quantity || 1), pageWidth - 200, y, { align: 'right' });
        doc.text(fmt(item.price || 0), pageWidth - 130, y, { align: 'right' });
        doc.text(fmt(itemTotal), pageWidth - margin, y, { align: 'right' });
        y += 16;
        if (y > 720) {
          doc.addPage();
          y = 60;
        }
      }

      y += 10;
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;
      const drawTotal = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(bold ? 40 : 100, bold ? 40 : 100, bold ? 40 : 100);
        doc.text(label, pageWidth - 200, y);
        doc.text(value, pageWidth - margin, y, { align: 'right' });
        y += 16;
      };
      drawTotal('Subtotal', fmt(order.subtotal));
      drawTotal('Shipping', fmt(order.shipping));
      drawTotal('Tax', fmt(order.tax));
      if (order.discount && order.discount > 0) {
        drawTotal('Discount', `- ${fmt(order.discount)}`);
      }
      y += 4;
      doc.setDrawColor(212, 164, 55);
      doc.setLineWidth(1);
      doc.line(pageWidth - 200, y, pageWidth - margin, y);
      y += 16;
      drawTotal('Total', fmt(order.total), true);

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'Thank you for your purchase. This invoice was generated electronically and is valid without signature.',
        margin,
        pageHeight - 30
      );

      doc.save(`Invoice-${displayOrderNumber}.pdf`);
    } catch (err) {
      console.error('Invoice generation failed:', err);
      alert('Sorry, we could not generate the invoice. Please try again.');
    } finally {
      setInvoiceLoadingId(null);
    }
  }, [authToken]);

  const handleBuyAgain = (order: Order) => {
    const firstItem = order.items?.[0];
    if (!firstItem) return;
    addItem({
      productId: firstItem.productId || firstItem.id,
      name: firstItem.name,
      price: firstItem.price,
      image: firstItem.image || '',
    });
    setView('checkout');
  };

  const handleViewItem = (order: Order) => {
    const firstItem = order.items?.[0];
    if (!firstItem) return;
    selectProduct(firstItem.productId || firstItem.id);
  };

  const openReturnDialog = (order: Order) => {
    setReturnOrderId(order.id);
    setReturnOrderNumber(order.orderNumber ?? order.id.slice(-8).toUpperCase());
    setReturnDialogOpen(true);
  };

  const getStatusHeadline = (status: string, estimatedDelivery?: string, deliveredAt?: string) => {
    if (status === 'delivered') {
      return deliveredAt ? `Delivered ${fmtDate(deliveredAt)}` : 'Delivered';
    }
    if (status === 'shipped' && estimatedDelivery) return `Arriving ${fmtDate(estimatedDelivery)}`;
    if (status === 'processing') return 'Processing your order';
    if (status === 'pending') return 'Order received';
    if (status === 'cancelled') return 'Cancelled';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusSubtitle = (status: string, estimatedDelivery?: string) => {
    if (status === 'delivered') return 'Package was delivered successfully';
    if (status === 'shipped') return estimatedDelivery ? `Expected delivery ${fmtDate(estimatedDelivery)}` : 'Package is on the way';
    if (status === 'processing') return 'We are preparing your order for shipment';
    if (status === 'pending') return 'Awaiting confirmation';
    if (status === 'cancelled') return 'Order has been cancelled';
    return '';
  };

  const shipToName = authUser?.name || (orders[0]?.firstName ? `${orders[0].firstName} ${orders[0].lastName ?? ''}`.trim() : 'Customer');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`py-8 ${t.textPrimary}`}
    >
      <Button
        variant="ghost"
        onClick={() => setView('home')}
        className={`mb-6 ${t.textSecondary} hover:bg-amber-500/10 hover:${t.accentText}`}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shop
      </Button>

      <h2 className={`text-2xl font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
        Order History
      </h2>
      <p className={`mt-1 text-sm ${t.textMuted}`}>
        Enter your email to look up your orders
      </p>

      {/* Email Search */}
      <form onSubmit={handleSearch} className="mt-6 flex gap-3">
        <div className="flex-1 max-w-md">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className={`${t.cardBorder} ${t.cardBg} ${t.textPrimary} placeholder:${t.textMuted}`}
          />
        </div>
        <Button
          type="submit"
          className="luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90"
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      )}

      {/* Empty state */}
      {searchEmail && !isLoading && orders.length === 0 && (
        <div className={`mt-8 text-center ${t.textSecondary}`}>
          <Package className={`mx-auto mb-3 h-10 w-10 ${t.textMuted}`} />
          <p>No orders found for {searchEmail}</p>
        </div>
      )}

      {/* Order cards */}
      {orders.length > 0 && (
        <div className="mt-8 space-y-4">
          {orders.map((order) => {
            const firstItem = order.items?.[0];
            const hasMultipleItems = (order.items?.length ?? 0) > 1;
            const isExpanded = expandedOrderId === order.id;
            const statusHeadline = getStatusHeadline(order.status, order.estimatedDelivery, order.deliveredAt);
            const statusSubtitle = getStatusSubtitle(order.status, order.estimatedDelivery);
            const cancellable = order.status === 'pending' || order.status === 'processing';
            const returnable = order.status === 'delivered';
            const invoiceLoading = invoiceLoadingId === order.id;

            return (
              <div
                key={order.id}
                className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
              >
                {/* ── Header row (4 columns) ── */}
                <div className={`grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4 sm:gap-6 ${t.isDark ? 'bg-stone-900/40' : 'bg-amber-50/40'}`}>
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${t.textMuted}`}>Order Placed</p>
                    <p className={`mt-1 text-sm font-medium ${t.textPrimary}`}>{fmtDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${t.textMuted}`}>Total</p>
                    <p className={`mt-1 text-sm font-medium ${t.textPrimary}`}>{fmt(order.total)}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${t.textMuted}`}>Ship To</p>
                    <p className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${t.accentText}`}>
                      {shipToName}
                      <ChevronDown className={`h-3 w-3 ${t.textMuted}`} />
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${t.textMuted}`}>Order #</p>
                    <p className={`mt-1 font-mono text-sm font-medium ${t.textPrimary}`}>
                      {order.orderNumber ?? order.id.slice(-8).toUpperCase()}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className={`text-xs font-medium ${t.accentText} hover:underline`}
                      >
                        View order details
                      </button>
                      <span className={t.textMuted}>|</span>
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(order)}
                        disabled={invoiceLoading}
                        className={`inline-flex items-center gap-1 text-xs font-medium ${t.accentText} hover:underline disabled:opacity-50`}
                      >
                        {invoiceLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Invoice
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`border-t ${t.hairline}`} />

                {/* ── Main content row ── */}
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
                  <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border ${t.cardBorder} bg-stone-100 dark:bg-stone-800`}>
                    {firstItem?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstItem.image} alt={firstItem.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className={`h-8 w-8 ${t.textMuted}`} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-base font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
                      {statusHeadline}
                    </p>
                    {statusSubtitle && (
                      <p className={`mt-0.5 text-sm ${t.textSecondary}`}>{statusSubtitle}</p>
                    )}

                    {/* Tracking info (if shipped) */}
                    {order.trackingNumber && (
                      <div className={`mt-2 flex flex-wrap items-center gap-3 text-xs ${t.textMuted}`}>
                        <span className="inline-flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {order.trackingUrl ? (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 ${t.accentText} hover:underline`}
                            >
                              {order.trackingNumber}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className={t.textPrimary}>{order.trackingNumber}</span>
                          )}
                        </span>
                      </div>
                    )}

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleViewItem(order)}
                        className={`block text-left text-sm leading-relaxed ${t.accentText} hover:underline`}
                      >
                        {firstItem?.name ?? 'Order item'}
                        {hasMultipleItems && (
                          <span className={`ml-1 ${t.textMuted}`}>&middot; +{(order.items?.length ?? 0) - 1} more item{(order.items?.length ?? 0) > 2 ? 's' : ''}</span>
                        )}
                      </button>
                      {returnable ? (
                        <p className={`mt-1.5 text-xs ${t.textMuted}`}>
                          Return window open until {fmtDate(order.estimatedDelivery || order.createdAt)}
                        </p>
                      ) : order.status === 'cancelled' ? (
                        <p className={`mt-1.5 text-xs ${t.textMuted}`}>Order was cancelled</p>
                      ) : (
                        <p className={`mt-1.5 text-xs ${t.textMuted}`}>
                          {order.trackingNumber ? `Tracking: ${order.trackingNumber}` : 'Tracking will be available once shipped'}
                        </p>
                      )}
                    </div>

                    {/* Expanded items list */}
                    {isExpanded && hasMultipleItems && (
                      <div className={`mt-4 rounded-lg border ${t.cardBorder} ${t.cardBgSoft} p-3`}>
                        <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>
                          All items in this order
                        </p>
                        <ul className="space-y-2">
                          {(order.items ?? []).map((item, idx) => (
                            <li key={item.id ?? idx} className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-100 dark:bg-stone-800">
                                {item.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Package className={`h-4 w-4 ${t.textMuted}`} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`truncate text-xs font-medium ${t.textPrimary}`}>{item.name}</p>
                                <p className={`text-[11px] ${t.textMuted}`}>Qty {item.quantity} &middot; {fmt(item.price)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => selectProduct(item.productId || item.id)}
                                className={`inline-flex items-center gap-1 text-[11px] font-medium ${t.accentText} hover:underline`}
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </button>
                            </li>
                          ))}
                        </ul>

                        {/* Order totals (shown when expanded) */}
                        <div className={`mt-3 space-y-1 border-t ${t.hairline} pt-3`}>
                          <div className="flex justify-between text-xs">
                            <span className={t.textMuted}>Subtotal</span>
                            <span className={t.textSecondary}>{fmt(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className={t.textMuted}>Shipping</span>
                            <span className={t.textSecondary}>{fmt(order.shipping)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className={t.textMuted}>Tax</span>
                            <span className={t.textSecondary}>{fmt(order.tax)}</span>
                          </div>
                          {order.discount && order.discount > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Tag className="h-3 w-3" />
                                Discount{order.couponCode ? ` (${order.couponCode})` : ''}
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400">- {fmt(order.discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-semibold pt-1">
                            <span className={t.textPrimary}>Total</span>
                            <span className={t.accentText}>{fmt(order.total)}</span>
                          </div>
                        </div>

                        {/* Gift wrap info */}
                        {order.giftWrapping && (
                          <div className={`mt-2 flex items-center gap-2 text-xs ${t.textMuted}`}>
                            <Gift className="h-3.5 w-3.5 text-pink-400/70" />
                            <span>
                              Gift Wrapped
                              {order.giftWrapStyle
                                ? ` — ${order.giftWrapStyle.charAt(0).toUpperCase() + order.giftWrapStyle.slice(1)}`
                                : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons column */}
                  <div className="flex shrink-0 flex-col gap-2 md:w-44">
                    <button
                      type="button"
                      onClick={() => { setCancelOrderId(order.id); setCancelDialogOpen(true) }}
                      disabled={!cancellable}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                        cancellable
                          ? `${t.cardBorder} ${t.textSecondary} hover:bg-amber-50 dark:hover:bg-amber-900/20`
                          : `${t.cardBorder} cursor-not-allowed ${t.textMuted} opacity-50`
                      }`}
                      title={cancellable ? 'Cancel this order' : 'Order cannot be cancelled at this stage'}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel Order
                    </button>

                    <button
                      type="button"
                      onClick={() => openReturnDialog(order)}
                      disabled={!returnable}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                        returnable
                          ? `${t.cardBorder} ${t.textSecondary} hover:bg-amber-50 dark:hover:bg-amber-900/20`
                          : `${t.cardBorder} cursor-not-allowed ${t.textMuted} opacity-50`
                      }`}
                      title={returnable ? 'Request a return for this order' : 'Returns are available only for delivered orders'}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Return Order
                    </button>
                  </div>
                </div>

                {/* Bottom action row */}
                <div className={`flex flex-wrap items-center gap-2 border-t ${t.hairline} px-5 py-3`}>
                  <button
                    type="button"
                    onClick={() => handleBuyAgain(order)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-stone-950 shadow-sm transition-all hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 hover:shadow-md"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Buy it again
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewItem(order)}
                    className={`inline-flex items-center gap-1.5 rounded-full border ${t.isDark ? 'border-amber-500/40 text-amber-200 hover:bg-amber-500/10' : 'border-amber-700/60 text-amber-800 hover:bg-amber-50'} px-4 py-2 text-xs font-semibold transition-all`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View your item
                  </button>
                  <Badge
                    variant="outline"
                    className={`ml-auto capitalize ${statusColor(order.status, t.isDark)}`}
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className={`${t.cardBorder} ${t.cardBg} sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle className={t.textPrimary}>Cancel Order</DialogTitle>
            <DialogDescription className={t.textMuted}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="oh-cancel-reason" className={`text-sm ${t.textSecondary}`}>Reason for cancellation</Label>
              <Input
                id="oh-cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tell us why you're cancelling"
                className={`mt-1 ${t.cardBorder} ${t.cardBg} ${t.textPrimary}`}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setCancelDialogOpen(false); setCancelReason(''); setCancelOrderId(null) }}
                className={`flex-1 ${t.cardBorder} ${t.textSecondary}`}
              >
                Keep Order
              </Button>
              <Button
                onClick={handleCancelOrder}
                disabled={cancelLoading}
                className="flex-1 bg-red-600 text-white hover:bg-red-500"
              >
                {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Order Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className={`${t.cardBorder} ${t.cardBg} sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle className={t.textPrimary}>Return Order</DialogTitle>
            <DialogDescription className={t.textMuted}>
              Tell us why you'd like to return order #{returnOrderNumber}. Our support team will follow up shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="oh-return-reason" className={`text-sm ${t.textSecondary}`}>Reason for return</Label>
              <textarea
                id="oh-return-reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Wrong size, damaged in transit, changed my mind..."
                rows={4}
                className={`mt-1 w-full rounded-md border ${t.isDark ? 'border-amber-500/20 bg-stone-900/50' : 'border-amber-200 bg-white'} px-3 py-2 text-sm ${t.textPrimary} focus:outline-none focus:ring-2 focus:ring-amber-500/30`}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setReturnDialogOpen(false); setReturnReason(''); setReturnOrderId(null); setReturnOrderNumber('') }}
                className={`flex-1 ${t.cardBorder} ${t.textSecondary}`}
              >
                Keep Order
              </Button>
              <Button
                onClick={handleReturnOrder}
                disabled={returnLoading}
                className="flex-1 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90"
              >
                {returnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Return Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
