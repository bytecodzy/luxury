'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import type { AuthUser } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { Mail, Lock, User, Shield, Loader2, Eye, EyeOff, Building2, ChevronRight, ArrowLeft, Phone, Globe, Hash, Briefcase, Sparkles, Crown, Gem, Gift, Heart, Star, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { showToast } from '@/hooks/use-toast-notification'
import Image from 'next/image'

type RoleType = 'corporate' | 'user' | 'team'

export function AuthDialog() {
  const authView = useStore((s) => s.authView)
  const authTwoFAStep = useStore((s) => s.authTwoFAStep)
  const authPendingUserId = useStore((s) => s.authPendingUserId)
  const authTwoFAMethod = useStore((s) => s.authTwoFAMethod)
  const authPendingEmail = useStore((s) => s.authPendingEmail)
  const setAuth = useStore((s) => s.setAuth)
  const setAuthView = useStore((s) => s.setAuthView)
  const setAuthTwoFAStep = useStore((s) => s.setAuthTwoFAStep)
  const setAuthPendingUserId = useStore((s) => s.setAuthPendingUserId)
  const setAuthTwoFAMethod = useStore((s) => s.setAuthTwoFAMethod)
  const setAuthPendingEmail = useStore((s) => s.setAuthPendingEmail)
  const setView = useStore((s) => s.setView)
  const appTheme = useStore((s) => s.appTheme)
  const isDark = appTheme === 'dark'

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginShowPassword, setLoginShowPassword] = useState(false)

  // Register form - common
  const [regEmail, setRegEmail] = useState('')
  const [regName, setRegName] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regShowPassword, setRegShowPassword] = useState(false)
  const [regEnable2FA, setRegEnable2FA] = useState(false)

  // Corporate registration fields
  const [regCompanyName, setRegCompanyName] = useState('')
  const [regContactName, setRegContactName] = useState('')
  const [regContactPhone, setRegContactPhone] = useState('')
  const [regIndustry, setRegIndustry] = useState('')
  const [regWebsite, setRegWebsite] = useState('')
  const [regGstNumber, setRegGstNumber] = useState('')

  // Team/Agent registration fields
  const [regEmployeeId, setRegEmployeeId] = useState('')
  const [regDepartment, setRegDepartment] = useState('')

  // 2FA
  const [twoFACode, setTwoFACode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [pendingOtpToken, setPendingOtpToken] = useState<string | null>(null)
  const [displayedOtp, setDisplayedOtp] = useState<string | null>(null)

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [selectedLoginRole, setSelectedLoginRole] = useState<RoleType | null>(null)

  const isOpen = authView === 'login' || authView === 'register'

  // Theme tokens
  const accentColor = 'var(--luxury-accent, #dbaf36)'
  const cardBg = isDark ? 'rgba(28, 25, 23, 0.95)' : 'rgba(255, 255, 255, 0.98)'
  const cardBorder = isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.2)'
  const inputBg = isDark ? 'rgba(12, 10, 9, 0.5)' : 'rgba(245, 240, 230, 0.6)'
  const inputBorder = isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.15)'
  const inputText = isDark ? 'rgba(245, 230, 163, 0.9)' : '#1c1917'
  const inputPlaceholder = isDark ? 'rgba(245, 230, 163, 0.2)' : 'rgba(28, 25, 23, 0.3)'
  const textPrimary = isDark ? 'rgba(245, 230, 163, 0.9)' : '#1c1917'
  const textSecondary = isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)'
  const textMuted = isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.35)'
  const labelColor = isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(28, 25, 23, 0.55)'

  // Get placeholder data based on role
  const getLoginPlaceholder = () => {
    switch (selectedLoginRole) {
      case 'corporate': return { email: 'corporate@3boxes.com', password: 'Enter your password' }
      case 'team': return { email: 'team@3boxes.com', password: 'Enter your password' }
      default: return { email: 'pmkshar@gmail.com', password: 'Enter your password' }
    }
  }

  const getRegPlaceholder = () => {
    switch (selectedLoginRole) {
      case 'corporate': return { email: 'rajesh@techcorp.in', name: 'Rajesh Kumar' }
      case 'team': return { email: 'agent@3boxes.in', name: 'Amit Singh' }
      default: return { email: 'priya.sharma@email.com', name: 'Priya Sharma' }
    }
  }

  const resetForm = useCallback(() => {
    setLoginEmail('')
    setLoginPassword('')
    setLoginShowPassword(false)
    setRegEmail('')
    setRegName('')
    setRegPassword('')
    setRegConfirmPassword('')
    setRegShowPassword(false)
    setRegEnable2FA(false)
    setRegCompanyName('')
    setRegContactName('')
    setRegContactPhone('')
    setRegIndustry('')
    setRegWebsite('')
    setRegGstNumber('')
    setRegEmployeeId('')
    setRegDepartment('')
    setTwoFACode('')
    setResendCooldown(0)
    setPendingOtpToken(null)
    setDisplayedOtp(null)
    setError(null)
    setSuccess(null)
    setLoading(false)
    setSelectedLoginRole(null)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setAuthView(null)
        resetForm()
      }
    },
    [setAuthView, resetForm]
  )

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value as 'login' | 'register')
      setError(null)
      setSuccess(null)
      setAuthView(value as 'login' | 'register')
    },
    [setAuthView]
  )

  const handleDialogMount = useCallback(() => {
    if (authView === 'login' || authView === 'register') {
      setActiveTab(authView)
    }
    resetForm()
  }, [authView, resetForm])

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSuccess(null)

      if (!loginEmail.trim() || !loginPassword.trim()) {
        setError('Please fill in all fields.')
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Login failed. Please try again.')
          return
        }

        if (data.requiresTwoFactor) {
          setAuthPendingUserId(data.userId)
          setAuthTwoFAMethod(data.method || 'email')
          setAuthPendingEmail(data.email || null)
          setAuthTwoFAStep(true)

          const isEmail2FA = data.method === 'email'
          if (isEmail2FA) {
            setSuccess(`A 6-digit verification code has been sent to ${data.email || 'your email'}. Please check your inbox.`)
            if (data._otpToken) {
              setPendingOtpToken(data._otpToken)
            }
            if (data._otp) {
              setDisplayedOtp(data._otp)
              setTwoFACode(data._otp)
              showToast('info', `Your verification code: ${data._otp}`)
            }
          } else {
            setSuccess('Please enter the verification code from your authenticator app.')
          }

          setResendCooldown(60)
          const cooldownInterval = setInterval(() => {
            setResendCooldown(prev => {
              if (prev <= 1) {
                clearInterval(cooldownInterval)
                return 0
              }
              return prev - 1
            })
          }, 1000)

          return
        }

        if (data.emailVerified === false) {
          setError('Please verify your email address before logging in.')
          return
        }

        if (data.user && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'USER',
          }
          setAuth(user, data.token)
          showToast('success', `Welcome back, ${user.name}! Successfully signed in.`)

          if (user.role === 'admin' || user.role === 'team') {
            setSuccess('Welcome back, Administrator. Full access granted.')
          }
        }
      } catch {
        setError('Network error. Please check your connection and try again.')
        showToast('error', 'Login failed. Please check your credentials.')
      } finally {
        setLoading(false)
      }
    },
    [loginEmail, loginPassword, selectedLoginRole, setAuth, setAuthPendingUserId, setAuthTwoFAStep, setAuthTwoFAMethod, setAuthPendingEmail]
  )

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSuccess(null)

      if (!regEmail.trim() || !regName.trim() || !regPassword.trim()) {
        setError('Please fill in all required fields.')
        return
      }

      if (regPassword.length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }

      if (regPassword !== regConfirmPassword) {
        setError('Passwords do not match.')
        return
      }

      if (selectedLoginRole === 'corporate') {
        if (!regCompanyName.trim() || !regContactName.trim()) {
          setError('Company name and contact name are required for corporate accounts.')
          return
        }
      }

      if (selectedLoginRole === 'team') {
        if (!regEmployeeId.trim()) {
          setError('Employee/Agent ID is required for team accounts.')
          return
        }
      }

      setLoading(true)
      try {
        let res: Response

        if (selectedLoginRole === 'corporate') {
          res = await fetch('/api/corporate/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: regEmail.trim(),
              name: regName.trim(),
              password: regPassword,
              companyName: regCompanyName.trim(),
              contactName: regContactName.trim(),
              contactPhone: regContactPhone.trim() || undefined,
              industry: regIndustry.trim() || undefined,
              website: regWebsite.trim() || undefined,
              gstNumber: regGstNumber.trim() || undefined,
            }),
          })
        } else if (selectedLoginRole === 'team') {
          res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: regEmail.trim(),
              name: regName.trim(),
              password: regPassword,
              role: 'team',
              employeeId: regEmployeeId.trim(),
              department: regDepartment.trim() || undefined,
              enable2FA: true,
            }),
          })
        } else {
          res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: regEmail.trim(),
              name: regName.trim(),
              password: regPassword,
              role: 'user',
              enable2FA: regEnable2FA,
            }),
          })
        }

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Registration failed. Please try again.')
          return
        }

        if (data.approvalStatus === 'pending') {
          if (selectedLoginRole === 'corporate' || selectedLoginRole === 'team') {
            showToast('info', 'Registration submitted. Awaiting admin approval.')
            setSuccess(
              selectedLoginRole === 'corporate'
                ? 'Your corporate registration is pending admin approval. You will be notified once your account is approved.'
                : 'Your team registration is pending admin approval. You will be notified once approved.'
            )
          } else {
            setSuccess('Your registration is pending approval. You will be notified once your account is approved.')
          }
          return
        }

        if (data.user && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'user',
          }
          setAuth(user, data.token)
          showToast('success', 'Account created successfully! Welcome to 3 Boxes Luxury.')
        } else if (data.user && !data.token) {
          showToast('info', 'Registration submitted. Awaiting admin approval.')
          setSuccess(
            'Account created successfully! Please check your email to verify your account.'
          )
        }
      } catch {
        setError('Network error. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    },
    [regEmail, regName, regPassword, regConfirmPassword, selectedLoginRole, regCompanyName, regContactName, regContactPhone, regIndustry, regWebsite, regGstNumber, regEmployeeId, regDepartment, regEnable2FA, setAuth]
  )

  const handle2FAVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (twoFACode.length !== 6) {
        setError('Please enter the complete 6-digit verification code.')
        return
      }

      if (!authPendingUserId) {
        setError('Session expired. Please try logging in again.')
        setAuthTwoFAStep(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authPendingUserId,
            code: twoFACode,
            method: authTwoFAMethod || 'email',
            otpToken: pendingOtpToken,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Verification failed. Please try again.')
          return
        }

        if (data.verified && data.user && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'USER',
          }
          setAuth(user, data.token)
          showToast('success', 'Verification successful! Welcome back.')

          if (user.role === 'admin' || user.role === 'team') {
            setSuccess('Welcome back, Administrator. Full access granted.')
          }
        } else if (data.verified && !data.token) {
          setError('Verification succeeded but no session was created. Please try logging in again.')
          setAuthTwoFAStep(false)
        } else {
          setError('Invalid verification code. Please try again.')
        }
      } catch {
        setError('Network error. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    },
    [twoFACode, authPendingUserId, authTwoFAMethod, pendingOtpToken, setAuth, setAuthTwoFAStep]
  )

  const handleSocialLogin = useCallback(
    async (provider: string) => {
      setError(null)
      setSuccess(null)
      setLoading(true)

      try {
        const res = await fetch('/api/auth/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            name: `${provider} User`,
            socialId: `social_${Date.now()}`,
            email: `user_${Date.now()}@${provider.toLowerCase()}.com`,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Social login failed. Please try again.')
          return
        }

        if (data.user && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'USER',
          }
          setAuth(user, data.token)
          showToast('success', `Welcome, ${user.name}! Successfully signed in.`)
        }
      } catch {
        setError('Social login failed. Please try again later.')
      } finally {
        setLoading(false)
      }
    },
    [setAuth]
  )

  const needsWideDialog = selectedLoginRole !== null && activeTab === 'register'

  const roleCardConfig: Record<RoleType, { login: { title: string; desc: string }; register: { title: string; desc: string } }> = {
    user: {
      login: { title: 'Customer / User', desc: 'Personal shopping account' },
      register: { title: 'Customer Account', desc: 'Create your personal shopping account' },
    },
    corporate: {
      login: { title: 'Corporate Account', desc: 'Business gifting & bulk orders' },
      register: { title: 'Corporate Account', desc: 'Register your business for gifting & bulk orders' },
    },
    team: {
      login: { title: '3 Boxes Team / Agent', desc: 'Internal team portal & support' },
      register: { title: 'Team / Agent Account', desc: 'Join the 3 Boxes team (requires approval)' },
    },
  }

  // ── Branding points for right panel ──
  const brandingPoints = [
    { icon: Crown, title: 'Curated Luxury', desc: 'Handpicked collections from the world\'s finest artisans and heritage brands' },
    { icon: Gem, title: 'Exquisite Craftsmanship', desc: 'Every piece tells a story of exceptional artistry and timeless elegance' },
    { icon: Gift, title: 'Personalized Gifting', desc: 'AI-powered gift recommendations that make every occasion unforgettable' },
   
    { icon: Heart, title: 'Exclusive Benefits', desc: 'Members-only access to limited editions, early drops, and VIP experiences' },
    { icon: Star, title: 'White-Glove Service', desc: 'Dedicated concierge support and complimentary gift wrapping on every order' },
  ]

  // ── Shared input style ──
  const inputStyle = {
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    color: inputText,
  }
  const inputClass = "pl-10 text-sm placeholder:opacity-100 focus:border-amber-600/60 focus:ring-amber-600/30"

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex overflow-y-auto"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(12, 10, 9, 0.98) 0%, rgba(28, 25, 23, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 240, 230, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200"
            style={{
              background: isDark ? 'rgba(212, 164, 55, 0.1)' : 'rgba(212, 164, 55, 0.08)',
              border: isDark ? '1px solid rgba(212, 164, 55, 0.2)' : '1px solid rgba(212, 164, 55, 0.15)',
              color: isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(28, 25, 23, 0.4)',
            }}
          >
            <X className="h-5 w-5" />
          </button>

          {/* ── LEFT: Auth Card ── */}
          <div className="flex items-start justify-center w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 min-h-screen">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-full max-w-md my-auto"
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
                {/* ── Mobile Logo (visible only on small screens) ── */}
                <div className="flex flex-col items-center mb-6 lg:hidden">
                  <video
  src="/images/luxury-intro.mp4"
  autoPlay
  loop
  muted
  playsInline
  className="h-60 w-85 object-contain mx-auto mb-0 rounded-xl"
/>
                  
                </div>

                <AnimatePresence mode="wait">
                  {authTwoFAStep ? (
                    /* ── 2FA Verification ── */
                    <motion.div
                      key="2fa"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="text-center mb-6">
                        <div
                          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4"
                          style={{
                            background: isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.08)',
                            border: isDark ? '1px solid rgba(212, 164, 55, 0.25)' : '1px solid rgba(212, 164, 55, 0.2)',
                          }}
                        >
                          {authTwoFAMethod === 'email' ? (
                            <Mail className="h-6 w-6" style={{ color: accentColor }} />
                          ) : (
                            <Shield className="h-6 w-6" style={{ color: accentColor }} />
                          )}
                        </div>
                        <h2
                          className="text-xl font-bold"
                          style={{ color: accentColor, fontFamily: "'Urbanist', sans-serif" }}
                        >
                          Two-Factor Authentication
                        </h2>
                        <p className="text-sm mt-1" style={{ color: textSecondary }}>
                          {authTwoFAMethod === 'email'
                            ? 'Enter the 6-digit code sent to your email'
                            : 'Enter the 6-digit code from your authenticator app'}
                        </p>
                      </div>

                      <form onSubmit={handle2FAVerify} className="space-y-5">
                        <div className="flex flex-col items-center gap-4">
                          {authTwoFAMethod === 'email' && (
                            <div className="text-center space-y-1">
                              <p className="text-sm" style={{ color: textSecondary }}>
                                A verification code has been sent to
                              </p>
                              <p className="text-sm font-semibold" style={{ color: accentColor }}>
                                {authPendingEmail || 'your email'}
                              </p>
                              <p className="text-xs" style={{ color: textMuted }}>Code expires in 5 minutes</p>
                            </div>
                          )}

                          {displayedOtp && (
                            <div
                              className="w-full rounded-lg p-4 text-center"
                              style={{
                                background: isDark ? 'rgba(212, 164, 55, 0.08)' : 'rgba(212, 164, 55, 0.06)',
                                border: `2px solid ${isDark ? 'rgba(212, 164, 55, 0.4)' : 'rgba(212, 164, 55, 0.3)'}`,
                              }}
                            >
                              <p className="text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>Your Verification Code</p>
                              <p className="text-3xl font-bold tracking-[0.4em] font-mono" style={{ color: accentColor }}>{displayedOtp}</p>
                              <p className="text-[11px] mt-2" style={{ color: textMuted }}>Enter this 6-digit code to verify your identity</p>
                            </div>
                          )}

                          <InputOTP maxLength={6} value={twoFACode} onChange={setTwoFACode} containerClassName="gap-2">
                            <InputOTPGroup>
                              <InputOTPSlot index={0} className="h-12 w-12 text-lg font-semibold" style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }} />
                              <InputOTPSlot index={1} className="h-12 w-12 text-lg font-semibold" style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }} />
                              <InputOTPSlot index={2} className="h-12 w-12 text-lg font-semibold" style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }} />
                            </InputOTPGroup>
                            <InputOTPSeparator style={{ color: textMuted }} />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} className="h-12 w-12 text-lg font-semibold" style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }} />
                              <InputOTPSlot index={4} className="h-12 w-12 text-lg font-semibold" style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }} />
                              <InputOTPSlot index={5} className="h-12 w-12 text-lg font-semibold" style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        {error && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                          >{error}</motion.div>
                        )}
                        {success && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-md px-4 py-2.5 text-center text-sm"
                            style={{ background: isDark ? 'rgba(212, 164, 55, 0.08)' : 'rgba(212, 164, 55, 0.06)', border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.2)' : 'rgba(212, 164, 55, 0.15)'}`, color: accentColor }}
                          >{success}</motion.div>
                        )}

                        <Button type="submit" disabled={loading || twoFACode.length !== 6}
                          className="w-full luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 disabled:opacity-50 transition-all duration-200"
                        >
                          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Verifying...</>) : 'Verify Code'}
                        </Button>

                        {authTwoFAMethod === 'email' && (
                          <div className="text-center">
                            <button type="button" disabled={resendCooldown > 0}
                              onClick={async () => {
                                if (resendCooldown > 0 || !authPendingUserId) return
                                try {
                                  const res = await fetch('/api/auth/2fa/email-otp', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: authPendingUserId }),
                                  })
                                  const data = await res.json()
                                  if (data._otp) { setDisplayedOtp(data._otp); setTwoFACode(data._otp); showToast('info', `Your new verification code: ${data._otp}`) }
                                  if (data._otpToken) { setPendingOtpToken(data._otpToken) }
                                  if (data.success) { showToast('success', 'A new verification code has been sent.'); setSuccess(`A new code has been sent to ${data.email || authPendingEmail || 'your email'}.`) }
                                  setResendCooldown(60)
                                  const cooldownInterval = setInterval(() => { setResendCooldown(prev => { if (prev <= 1) { clearInterval(cooldownInterval); return 0 } return prev - 1 }) }, 1000)
                                } catch { setError('Failed to resend code. Please try again.') }
                              }}
                              className="text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ color: textMuted }}
                            >
                              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive the code? Resend"}
                            </button>
                          </div>
                        )}

                        <button type="button" onClick={() => { setAuthTwoFAStep(false); setAuthTwoFAMethod(null); setAuthPendingEmail(null); setTwoFACode(''); setError(null); setSuccess(null); setPendingOtpToken(null); setDisplayedOtp(null) }}
                          className="w-full text-center text-sm transition-colors" style={{ color: textMuted }}
                        >
                          Back to login
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    /* ── Auth Form (Login/Register) ── */
                    <motion.div
                      key="auth"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Header */}
                      <div className="text-center mb-6">
                        <h2
                          className="text-2xl font-bold"
                          style={{ color: accentColor, fontFamily: "'Urbanist', sans-serif" }}
                        >
                          {selectedLoginRole
                            ? activeTab === 'register'
                              ? 'Create Your Account'
                              : 'Welcome Back'
                            : 'Sign In to Continue'}
                        </h2>
                        <p className="text-sm mt-1" style={{ color: textSecondary }}>
                          {selectedLoginRole
                            ? activeTab === 'register'
                              ? 'Join the luxury experience'
                              : 'Enter your credentials'
                            : 'Choose how you\'d like to continue'}
                        </p>
                      </div>

                      {/* Step 0: Role Selection */}
                      {!selectedLoginRole && (
                        <div className="space-y-3">
                          {/* Customer/User */}
                          <button
                            onClick={() => setSelectedLoginRole('user')}
                            className="w-full flex items-center gap-4 rounded-xl p-4 transition-all duration-300 text-left"
                            style={{
                              background: isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)',
                              border: isDark ? '1px solid rgba(212, 164, 55, 0.15)' : '1px solid rgba(212, 164, 55, 0.12)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.08)';
                              e.currentTarget.style.borderColor = isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(212, 164, 55, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)';
                              e.currentTarget.style.borderColor = isDark ? '1px solid rgba(212, 164, 55, 0.15)' : '1px solid rgba(212, 164, 55, 0.12)';
                            }}
                          >
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-lg flex-shrink-0"
                              style={{ background: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.1)', border: isDark ? '1px solid rgba(212, 164, 55, 0.25)' : '1px solid rgba(212, 164, 55, 0.2)' }}
                            >
                              <User className="h-5 w-5" style={{ color: accentColor }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold" style={{ color: textPrimary }}>Customer / User</p>
                              <p className="text-xs" style={{ color: textSecondary }}>Personal shopping account</p>
                            </div>
                            <ChevronRight className="h-4 w-4" style={{ color: textMuted }} />
                          </button>

                          {/* ── Corporate (COMMENTED OUT) ── */}
                          {/* <button
                            onClick={() => setSelectedLoginRole('corporate')}
                            className="w-full flex items-center gap-4 rounded-xl p-4 transition-all duration-300 text-left"
                            style={{
                              background: isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)',
                              border: isDark ? '1px solid rgba(212, 164, 55, 0.15)' : '1px solid rgba(212, 164, 55, 0.12)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.08)';
                              e.currentTarget.style.borderColor = isDark ? 'rgba(212, 164, 55, 0.3)' : 'rgba(212, 164, 55, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)';
                              e.currentTarget.style.borderColor = isDark ? '1px solid rgba(212, 164, 55, 0.15)' : '1px solid rgba(212, 164, 55, 0.12)';
                            }}
                          >
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-lg flex-shrink-0"
                              style={{ background: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.1)', border: isDark ? '1px solid rgba(212, 164, 55, 0.25)' : '1px solid rgba(212, 164, 55, 0.2)' }}
                            >
                              <Building2 className="h-5 w-5" style={{ color: accentColor }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold" style={{ color: textPrimary }}>Corporate Account</p>
                              <p className="text-xs" style={{ color: textSecondary }}>Business gifting & bulk orders</p>
                            </div>
                            <ChevronRight className="h-4 w-4" style={{ color: textMuted }} />
                          </button> */}

                          {/* Team / Agent */}
                          <button
                            onClick={() => setSelectedLoginRole('team')}
                            className="w-full flex items-center gap-4 rounded-xl p-4 transition-all duration-300 text-left"
                            style={{
                              background: isDark ? 'rgba(168, 85, 247, 0.06)' : 'rgba(126, 34, 206, 0.04)',
                              border: isDark ? '1px solid rgba(168, 85, 247, 0.15)' : '1px solid rgba(126, 34, 206, 0.12)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(126, 34, 206, 0.08)';
                              e.currentTarget.style.borderColor = isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(126, 34, 206, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isDark ? 'rgba(168, 85, 247, 0.06)' : 'rgba(126, 34, 206, 0.04)';
                              e.currentTarget.style.borderColor = isDark ? '1px solid rgba(168, 85, 247, 0.15)' : '1px solid rgba(126, 34, 206, 0.12)';
                            }}
                          >
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-lg flex-shrink-0"
                              style={{ background: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(126, 34, 206, 0.1)', border: isDark ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(126, 34, 206, 0.2)' }}
                            >
                              <Shield className="h-5 w-5" style={{ color: isDark ? '#d8b4fe' : '#7c3aed' }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold" style={{ color: textPrimary }}>3 Boxes Team / Agent</p>
                              <p className="text-xs" style={{ color: textSecondary }}>Internal team portal & support</p>
                            </div>
                            <ChevronRight className="h-4 w-4" style={{ color: textMuted }} />
                          </button>
                        </div>
                      )}

                      {/* Step 1: Login/Register Form */}
                      {selectedLoginRole && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setSelectedLoginRole(null); setError(null); setSuccess(null) }}
                            className="flex items-center gap-1.5 text-sm transition-colors mb-4"
                            style={{ color: textMuted }}
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                          </button>

                          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                            <TabsList
                              className="mx-auto mb-5 w-full"
                              style={{
                                background: isDark ? 'rgba(12, 10, 9, 0.5)' : 'rgba(245, 240, 230, 0.5)',
                                border: `1px solid ${inputBorder}`,
                                borderRadius: '0.75rem',
                              }}
                            >
                              <TabsTrigger
                                value="login"
                                className="flex-1 text-sm font-medium transition-all data-[state=active]:luxury-accent-gradient-bg data-[state=active]:text-stone-950"
                                style={{ color: textSecondary, borderRadius: '0.625rem' }}
                              >
                                Sign In
                              </TabsTrigger>
                              <TabsTrigger
                                value="register"
                                className="flex-1 text-sm font-medium transition-all data-[state=active]:luxury-accent-gradient-bg data-[state=active]:text-stone-950"
                                style={{ color: textSecondary, borderRadius: '0.625rem' }}
                              >
                                Create Account
                              </TabsTrigger>
                            </TabsList>

                            {/* ============ Login Form ============ */}
                            <TabsContent value="login">
                              <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                  <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Email Address</Label>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                    <Input
                                      type="email"
                                      placeholder={getLoginPlaceholder().email}
                                      value={loginEmail}
                                      onChange={(e) => setLoginEmail(e.target.value)}
                                      className={inputClass}
                                      style={{ ...inputStyle, '::placeholder': { color: inputPlaceholder } } as any}
                                      autoComplete="email"
                                      required
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Password</Label>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                    <Input
                                      type={loginShowPassword ? 'text' : 'password'}
                                      placeholder={getLoginPlaceholder().password}
                                      value={loginPassword}
                                      onChange={(e) => setLoginPassword(e.target.value)}
                                      className={`${inputClass} pr-10`}
                                      style={inputStyle}
                                      autoComplete="current-password"
                                      required
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setLoginShowPassword(!loginShowPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                                      style={{ color: textMuted }}
                                      aria-label={loginShowPassword ? 'Hide password' : 'Show password'}
                                    >
                                      {loginShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end">
                                  <button type="button" onClick={() => { setAuthView(null); setView('forgot-password') }} className="text-xs transition-colors hover:opacity-80" style={{ color: isDark ? 'rgba(212, 164, 55, 0.5)' : 'rgba(184, 134, 11, 0.5)' }}>
                                    Forgot password?
                                  </button>
                                </div>

                                {error && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                                  >{error}</motion.div>
                                )}
                                {success && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="rounded-md px-4 py-2.5 text-center text-sm"
                                    style={{ background: isDark ? 'rgba(212, 164, 55, 0.08)' : 'rgba(212, 164, 55, 0.06)', border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.2)' : 'rgba(212, 164, 55, 0.15)'}`, color: accentColor }}
                                  >{success}</motion.div>
                                )}

                                <Button type="submit" disabled={loading}
                                  className="w-full luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 disabled:opacity-50 transition-all duration-200"
                                >
                                  {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Signing In...</>) : 'Sign In'}
                                </Button>
                              </form>

                              {/* Social Login - only for customer */}
                              {selectedLoginRole === 'user' && (
                                <>
                                  <div className="relative my-5">
                                    <Separator style={{ background: isDark ? 'rgba(212, 164, 55, 0.1)' : 'rgba(212, 164, 55, 0.08)' }} />
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 text-xs uppercase tracking-wider" style={{ background: cardBg, color: textMuted }}>
                                      or continue with
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-3">
                                    {/* Google — wide / horizontal orientation */}
                                    <Button type="button" variant="outline" disabled={loading} onClick={() => handleSocialLogin('Google')}
                                      className="w-full h-12 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${inputBorder}`, color: textSecondary }}
                                    >
                                      <svg className="h-5 w-5 mr-3 shrink-0" viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                      </svg>
                                      <span className="text-sm font-medium">Continue with Google</span>
                                    </Button>

                                    {/* Apple — iOS account login */}
                                    <Button type="button" variant="outline" disabled={loading} onClick={() => handleSocialLogin('Apple')}
                                      className="w-full h-12 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${inputBorder}`, color: textSecondary }}
                                    >
                                      <svg className="h-5 w-5 mr-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.05 12.04c-.03-2.7 2.21-3.99 2.31-4.06-1.26-1.84-3.22-2.09-3.92-2.12-1.67-.17-3.26.98-4.11.98-.85 0-2.16-.96-3.55-.93-1.83.03-3.52 1.06-4.46 2.7-1.9 3.3-.49 8.17 1.36 10.84.9 1.31 1.97 2.78 3.38 2.73 1.36-.06 1.87-.88 3.51-.88 1.64 0 2.11.88 3.55.85 1.47-.03 2.4-1.34 3.3-2.66 1.04-1.53 1.47-3.01 1.5-3.09-.03-.01-2.87-1.1-2.87-4.36zM14.32 4.51c.75-.91 1.26-2.17 1.12-3.43-1.08.05-2.39.72-3.17 1.62-.7.8-1.31 2.09-1.15 3.32 1.21.09 2.45-.61 3.2-1.51z"/>
                                      </svg>
                                      <span className="text-sm font-medium">Continue with Apple</span>
                                    </Button>

                                    {/*
                                    <Button type="button" variant="outline" disabled={loading} onClick={() => handleSocialLogin('Facebook')}
                                      className="transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${inputBorder}`, color: textSecondary }}
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                      <span className="sr-only sm:not-sr-only sm:text-xs">Facebook</span>
                                    </Button>
                                    <Button type="button" variant="outline" disabled={loading} onClick={() => handleSocialLogin('LinkedIn')}
                                      className="transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${inputBorder}`, color: textSecondary }}
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                      <span className="sr-only sm:not-sr-only sm:text-xs">LinkedIn</span>
                                    </Button>
                                    */}
                                  </div>
                                </>
                              )}
                            </TabsContent>

                            {/* ============ Register Form ============ */}
                            <TabsContent value="register">
                              <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                  <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Email Address</Label>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                    <Input type="email" placeholder={getRegPlaceholder().email} value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                                      className={inputClass} style={inputStyle} autoComplete="email" required />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Full Name</Label>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                    <Input type="text" placeholder={getRegPlaceholder().name} value={regName} onChange={(e) => setRegName(e.target.value)}
                                      className={inputClass} style={inputStyle} autoComplete="name" required />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Password</Label>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                    <Input type={regShowPassword ? 'text' : 'password'} placeholder="Min. 8 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                                      className={`${inputClass} pr-10`} style={inputStyle} autoComplete="new-password" required />
                                    <button type="button" onClick={() => setRegShowPassword(!regShowPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: textMuted }}
                                      aria-label={regShowPassword ? 'Hide password' : 'Show password'}
                                    >
                                      {regShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Confirm Password</Label>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                    <Input type={regShowPassword ? 'text' : 'password'} placeholder="Re-enter your password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)}
                                      className={inputClass} style={inputStyle} autoComplete="new-password" required />
                                  </div>
                                </div>

                                {/* ===== Corporate-specific fields ===== */}
                                {selectedLoginRole === 'corporate' && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                                    className="space-y-4 pt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.1)' : 'rgba(212, 164, 55, 0.08)'}` }}
                                  >
                                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: isDark ? 'rgba(212, 164, 55, 0.5)' : 'rgba(184, 134, 11, 0.5)' }}>Corporate Details</p>
                                    <div className="space-y-2">
                                      <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Company Name *</Label>
                                      <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                        <Input type="text" placeholder="TechCorp India Pvt. Ltd." value={regCompanyName} onChange={(e) => setRegCompanyName(e.target.value)}
                                          className={inputClass} style={inputStyle} required />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Contact Person Name *</Label>
                                      <div className="relative">
                                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                        <Input type="text" placeholder="Rajesh Kumar" value={regContactName} onChange={(e) => setRegContactName(e.target.value)}
                                          className={inputClass} style={inputStyle} required />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Phone</Label>
                                        <div className="relative">
                                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                          <Input type="tel" placeholder="+91-9876543210" value={regContactPhone} onChange={(e) => setRegContactPhone(e.target.value)}
                                            className={inputClass} style={inputStyle} />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Industry</Label>
                                        <Input type="text" placeholder="Technology" value={regIndustry} onChange={(e) => setRegIndustry(e.target.value)}
                                          style={inputStyle} />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Website</Label>
                                        <div className="relative">
                                          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                          <Input type="url" placeholder="https://techcorp.in" value={regWebsite} onChange={(e) => setRegWebsite(e.target.value)}
                                            className={inputClass} style={inputStyle} />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">GST Number</Label>
                                        <div className="relative">
                                          <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textMuted }} />
                                          <Input type="text" placeholder="29AABCT1234F1ZH" value={regGstNumber} onChange={(e) => setRegGstNumber(e.target.value)}
                                            className={inputClass} style={inputStyle} />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="rounded-md px-3 py-2.5 text-xs" style={{ background: isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)', border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.1)'}`, color: isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(28, 25, 23, 0.5)' }}>
                                      Corporate accounts require admin approval. You will be notified once approved. Two-factor authentication is mandatory.
                                    </div>
                                  </motion.div>
                                )}

                                {/* ===== Team/Agent-specific fields ===== */}
                                {selectedLoginRole === 'team' && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                                    className="space-y-4 pt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(126, 34, 206, 0.08)'}` }}
                                  >
                                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(126, 34, 206, 0.5)' }}>Team / Agent Details</p>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Employee/Agent ID *</Label>
                                        <div className="relative">
                                          <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(126, 34, 206, 0.3)' }} />
                                          <Input type="text" placeholder="3B-2024-0142" value={regEmployeeId} onChange={(e) => setRegEmployeeId(e.target.value)}
                                            className={inputClass} style={inputStyle} required />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label style={{ color: labelColor }} className="text-xs uppercase tracking-wider">Department</Label>
                                        <div className="relative">
                                          <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(126, 34, 206, 0.3)' }} />
                                          <Input type="text" placeholder="Customer Success" value={regDepartment} onChange={(e) => setRegDepartment(e.target.value)}
                                            className={inputClass} style={inputStyle} />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="rounded-md px-3 py-2.5 text-xs" style={{ background: isDark ? 'rgba(168, 85, 247, 0.06)' : 'rgba(126, 34, 206, 0.04)', border: `1px solid ${isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(126, 34, 206, 0.1)'}`, color: isDark ? 'rgba(216, 180, 254, 0.6)' : 'rgba(126, 34, 206, 0.5)' }}>
                                      Team/Agent accounts require admin approval before access is granted. Two-factor authentication is mandatory for all team accounts.
                                    </div>
                                  </motion.div>
                                )}

                                {/* Customer 2FA option */}
                                {selectedLoginRole === 'user' && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                                    className="flex items-start gap-3 rounded-lg p-3"
                                    style={{ background: isDark ? 'rgba(12, 10, 9, 0.3)' : 'rgba(245, 240, 230, 0.3)', border: `1px solid ${inputBorder}` }}
                                  >
                                    <Checkbox id="reg-2fa" checked={regEnable2FA} onCheckedChange={(checked) => setRegEnable2FA(checked === true)}
                                      className="mt-0.5 border-amber-700/50 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                    />
                                    <div>
                                      <Label htmlFor="reg-2fa" style={{ color: textPrimary }} className="text-xs font-medium cursor-pointer">Enable two-factor authentication</Label>
                                      <p className="text-xs mt-0.5" style={{ color: textMuted }}>Add an extra layer of security to your account with 2FA verification.</p>
                                    </div>
                                  </motion.div>
                                )}

                                {error && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                                  >{error}</motion.div>
                                )}
                                {success && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="rounded-md px-4 py-2.5 text-center text-sm"
                                    style={{ background: isDark ? 'rgba(212, 164, 55, 0.08)' : 'rgba(212, 164, 55, 0.06)', border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.2)' : 'rgba(212, 164, 55, 0.15)'}`, color: accentColor }}
                                  >{success}</motion.div>
                                )}

                                <Button type="submit" disabled={loading}
                                  className="w-full luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90 disabled:opacity-50 transition-all duration-200"
                                >
                                  {loading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" />Creating Account...</>
                                  ) : (
                                    selectedLoginRole === 'corporate' || selectedLoginRole === 'team'
                                      ? 'Submit for Approval'
                                      : 'Create Account'
                                  )}
                                </Button>

                                <p className="text-center text-xs" style={{ color: textMuted }}>
                                  By creating an account, you agree to our{' '}
                                  <span className="cursor-pointer transition-colors" style={{ color: isDark ? 'rgba(212, 164, 55, 0.5)' : 'rgba(184, 134, 11, 0.5)' }}>Terms of Service</span>
                                  {' '}and{' '}
                                  <span className="cursor-pointer transition-colors" style={{ color: isDark ? 'rgba(212, 164, 55, 0.5)' : 'rgba(184, 134, 11, 0.5)' }}>Privacy Policy</span>
                                </p>
                              </form>

                              {/* Social Registration - only for customer */}
                              {selectedLoginRole === 'user' && (
                                <>
                                  <div className="relative my-5">
                                    <Separator style={{ background: isDark ? 'rgba(212, 164, 55, 0.1)' : 'rgba(212, 164, 55, 0.08)' }} />
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 text-xs uppercase tracking-wider" style={{ background: cardBg, color: textMuted }}>
                                      or sign up with
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-3">
                                    {/* Google — wide / horizontal orientation */}
                                    <Button type="button" variant="outline" disabled={loading} onClick={() => handleSocialLogin('Google')}
                                      className="w-full h-12 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${inputBorder}`, color: textSecondary }}
                                    >
                                      <svg className="h-5 w-5 mr-3 shrink-0" viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                      </svg>
                                      <span className="text-sm font-medium">Sign up with Google</span>
                                    </Button>

                                    {/* Apple — iOS account login */}
                                    <Button type="button" variant="outline" disabled={loading} onClick={() => handleSocialLogin('Apple')}
                                      className="w-full h-12 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${inputBorder}`, color: textSecondary }}
                                    >
                                      <svg className="h-5 w-5 mr-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.05 12.04c-.03-2.7 2.21-3.99 2.31-4.06-1.26-1.84-3.22-2.09-3.92-2.12-1.67-.17-3.26.98-4.11.98-.85 0-2.16-.96-3.55-.93-1.83.03-3.52 1.06-4.46 2.7-1.9 3.3-.49 8.17 1.36 10.84.9 1.31 1.97 2.78 3.38 2.73 1.36-.06 1.87-.88 3.51-.88 1.64 0 2.11.88 3.55.85 1.47-.03 2.4-1.34 3.3-2.66 1.04-1.53 1.47-3.01 1.5-3.09-.03-.01-2.87-1.1-2.87-4.36zM14.32 4.51c.75-.91 1.26-2.17 1.12-3.43-1.08.05-2.39.72-3.17 1.62-.7.8-1.31 2.09-1.15 3.32 1.21.09 2.45-.61 3.2-1.51z"/>
                                      </svg>
                                      <span className="text-sm font-medium">Sign up with Apple</span>
                                    </Button>

                                    {/*
                                    <Button type="button" variant="outline" disabled={loading} onClick={() => handleSocialLogin('Facebook')}
                                      className="transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${inputBorder}`, color: textSecondary }}
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                      <span className="sr-only sm:not-sr-only sm:text-xs">Facebook</span>
                                    </Button>
                                    <Button type="button" variant="outline" disabled={loading} onClick={() => handleSocialLogin('LinkedIn')}
                                      className="transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${inputBorder}`, color: textSecondary }}
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                      <span className="sr-only sm:not-sr-only sm:text-xs">LinkedIn</span>
                                    </Button>
                                    */}
                                  </div>
                                </>
                              )}
                            </TabsContent>
                          </Tabs>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: Branding Panel ── */}
          <div
            className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(212, 164, 55, 0.06) 0%, rgba(28, 25, 23, 0.4) 50%, rgba(212, 164, 55, 0.04) 100%)'
                : 'linear-gradient(135deg, rgba(212, 164, 55, 0.04) 0%, rgba(255, 255, 255, 0.6) 50%, rgba(212, 164, 55, 0.03) 100%)',
            }}
          >
            {/* Gold shimmer overlay */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                background: [
                  'linear-gradient(135deg, transparent 0%, rgba(219,175,54,0.04) 25%, transparent 50%, rgba(219,175,54,0.03) 75%, transparent 100%)',
                  'linear-gradient(225deg, transparent 0%, rgba(219,175,54,0.05) 25%, transparent 50%, rgba(219,175,54,0.03) 75%, transparent 100%)',
                  'linear-gradient(135deg, transparent 0%, rgba(219,175,54,0.04) 25%, transparent 50%, rgba(219,175,54,0.03) 75%, transparent 100%)',
                ],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />

            <div className="relative z-10 max-w-lg text-center">
              {/* Logo */}
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
              
                <div className="mt-0 flex items-center justify-center gap-3">
                  <span className="luxury-accent-bg h-px w-10 opacity-60" />
                  <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
                  <span className="luxury-accent-bg h-px w-10 opacity-60" />
                </div>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-base mt-3 mb-6 text-center font-bold tracking-wide"
                style={{ color: textSecondary, fontFamily: "'Urbanist', sans-serif" }}
              >
                Where luxury meets personalization
              </motion.p>

              {/* Branding Points */}
              <div className="space-y-5 text-left">
                {brandingPoints.map((point, i) => (
                  <motion.div
                    key={point.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                      style={{
                        background: isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.08)',
                        border: isDark ? '1px solid rgba(212, 164, 55, 0.2)' : '1px solid rgba(212, 164, 55, 0.15)',
                      }}
                    >
                      <point.icon className="h-5 w-5" style={{ color: accentColor }} />
                    </div>
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: accentColor, fontFamily: "'Urbanist', sans-serif" }}
                      >
                        {point.title}
                      </h3>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: textSecondary }}>
                        {point.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
