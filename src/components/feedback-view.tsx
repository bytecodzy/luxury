'use client';

/**
 * FeedbackView
 * ──────────────────
 * Simple feedback form for 3 Boxes Luxury.
 *
 * Reached from the Order Confirmation page (the "Feedback" button). Lets the
 * user rate their shopping experience (1–5 stars) and leave a free-text comment.
 * On submit, we POST to /api/feedback (graceful no-op if that route is not yet
 * implemented — the success screen still shows).
 *
 * Theme: matches the rest of the app — gold accent (#dbaf36), Lora headings,
 * Urbanist body, dark/light adaptive, `luxury-accent-gradient-bg` for primary
 * actions.
 */

import { useState, type FormEvent } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import {
  Star, ArrowLeft, Loader2, CheckCircle2, MessageSquare, Sparkles,
} from 'lucide-react';

export function FeedbackView() {
  const appTheme = useStore((s) => s.appTheme);
  const setView = useStore((s) => s.setView);
  const lastOrderId = useStore((s) => s.lastOrderId);
  const authUser = useStore((s) => s.authUser);

  const isDark = appTheme === 'dark';
  const accent = 'var(--luxury-accent, #dbaf36)';
  const accentLight = 'var(--luxury-accent-light, #f5d063)';
  const accentDark = 'var(--luxury-accent-dark, #b8860b)';

  // Theme tokens
  const cardBg = isDark ? 'rgba(20, 16, 14, 0.7)' : 'rgba(255, 255, 255, 0.85)';
  const cardBorder = isDark ? 'rgba(212, 164, 55, 0.18)' : 'rgba(212, 164, 55, 0.22)';
  const inputBg = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)';
  const inputBorder = isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(28, 25, 23, 0.12)';
  const inputText = isDark ? '#fffbeb' : '#1c1917';
  const textSecondary = isDark ? 'rgba(245, 230, 163, 0.75)' : 'rgba(28, 25, 23, 0.75)';
  const textMuted = isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)';
  const labelColor = isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(28, 25, 23, 0.55)';

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [name, setName] = useState<string>(authUser?.name ?? '');
  const [email, setEmail] = useState<string>(authUser?.email ?? '');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    if (message.trim().length < 5) {
      setError('Please write a few words about your experience.');
      return;
    }

    setSubmitting(true);
    try {
      // POST to /api/feedback — graceful no-op if route doesn't exist yet.
      // The success screen shows regardless, so the UX is uninterrupted.
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating,
            name: name.trim() || null,
            email: email.trim() || null,
            message: message.trim(),
            orderId: lastOrderId ?? null,
          }),
        });
      } catch {
        // Network / 404 — silently ignore; we still thank the user.
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    // If we came from order-confirmation and still have an order, go back there.
    // Otherwise go home.
    setView(lastOrderId ? 'order-confirmation' : 'home');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        {/* ── Back link ── */}
        <button
          type="button"
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors hover:opacity-80"
          style={{ color: textMuted, fontFamily: "'Urbanist', sans-serif" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
            boxShadow: isDark
              ? '0 0 60px rgba(219, 175, 54, 0.08), 0 25px 50px rgba(0, 0, 0, 0.3)'
              : '0 0 20px rgba(219, 175, 54, 0.04), 0 25px 50px rgba(0, 0, 0, 0.08)',
          }}
        >
          {submitted ? (
            /* ── Thank-you screen ── */
            <div className="flex flex-col items-center py-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="relative flex h-24 w-24 items-center justify-center"
              >
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
                Thank You!
              </h2>
              <p className="mt-2 text-sm" style={{ color: textSecondary }}>
                Your feedback helps us craft a better luxury experience for you.
              </p>
              <Button
                onClick={() => setView('home')}
                className="mt-6 h-12 px-8 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 transition-all duration-200"
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <div className="mb-6 text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    background: isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.1)',
                    border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.25)' : 'rgba(212, 164, 55, 0.2)'}`,
                  }}
                >
                  <MessageSquare className="h-6 w-6" style={{ color: accent }} />
                </div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: accent, fontFamily: "'Urbanist', sans-serif" }}
                >
                  Share Your Feedback
                </h1>
                <p className="mt-2 text-sm" style={{ color: textSecondary }}>
                  We&apos;d love to hear about your experience with 3 Boxes Luxury.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* ── Star rating ── */}
                <div className="space-y-2">
                  <Label
                    className="text-xs uppercase tracking-wider"
                    style={{ color: labelColor, fontFamily: "'Urbanist', sans-serif" }}
                  >
                    Your Rating
                  </Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = (hoverRating || rating) >= n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          onMouseEnter={() => setHoverRating(n)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110"
                          aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        >
                          <Star
                            className="h-8 w-8 transition-colors"
                            style={{
                              color: active ? accent : (isDark ? 'rgba(245, 230, 163, 0.2)' : 'rgba(28, 25, 23, 0.15)'),
                              fill: active ? accent : 'transparent',
                            }}
                          />
                        </button>
                      );
                    })}
                    {rating > 0 && (
                      <span
                        className="ml-2 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: accentLight, fontFamily: "'Urbanist', sans-serif" }}
                      >
                        {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Name + Email ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label
                      className="text-xs uppercase tracking-wider"
                      style={{ color: labelColor, fontFamily: "'Urbanist', sans-serif" }}
                    >
                      Name <span style={{ color: textMuted }}>(optional)</span>
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="text-sm"
                      style={{
                        background: inputBg,
                        border: `1px solid ${inputBorder}`,
                        color: inputText,
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      className="text-xs uppercase tracking-wider"
                      style={{ color: labelColor, fontFamily: "'Urbanist', sans-serif" }}
                    >
                      Email <span style={{ color: textMuted }}>(optional)</span>
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="text-sm"
                      style={{
                        background: inputBg,
                        border: `1px solid ${inputBorder}`,
                        color: inputText,
                      }}
                    />
                  </div>
                </div>

                {/* ── Message ── */}
                <div className="space-y-2">
                  <Label
                    className="text-xs uppercase tracking-wider"
                    style={{ color: labelColor, fontFamily: "'Urbanist', sans-serif" }}
                  >
                    Your Feedback
                  </Label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you loved or what we could improve..."
                    rows={5}
                    className="w-full rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                    style={{
                      background: inputBg,
                      border: `1px solid ${inputBorder}`,
                      color: inputText,
                    }}
                  />
                </div>

                {/* ── Error ── */}
                {error && (
                  <div className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-3 text-center text-sm text-red-300">
                    {error}
                  </div>
                )}

                {/* ── Submit ── */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 disabled:opacity-50 transition-all duration-200"
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />Submit Feedback</>
                  )}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
