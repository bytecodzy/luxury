'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

/**
 * ForgotPasswordView
 *
 * Standalone "page" (rendered via the SPA view-switcher in src/app/page.tsx)
 * for the password-reset flow. Shows a single email input + "Reset Password"
 * button. After submit, displays a status message below the button.
 *
 * Wired to POST /api/auth/forgot-password — the API always returns a generic
 * "If an account exists..." message (so it can't be used for user enumeration).
 */
export function ForgotPasswordView() {
  const appTheme = useStore((s) => s.appTheme)
  const setView = useStore((s) => s.setView)
  const setAuthView = useStore((s) => s.setAuthView)

  const isDark = appTheme === 'dark'
  const accentColor = 'var(--luxury-accent, #dbaf36)'

  // Theme tokens (mirrors the palette used in src/components/auth-dialog.tsx)
  const cardBg = isDark ? 'rgba(20, 16, 14, 0.6)' : 'rgba(255, 255, 255, 0.7)'
  const cardBorder = isDark ? 'rgba(212, 164, 55, 0.18)' : 'rgba(212, 164, 55, 0.22)'
  const inputBg = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)'
  const inputBorder = isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(28, 25, 23, 0.12)'
  const inputText = isDark ? '#fffbeb' : '#1c1917'
  const textSecondary = isDark ? 'rgba(245, 230, 163, 0.75)' : 'rgba(28, 25, 23, 0.75)'
  const textMuted = isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)'
  const labelColor = isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(28, 25, 23, 0.55)'

  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }
  const inputClass = 'pl-10 text-sm placeholder:opacity-100 focus:border-amber-600/60 focus:ring-amber-600/30'

  // Form state
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Return to login: switch view + reopen the auth modal in login mode
  const handleBackToLogin = useCallback(() => {
    setView('home')
    setAuthView('login')
  }, [setView, setAuthView])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Client-side validation
      const trimmed = email.trim()
      if (!trimmed) {
        setErrorMessage('Please enter your email address.')
        setSuccessMessage(null)
        return
      }
      // Minimal email sanity check (the API does full Zod validation server-side)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmed)) {
        setErrorMessage('Please enter a valid email address.')
        setSuccessMessage(null)
        return
      }

      setLoading(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          // Rate-limit (429) or validation error (400) — surface the API message
          throw new Error(data?.error || data?.message || `Request failed (${res.status})`)
        }

        // Success — the API always returns a generic anti-enumeration message
        setSuccessMessage(
          data?.message ||
            `If an account exists for "${trimmed}", a password reset link has been sent. Please check your inbox (and spam folder) shortly.`
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setErrorMessage(msg)
      } finally {
        setLoading(false)
      }
    },
    [email]
  )

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(12, 10, 9, 0.98) 0%, rgba(28, 25, 23, 0.98) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 240, 230, 0.98) 100%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '1.25rem',
          backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
          boxShadow: isDark
            ? '0 0 40px rgba(219, 175, 54, 0.06), 0 25px 50px rgba(0, 0, 0, 0.3)'
            : '0 0 20px rgba(219, 175, 54, 0.04), 0 25px 50px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="p-6 sm:p-8">
          {/* Back to login */}
          <button
            type="button"
            onClick={handleBackToLogin}
            className="mb-6 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors hover:opacity-80"
            style={{ color: textMuted }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </button>

          {/* 3 Boxes Luxury logo (big) */}
          <div className="mb-6 flex flex-col items-center">
            <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center">
              <Image
                src="/images/logo-uploaded.png"
                alt="3 Boxes Luxury Logo"
                width={128}
                height={128}
                priority
                className={`h-28 w-28 sm:h-32 sm:w-32 object-contain ${
                  isDark
                    ? 'contrast-150 brightness-130 saturate-130 mix-blend-lighten drop-shadow-[0_0_14px_rgba(255,215,0,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]'
                    : 'contrast-110 brightness-95 saturate-130'
                }`}
              />
            </div>
            <h1
              className="logo-shimmer-text mt-3 text-xl font-bold tracking-[0.25em]"
              style={{ fontFamily: 'Lora, serif' }}
            >
              3 BOXES LUXURY
            </h1>
          </div>

          {/* Heading */}
          <div className="mb-6 text-center">
            <h2
              className="text-2xl font-bold"
              style={{ color: accentColor, fontFamily: "'Urbanist', sans-serif" }}
            >
              Forgot Password
            </h2>
            <p className="mt-2 text-sm" style={{ color: textSecondary }}>
              Enter your registered email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  autoComplete="email"
                  disabled={loading}
                  required
                  aria-label="Email address"
                />
              </div>
            </div>

            {/* Reset Password button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          {/* Status message below the button */}
          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-5 flex items-start gap-3 rounded-md px-4 py-3 text-sm"
                style={{
                  background: isDark ? 'rgba(212, 164, 55, 0.08)' : 'rgba(212, 164, 55, 0.06)',
                  border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.25)' : 'rgba(212, 164, 55, 0.2)'}`,
                  color: textSecondary,
                }}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accentColor }} />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-5 flex items-start gap-3 rounded-md border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Helper text */}
          {!successMessage && !errorMessage && (
            <p className="mt-5 text-center text-xs" style={{ color: textMuted }}>
              We&apos;ll send a reset link to your email. The link expires in 1 hour.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
