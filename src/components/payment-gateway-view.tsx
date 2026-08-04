'use client'

/**
 * PaymentGatewayView
 * ──────────────────
 * Full-screen, chromeless payment gateway for 3 Boxes Luxury.
 *
 * DESIGN NOTE (Task 4c — payment flow simulation):
 *   Razorpay provides its own hosted "Secure Checkout" payment layer (card / UPI /
 *   net-banking / wallet form). We therefore DO NOT replicate that UI here. Instead,
 *   this view is a thin, on-brand shell that orchestrates the *lifecycle* of a payment
 *   attempt while the user is on / returns from the Razorpay layer.
 *
 *   Until the Razorpay test keys are wired up, this view runs an auto-advancing
 *   simulation so the full UX can be demoed end-to-end:
 *
 *     Stage 1  'processing'  — "Request Processing"      auto-advances after 10s
 *     Stage 2  'failed'      — "Payment Failed"          auto-advances after 10s
 *     Stage 3  'success'     — "Payment Successful"      user clicks "Continue"
 *
 *   When Razorpay keys are added later, the only change needed is to replace the
 *   `useEffect` timer block with real `Razorpay()` checkout + handler callbacks —
 *   the visual stages already match Razorpay's lifecycle (loading → failed → success).
 *
 * DESIGN NOTE (Task 4d — branding swap):
 *   The static logo image and "3 BOXES LUXURY" wordmark that used to sit above the
 *   payment card have been removed. In their place we play the same `/images/luxury-intro.mp4`
 *   loop that the auth pages (auth-dialog.tsx) use, so the brand motion is consistent
 *   across login / signup / payment. The "Payment" tagline is retained underneath.
 *
 * DESIGN NOTE (Task 4g — hardening):
 *   The previous version silently bounced the user home if `pendingOrderId` was null
 *   on mount (e.g., direct navigation, page refresh, slow store propagation). This
 *   made the page appear "broken" with no feedback. The new version:
 *     1. Waits a generous grace period (1s) for the store to propagate.
 *     2. If still no order after the grace period, shows a clear "No Payment Pending"
 *        card with recovery buttons (Return to Home / Browse Products) instead of
 *        silently redirecting.
 *     3. The auto-advance timers are now keyed off the *live* stage so they survive
 *        theme toggles and re-renders without being reset.
 *
 * DESIGN NOTE (Task 4h — order-failed integration):
 *   The "Payment Failed" stage now has a "View Failure Details" button (in addition
 *   to the existing auto-retry behavior). Clicking it stashes a `failureReason` +
 *   `hasFailedPayment=true` in the store and navigates to the new `order-failed`
 *   view, which mirrors the order-confirmation design but shows the failure reason
 *   and product details.
 *
 *   Retry behavior: when the user clicks "Try Again" on the order-failed page, they
 *   return here. The `hasFailedPayment` flag is now true, so the simulation SKIPS
 *   the failed stage on this second visit (processing → success → order-confirmation).
 *   This gives a clean demo flow:
 *     1st attempt:   processing → failed → (user clicks "View Failure Details") → order-failed
 *     2nd attempt:   processing → success → order-confirmation
 *   The `hasFailedPayment` flag is reset to false on entering the success stage so
 *   subsequent fresh checkouts start with the original 3-stage simulation.
 *
 * Theme: matches the home page — gold accent (#dbaf36), Lora headings, dark/light
 * adaptive, `luxury-accent-gradient-bg` for primary actions, subtle gold borders + glows.
 */

import { useEffect, useState, type CSSProperties } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Loader2, CheckCircle2, XCircle, Sparkles, ArrowLeft, AlertTriangle, Home, ShoppingBag, FileWarning,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Stage type ──
//   'processing' → 'failed' → 'success'   (auto-advancing)
type Stage = 'processing' | 'failed' | 'success'

// ── Timing (ms) ──
//   Per the user spec: 10s on Request Processing, then 10s on Payment Failed,
//   then land on Payment Successful (which stays until the user taps "Continue").
const PROCESSING_DURATION_MS = 10_000
const FAILED_DURATION_MS = 10_000

// ── Grace period before declaring "no pending order" ──
//   The checkout flow calls setPendingOrder() and setView('payment-gateway') in
//   quick succession. On the very first render of PaymentGatewayView, the store
//   update may not have propagated through Zustand's subscription yet (especially
//   under React 18 concurrent rendering or Strict Mode in dev). We wait this long
//   before deciding the user really did navigate here without going through checkout.
const ORDER_GRACE_MS = 1_000

export function PaymentGatewayView() {
  const appTheme = useStore((s) => s.appTheme)
  const setView = useStore((s) => s.setView)
  const pendingOrderId = useStore((s) => s.pendingOrderId)
  const pendingOrderTotal = useStore((s) => s.pendingOrderTotal)
  const setLastOrderId = useStore((s) => s.setLastOrderId)
  const clearPendingOrder = useStore((s) => s.clearPendingOrder)

  const isDark = appTheme === 'dark'
  const accent = 'var(--luxury-accent, #dbaf36)'
  const accentLight = 'var(--luxury-accent-light, #f5d063)'

  // Theme tokens — mirror auth-dialog / checkout-view palette
  const cardBg = isDark ? 'rgba(20, 16, 14, 0.7)' : 'rgba(255, 255, 255, 0.85)'
  const cardBorder = isDark ? 'rgba(212, 164, 55, 0.18)' : 'rgba(212, 164, 55, 0.22)'
  const inputBorder = isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(28, 25, 23, 0.12)'
  const textPrimary = isDark ? '#fffbeb' : '#1c1917'
  const textSecondary = isDark ? 'rgba(245, 230, 163, 0.75)' : 'rgba(28, 25, 23, 0.75)'
  const textMuted = isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)'

  // ── Stage state ──
  const [stage, setStage] = useState<Stage>('processing')

  // ── No-order detection ──
  // We track whether we've ever seen a pendingOrderId during this mount, and whether
  // the grace period has elapsed. The render layer uses these two flags to pick
  // between three states:
  //   (a) "preparing"  — no order yet, grace period still running  → loading spinner
  //   (b) "no-order"   — no order AND grace period elapsed          → recovery UI
  //   (c) "ready"      — order present                              → payment UI
  const [graceElapsed, setGraceElapsed] = useState(false)

  useEffect(() => {
    // If we have an order, no need to run the grace timer.
    if (pendingOrderId) {
      setGraceElapsed(false)
      return
    }
    // No order — start (or restart) the grace timer.
    setGraceElapsed(false)
    const t = setTimeout(() => setGraceElapsed(true), ORDER_GRACE_MS)
    return () => clearTimeout(t)
  }, [pendingOrderId])

  // ── Auto-advance: processing → failed → success ──
  // This is the simulation block described in the file header. When real Razorpay
  // keys are wired up, replace this single useEffect with the Razorpay checkout
  // handler callbacks — the visual stage state already mirrors Razorpay's lifecycle.
  //
  // RETRY SHORTCUT (Task 4h): if `hasFailedPayment` is true in the store (set by
  // the user clicking "View Failure Details" on a previous visit), the simulation
  // skips the failed stage entirely on this attempt — going straight from
  // processing → success. This makes retries succeed, which is the expected UX.
  useEffect(() => {
    if (stage === 'processing') {
      const t = setTimeout(() => {
        const isRetry = useStore.getState().hasFailedPayment
        if (isRetry) {
          // Retry path: skip failed stage, go straight to success.
          const liveOrderId = useStore.getState().pendingOrderId
          if (liveOrderId) {
            setLastOrderId(liveOrderId)
          }
          // Reset the flag so the next fresh checkout uses the full 3-stage flow.
          useStore.getState().setHasFailedPayment(false)
          setStage('success')
        } else {
          // First attempt: show the failed stage next.
          setStage('failed')
        }
      }, PROCESSING_DURATION_MS)
      return () => clearTimeout(t)
    }
    if (stage === 'failed') {
      const t = setTimeout(() => {
        // On entering 'success', commit the order to lastOrderId so the
        // order-confirmation view can display it.
        const liveOrderId = useStore.getState().pendingOrderId
        if (liveOrderId) {
          setLastOrderId(liveOrderId)
        }
        setStage('success')
      }, FAILED_DURATION_MS)
      return () => clearTimeout(t)
    }
    // 'success' — no auto-advance; user taps "Continue" via handleFinish()
    return undefined
  }, [stage, setLastOrderId])

  const amount = pendingOrderTotal ?? 0
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

  const handleFinish = () => {
    clearPendingOrder()
    setView('order-confirmation')
  }

  const handleCancel = () => {
    // Return to checkout — keep the pending order so user can retry
    setView('checkout')
  }

  // ── View Failure Details (Task 4h) ──
  // Called when the user clicks "View Failure Details" on the failed stage.
  // Stashes a failure reason + sets hasFailedPayment=true so the next visit to
  // payment-gateway (i.e., a retry from order-failed) skips the failed stage and
  // succeeds. Then navigates to the order-failed view.
  //
  // IMPORTANT: we do NOT clear pendingOrderId here — the order-failed page needs
  // it to display the order ID, and the retry flow needs it to charge the right
  // order. pendingOrderId is only cleared by handleFinish() on success.
  const handleViewFailureDetails = () => {
    const store = useStore.getState()
    store.setFailureReason(
      'Your payment was declined by the bank. This often happens due to insufficient funds, incorrect card details, or a bank security check. Please try again with a different payment method or contact your bank.'
    )
    store.setHasFailedPayment(true)
    // Commit the order to lastOrderId so the order-failed page can display it
    // even though we never reached the success stage.
    if (store.pendingOrderId) {
      setLastOrderId(store.pendingOrderId)
    }
    setView('order-failed')
  }

  // ── Render ──

  // Background gradient (shared by all sub-states)
  const bgStyle: CSSProperties = {
    background: isDark
      ? 'linear-gradient(135deg, rgba(12, 10, 9, 0.98) 0%, rgba(28, 25, 23, 0.98) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 240, 230, 0.98) 100%)',
  }

  // ── State (b): No-order recovery UI ──
  // If we still don't have a pendingOrderId after the grace period, show a clear
  // "no payment pending" card instead of silently redirecting. This handles:
  //   - Direct navigation to /payment-gateway via URL
  //   - Page refresh (which resets the in-memory store)
  //   - Any race condition where checkout didn't set the pending order in time
  if (!pendingOrderId && graceElapsed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-10"
        style={bgStyle}
      >
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-6 sm:p-8 text-center"
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
              boxShadow: isDark
                ? '0 0 60px rgba(219, 175, 54, 0.08), 0 25px 50px rgba(0, 0, 0, 0.3)'
                : '0 0 20px rgba(219, 175, 54, 0.04), 0 25px 50px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background: isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.1)',
                border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.25)' : 'rgba(212, 164, 55, 0.2)'}`,
              }}
            >
              <AlertTriangle className="h-7 w-7" style={{ color: accent }} />
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: textPrimary, fontFamily: "'Urbanist', sans-serif" }}
            >
              No Payment Pending
            </h2>
            <p
              className="mt-2 text-sm"
              style={{ color: textSecondary, fontFamily: "'Urbanist', sans-serif" }}
            >
              We couldn&apos;t find an active checkout. This usually happens if you
              refreshed the page or navigated here directly. Please return to your
              cart and try again.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                onClick={() => setView('cart')}
                className="h-12 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 transition-all duration-200"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Go to Cart
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setView('home')}
                className="h-12 border-2 transition-all duration-200"
                style={{
                  borderColor: isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(184, 134, 11, 0.35)',
                  color: textPrimary,
                }}
              >
                <Home className="mr-2 h-4 w-4" style={{ color: accent }} />
                Back to Home
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // ── State (a): Preparing — grace period still running, no order yet ──
  if (!pendingOrderId && !graceElapsed) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
        style={bgStyle}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
        <p
          className="mt-4 text-sm uppercase tracking-[0.2em]"
          style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}
        >
          Preparing your payment…
        </p>
      </div>
    )
  }

  // ── State (c): Ready — render the full payment UI ──
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={bgStyle}
    >
      <div className="w-full max-w-2xl">
        {/* ── Brand video (top) — same luxury-intro.mp4 used on the auth pages ── */}
        <div className="mb-6 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-0"
          >
            <video
              src="/images/luxury-intro.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-60 w-85 object-contain mx-auto mb-0 rounded-xl"
            />
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="luxury-accent-bg h-px w-10 opacity-60" />
              <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
              <span className="luxury-accent-bg h-px w-10 opacity-60" />
            </div>
          </motion.div>
          <p className="mt-3 text-xs uppercase tracking-[0.3em]" style={{ color: accent }}>
            Payment
          </p>
        </div>

        {/* ── Main payment card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '1.25rem',
            backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
            boxShadow: isDark
              ? '0 0 60px rgba(219, 175, 54, 0.08), 0 25px 50px rgba(0, 0, 0, 0.3)'
              : '0 0 20px rgba(219, 175, 54, 0.04), 0 25px 50px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div className="p-6 sm:p-8">
            {/* ── Header row: back / status ── */}
            <div className="mb-6 flex items-center justify-between">
              {stage === 'success' ? (
                <span
                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider"
                  style={{ color: textMuted }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: accent }} />
                  Transaction complete
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors hover:opacity-80"
                  style={{ color: textMuted }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Cancel payment
                </button>
              )}
              <div className="inline-flex items-center gap-1.5 text-xs" style={{ color: textMuted }}>
                {stage === 'processing' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Initiating request
                  </>
                )}
                {stage === 'failed' && (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Retrying
                  </>
                )}
                {stage === 'success' && (
                  <>
                    <Sparkles className="h-3 w-3" style={{ color: accent }} />
                    Verified
                  </>
                )}
              </div>
            </div>

            {/* ── Amount + order id summary bar ── */}
            <div
              className="mb-6 flex items-center justify-between rounded-xl px-5 py-4"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(212, 164, 55, 0.08) 0%, rgba(184, 134, 11, 0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(212, 164, 55, 0.12) 0%, rgba(184, 134, 11, 0.06) 100%)',
                border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.2)' : 'rgba(212, 164, 55, 0.25)'}`,
              }}
            >
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}
                >
                  Amount Payable
                </p>
                <p
                  className="mt-0.5 text-2xl font-bold"
                  style={{ color: accent, fontFamily: "'Urbanist', sans-serif" }}
                >
                  {formattedAmount}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: textMuted }}
                >
                  Order ID
                </p>
                <p className="mt-0.5 font-mono text-xs" style={{ color: textSecondary }}>
                  #{pendingOrderId?.slice(-8).toUpperCase() ?? '--------'}
                </p>
              </div>
            </div>

            {/* ── Stage content ── */}
            <AnimatePresence mode="wait">
              {/* ── Stage 1: Request Processing ── */}
              {stage === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-10 text-center"
                >
                  {/* Luxury animated gold ring */}
                  <div className="relative flex h-28 w-28 items-center justify-center">
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: `2px solid ${isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.2)'}`,
                        borderTopColor: accent,
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute inset-2 rounded-full"
                      style={{
                        border: `1px solid ${isDark ? 'rgba(245, 230, 163, 0.1)' : 'rgba(184, 134, 11, 0.15)'}`,
                        borderBottomColor: accentLight,
                      }}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                    />
                    <Sparkles className="h-8 w-8" style={{ color: accent }} />
                  </div>
                  <h2
                    className="mt-6 text-xl font-bold"
                    style={{ color: accent, fontFamily: "'Urbanist', sans-serif" }}
                  >
                    Request Processing
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: textSecondary }}>
                    We are initiating your payment request. Please do not close this window or press back.
                  </p>
                  <p className="mt-1 text-xs" style={{ color: textMuted }}>
                    Connecting to the payment gateway…
                  </p>
                </motion.div>
              )}

              {/* ── Stage 2: Payment Failed ── */}
              {stage === 'failed' && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center py-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="relative flex h-24 w-24 items-center justify-center"
                  >
                    {/* Red pulse halo */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.12)' }}
                      animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div
                      className="relative flex h-20 w-20 items-center justify-center rounded-full"
                      style={{
                        background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                        border: `2px solid ${isDark ? '#f87171' : '#dc2626'}`,
                      }}
                    >
                      <XCircle className="h-10 w-10" style={{ color: isDark ? '#f87171' : '#dc2626' }} />
                    </div>
                  </motion.div>

                  <h2
                    className="mt-6 text-2xl font-bold"
                    style={{ color: isDark ? '#fca5a5' : '#dc2626', fontFamily: "'Urbanist', sans-serif" }}
                  >
                    Payment Failed
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: textSecondary }}>
                    Your transaction could not be completed. Retrying your payment automatically…
                  </p>
                  <p className="mt-1 text-xs" style={{ color: textMuted }}>
                    Please wait while we attempt the payment again.
                  </p>

                  {/* Mini retry indicator */}
                  <div className="mt-5 inline-flex items-center gap-2 text-xs" style={{ color: textMuted }}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: accent }} />
                    Retrying in a moment
                  </div>

                  {/* ── View Failure Details button (Task 4h) ── */}
                  {/* Lets the user bail out of the auto-retry and go to the
                      order-failed page with the failure reason + product details.
                      The auto-advance timer is still running — if the user doesn't
                      tap this within the FAILED_DURATION_MS window, the simulation
                      will proceed to the success stage as before. */}
                  <Button
                    type="button"
                    onClick={handleViewFailureDetails}
                    variant="outline"
                    className="mt-4 h-10 border-2 transition-all duration-200"
                    style={{
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(220, 38, 38, 0.35)',
                      color: isDark ? '#fca5a5' : '#dc2626',
                    }}
                  >
                    <FileWarning className="mr-2 h-3.5 w-3.5" />
                    View Failure Details
                  </Button>
                </motion.div>
              )}

              {/* ── Stage 3: Payment Successful ── */}
              {stage === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="relative flex h-24 w-24 items-center justify-center"
                  >
                    {/* Gold glow halo */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: isDark ? 'rgba(212, 164, 55, 0.18)' : 'rgba(212, 164, 55, 0.15)' }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div
                      className="relative flex h-20 w-20 items-center justify-center rounded-full"
                      style={{
                        background: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.12)',
                        border: `2px solid ${accent}`,
                      }}
                    >
                      <CheckCircle2 className="h-10 w-10" style={{ color: accent }} />
                    </div>
                  </motion.div>

                  <h2
                    className="mt-6 text-2xl font-bold"
                    style={{ color: accent, fontFamily: "'Urbanist', sans-serif" }}
                  >
                    Payment Successful
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: textSecondary }}>
                    Thank you for your purchase. Your order is now being processed.
                  </p>

                  {/* Receipt-style box */}
                  <div
                    className="mt-6 w-full max-w-sm rounded-xl px-5 py-4 text-left"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${inputBorder}`,
                    }}
                  >
                    <ReceiptRow
                      label="Order Number"
                      value={pendingOrderId ? `#${pendingOrderId.slice(-8).toUpperCase()}` : '—'}
                      mono
                      accent={accent}
                      isDark={isDark}
                    />
                    <ReceiptRow
                      label="Amount Paid"
                      value={formattedAmount}
                      accent={accent}
                      isDark={isDark}
                    />
                    <ReceiptRow
                      label="Status"
                      value="Paid"
                      accent={accent}
                      isDark={isDark}
                      last
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleFinish}
                    className="mt-6 w-full max-w-sm h-12 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 transition-all duration-200"
                  >
                    Continue to Order Confirmation
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Below-card helper text ── */}
        {stage !== 'success' && (
          <p className="mt-5 text-center text-xs" style={{ color: textMuted }}>
            By proceeding, you agree to 3 Boxes Luxury&apos;s Terms of Service and acknowledge our Privacy Policy.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Small presentational helper ──

function ReceiptRow({
  label, value, mono, accent, isDark, last,
}: {
  label: string
  value: string
  mono?: boolean
  accent?: string
  isDark: boolean
  last?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{
        borderBottom: last
          ? 'none'
          : `1px solid ${isDark ? 'rgba(212, 164, 55, 0.08)' : 'rgba(28, 25, 23, 0.06)'}`,
      }}
    >
      <span className="text-xs" style={{ color: isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)' }}>
        {label}
      </span>
      <span
        className={`text-xs font-semibold ${mono ? 'font-mono' : ''}`}
        style={{ color: accent ?? (isDark ? '#fffbeb' : '#1c1917') }}
      >
        {value}
      </span>
    </div>
  )
}
