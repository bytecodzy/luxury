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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { Mail, Lock, User, Shield, Loader2, Eye, EyeOff, Phone, CheckCircle2, XCircle, KeyRound, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function AuthDialog() {
  const authView = useStore((s) => s.authView)
  const authTwoFAStep = useStore((s) => s.authTwoFAStep)
  const authPendingUserId = useStore((s) => s.authPendingUserId)
  const setAuth = useStore((s) => s.setAuth)
  const setAuthView = useStore((s) => s.setAuthView)
  const setAuthTwoFAStep = useStore((s) => s.setAuthTwoFAStep)
  const setAuthPendingUserId = useStore((s) => s.setAuthPendingUserId)

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginShowPassword, setLoginShowPassword] = useState(false)

  // Register form
  const [regEmail, setRegEmail] = useState('')
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regShowPassword, setRegShowPassword] = useState(false)
  const [regRole, setRegRole] = useState('user')

  // Corporate registration fields
  const [regCompanyName, setRegCompanyName] = useState('')
  const [regWorkEmail, setRegWorkEmail] = useState('')
  const [regGstNumber, setRegGstNumber] = useState('')
  const [regBillingAddress, setRegBillingAddress] = useState('')

  // Forgot password
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // 2FA
  const [twoFACode, setTwoFACode] = useState('')

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  const isOpen = authView === 'login' || authView === 'register'

  const resetForm = useCallback(() => {
    setLoginEmail('')
    setLoginPassword('')
    setLoginShowPassword(false)
    setRegEmail('')
    setRegName('')
    setRegPhone('')
    setRegPassword('')
    setRegShowPassword(false)
    setRegRole('user')
    setRegCompanyName('')
    setRegWorkEmail('')
    setRegGstNumber('')
    setRegBillingAddress('')
    setTwoFACode('')
    setForgotMode(false)
    setForgotEmail('')
    setResetToken('')
    setNewPassword('')
    setError(null)
    setSuccess(null)
    setLoading(false)
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

  // Sync tab with authView when dialog opens
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

        // Check if 2FA is required
        if (data.requires2FA || data.requiresTwoFactor) {
          setAuthPendingUserId(data.user?.id || data.userId)
          setAuthTwoFAStep(true)
          setSuccess('A verification code has been sent. Please enter it below.')
          return
        }

        // Successful login
        if (data.user && (data.token || data.accessToken)) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'user',
          }
          // Use JWT access token if available, fallback to legacy token
          const token = data.accessToken || data.token
          setAuth(user, token, data.refreshToken, data.accessExpiresAt, data.refreshExpiresAt)

          // Show role-specific message for admin users
          if (user.role === 'admin' || user.role === 'team') {
            setSuccess('Welcome back, Administrator. Full access granted.')
          } else if (user.role === 'corporate') {
            setSuccess('Welcome to 3 Boxes Corporate Portal.')
          }
        }
      } catch {
        setError('Network error. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    },
    [loginEmail, loginPassword, setAuth, setAuthPendingUserId, setAuthTwoFAStep]
  )

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSuccess(null)

      if (!regEmail.trim() || !regName.trim() || !regPassword.trim()) {
        setError('Please fill in all fields.')
        return
      }

      // Validate password strength
      const hasUpper = /[A-Z]/.test(regPassword)
      const hasLower = /[a-z]/.test(regPassword)
      const hasNumber = /[0-9]/.test(regPassword)
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword)
      if (regPassword.length < 8 || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        setError('Password must be 8+ chars with uppercase, lowercase, number, and special character.')
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: regEmail.trim(),
            name: regName.trim(),
            phone: regPhone.trim() || undefined,
            password: regPassword,
            role: regRole,
            ...(regRole === 'corporate' ? {
              companyName: regCompanyName.trim(),
              workEmail: regWorkEmail.trim() || undefined,
              gstNumber: regGstNumber.trim() || undefined,
              billingAddress: regBillingAddress.trim() || undefined,
            } : {}),
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Registration failed. Please try again.')
          return
        }

        // Check if registration requires approval
        if (data.approvalStatus === 'pending') {
          setSuccess(
            'Your registration is pending approval. You will be notified once your account is approved.'
          )
          // Don't log in - just show the message
          return
        }

        // Successful registration with auto-login
        if (data.user && (data.token || data.accessToken)) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'user',
          }
          const token = data.accessToken || data.token
          setAuth(user, token, data.refreshToken, data.accessExpiresAt, data.refreshExpiresAt)
        } else if (data.user && !data.token && !data.accessToken) {
          // Account created but no token (needs verification/approval)
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
    [regEmail, regName, regPassword, regRole, regCompanyName, regWorkEmail, regGstNumber, regBillingAddress, setAuth]
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
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Verification failed. Please try again.')
          return
        }

        if (data.verified && data.user && (data.token || data.accessToken)) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'user',
          }
          const token = data.accessToken || data.token
          setAuth(user, token, data.refreshToken, data.accessExpiresAt, data.refreshExpiresAt)

          // Show role-specific message for admin users
          if (user.role === 'admin' || user.role === 'team') {
            setSuccess('Welcome back, Administrator. Full access granted.')
          } else if (user.role === 'corporate') {
            setSuccess('Welcome to 3 Boxes Corporate Portal.')
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
    [twoFACode, authPendingUserId, setAuth, setAuthTwoFAStep]
  )

  const handleSocialLogin = useCallback(
    async (provider: string) => {
      setError(null)
      setSuccess(null)
      setLoading(true)

      try {
        // Simulated social login - in production, this would redirect to OAuth
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

        if (data.user && (data.token || data.accessToken)) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'user',
          }
          const token = data.accessToken || data.token
          setAuth(user, token, data.refreshToken, data.accessExpiresAt, data.refreshExpiresAt)
        }
      } catch {
        setError('Social login failed. Please try again later.')
      } finally {
        setLoading(false)
      }
    },
    [setAuth]
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-amber-900/30 bg-stone-950 text-amber-50 sm:max-w-md [&>button]:text-amber-200/60 [&>button]:hover:text-amber-200"
        onOpenAutoFocus={handleDialogMount}
      >
        {/* 2FA Verification Step */}
        <AnimatePresence mode="wait">
          {authTwoFAStep ? (
            <motion.div
              key="2fa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="mb-4">
                <DialogTitle className="gold-shimmer text-2xl font-bold tracking-wide">
                  Two-Factor Authentication
                </DialogTitle>
                <DialogDescription className="text-amber-200/50">
                  Enter the 6-digit code sent to your device
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handle2FAVerify} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-700/40 bg-amber-900/20">
                    <Shield className="h-8 w-8 text-amber-500" />
                  </div>
                  <p className="text-center text-sm text-amber-200/60">
                    Please enter the verification code to continue
                  </p>

                  <InputOTP
                    maxLength={6}
                    value={twoFACode}
                    onChange={setTwoFACode}
                    containerClassName="gap-2"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={0}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                      <InputOTPSlot
                        index={1}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                      <InputOTPSlot
                        index={2}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                    </InputOTPGroup>
                    <InputOTPSeparator className="text-amber-700/40" />
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={3}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                      <InputOTPSlot
                        index={4}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                      <InputOTPSlot
                        index={5}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-amber-700/40 bg-amber-950/30 px-4 py-2.5 text-center text-sm text-amber-300"
                  >
                    {success}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading || twoFACode.length !== 6}
                  className="w-full bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthTwoFAStep(false)
                    setTwoFACode('')
                    setError(null)
                    setSuccess(null)
                  }}
                  className="w-full text-center text-sm text-amber-200/50 transition-colors hover:text-amber-200"
                >
                  Back to login
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="mb-2">
                <DialogTitle className="gold-shimmer text-2xl font-bold tracking-wide text-center">
                  3 BOXES LUXURY
                </DialogTitle>
                <DialogDescription className="text-amber-200/50 text-center">
                  Sign in to your exclusive account
                </DialogDescription>
              </DialogHeader>

              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="mx-auto mb-4 w-full bg-stone-900/60 border border-amber-900/30">
                  <TabsTrigger
                    value="login"
                    className="flex-1 data-[state=active]:bg-amber-700/30 data-[state=active]:text-amber-200 text-amber-200/50 transition-all"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="flex-1 data-[state=active]:bg-amber-700/30 data-[state=active]:text-amber-200 text-amber-200/50 transition-all"
                  >
                    Create Account
                  </TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                  {!forgotMode ? (
                  <>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="login-password"
                          type={loginShowPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 pr-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setLoginShowPassword(!loginShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/40 transition-colors hover:text-amber-200"
                          aria-label={loginShowPassword ? 'Hide password' : 'Show password'}
                        >
                          {loginShowPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => { setForgotMode(true); setError(null); setSuccess(null) }}
                        className="text-xs text-amber-500/70 transition-colors hover:text-amber-400"
                      >
                        Forgot password?
                      </button>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                      >
                        {error}
                      </motion.div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-amber-700/40 bg-amber-950/30 px-4 py-2.5 text-center text-sm text-amber-300"
                      >
                        {success}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>

                  {/* Demo Credentials Info */}
                  <div className="mt-3 rounded-md border border-amber-800/20 bg-amber-950/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-amber-500/50 mb-1.5">Demo Login Credentials</p>
                    <div className="space-y-1 text-[11px] text-amber-200/40">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-amber-500/40" />
                        <span className="text-amber-300/50 font-medium">Admin:</span>
                        <span>admin@3boxesluxury.com / Admin@123</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-amber-500/40" />
                        <span className="text-amber-300/50 font-medium">User:</span>
                        <span>Register a new account</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-amber-500/40" />
                        <span className="text-amber-300/50 font-medium">Corporate:</span>
                        <span>Register as Corporate</span>
                      </div>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-amber-800/10">
                      <p className="text-[9px] text-amber-200/25">🔒 JWT tokens · Rate limiting · Account lockout · 2FA support</p>
                    </div>
                  </div>

                  <div className="relative my-6">
                    <Separator className="bg-amber-900/30" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-950 px-3 text-xs text-amber-200/40 uppercase tracking-wider">
                      or continue with
                    </span>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSocialLogin('Google')}
                      className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="sr-only sm:not-sr-only sm:text-xs">Google</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSocialLogin('Facebook')}
                      className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span className="sr-only sm:not-sr-only sm:text-xs">Facebook</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSocialLogin('LinkedIn')}
                      className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span className="sr-only sm:not-sr-only sm:text-xs">LinkedIn</span>
                    </Button>
                  </div>
                  </>) : (
                    /* Forgot Password Form */
                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      setError(null)
                      setSuccess(null)
                      if (!forgotEmail.trim()) { setError('Please enter your email address.'); return }
                      setLoading(true)
                      try {
                        const res = await fetch('/api/auth/forgot-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: forgotEmail.trim() }),
                        })
                        const data = await res.json()
                        if (!res.ok) { setError(data.error || 'Failed to send reset link.'); setLoading(false); return }
                        if (data.resetToken) {
                          setResetToken(data.resetToken)
                          setSuccess(`Reset token generated (MVP): ${data.resetToken}`)
                        } else {
                          setSuccess('If an account exists with this email, a reset link has been sent.')
                        }
                      } catch { setError('Network error. Please try again.') }
                      finally { setLoading(false) }
                    }} className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <KeyRound className="h-5 w-5 text-amber-500" />
                        <h3 className="text-sm font-semibold text-amber-100">Reset Password</h3>
                      </div>
                      <p className="text-xs text-amber-200/50">Enter your email and we&apos;ll send you a reset link.</p>
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email" className="text-amber-200/70 text-xs uppercase tracking-wider">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                          <Input
                            id="forgot-email"
                            type="email"
                            placeholder="you@example.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30"
                            required
                          />
                        </div>
                      </div>
                      {resetToken && (
                        <div className="space-y-2">
                          <Label className="text-amber-200/70 text-xs uppercase tracking-wider">Reset Token (for testing)</Label>
                          <Input value={resetToken} readOnly className="border-amber-600/40 bg-amber-950/20 text-amber-300 text-xs font-mono" />
                          <p className="text-[10px] text-amber-200/30">Copy this token and use it at /api/auth/reset-password to reset your password.</p>
                        </div>
                      )}
                      {error && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300">
                          {error}
                        </motion.div>
                      )}
                      {success && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-md border border-amber-700/40 bg-amber-950/30 px-4 py-2.5 text-center text-sm text-amber-300">
                          {success}
                        </motion.div>
                      )}
                      <Button type="submit" disabled={loading}
                        className="w-full bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500 disabled:opacity-50">
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : 'Send Reset Link'}
                      </Button>
                      <button type="button" onClick={() => { setForgotMode(false); setError(null); setSuccess(null); setResetToken('') }}
                        className="w-full text-center text-sm text-amber-200/50 transition-colors hover:text-amber-200">
                        Back to login
                      </button>
                    </form>
                  )}
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@example.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder="Your full name"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="name"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-phone" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Phone Number <span className="text-amber-200/30">(optional)</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="+91 9876543210"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="reg-password"
                          type={regShowPassword ? 'text' : 'password'}
                          placeholder="8+ chars, upper, lower, number, special"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 pr-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowPassword(!regShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/40 transition-colors hover:text-amber-200"
                          aria-label={regShowPassword ? 'Hide password' : 'Show password'}
                        >
                          {regShowPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {regPassword && (
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <span className={`flex items-center gap-1 ${regPassword.length >= 8 ? 'text-emerald-400' : 'text-amber-200/30'}`}>
                            {regPassword.length >= 8 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} 8+ characters
                          </span>
                          <span className={`flex items-center gap-1 ${/[A-Z]/.test(regPassword) ? 'text-emerald-400' : 'text-amber-200/30'}`}>
                            {/[A-Z]/.test(regPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Uppercase
                          </span>
                          <span className={`flex items-center gap-1 ${/[a-z]/.test(regPassword) ? 'text-emerald-400' : 'text-amber-200/30'}`}>
                            {/[a-z]/.test(regPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Lowercase
                          </span>
                          <span className={`flex items-center gap-1 ${/[0-9]/.test(regPassword) ? 'text-emerald-400' : 'text-amber-200/30'}`}>
                            {/[0-9]/.test(regPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Number
                          </span>
                          <span className={`flex items-center gap-1 col-span-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword) ? 'text-emerald-400' : 'text-amber-200/30'}`}>
                            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Special character (!@#$%...)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Account Type
                      </Label>
                      <Select value={regRole} onValueChange={setRegRole}>
                        <SelectTrigger className="w-full border-amber-900/40 bg-stone-900/50 text-amber-50 focus:ring-amber-600/30">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent className="border-amber-900/40 bg-stone-950 text-amber-50">
                          <SelectItem value="user" className="text-amber-200/80 focus:bg-amber-900/30 focus:text-amber-100">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5" />
                              User
                            </div>
                          </SelectItem>
                          <SelectItem value="agent" className="text-amber-200/80 focus:bg-amber-900/30 focus:text-amber-100">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5" />
                              Agent
                            </div>
                          </SelectItem>
                          <SelectItem value="team" className="text-amber-200/80 focus:bg-amber-900/30 focus:text-amber-100">
                            <div className="flex items-center gap-2">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                              3Boxes Team
                            </div>
                          </SelectItem>
                          <SelectItem value="corporate" className="text-amber-200/80 focus:bg-amber-900/30 focus:text-amber-100">
                            <div className="flex items-center gap-2">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7H3l2-4h14l2 4M5 21V10.87M19 21V10.87"/>
                              </svg>
                              Corporate
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {regRole === 'team' && (
                        <p className="text-xs text-amber-500/60">
                          Team accounts require approval before access is granted.
                        </p>
                      )}
                      {regRole === 'agent' && (
                        <p className="text-xs text-amber-500/60">
                          Agent accounts may require verification.
                        </p>
                      )}
                      {regRole === 'corporate' && (
                        <p className="text-xs text-amber-500/60">
                          Corporate accounts get bulk ordering, GST invoicing, and dedicated support.
                        </p>
                      )}
                    </div>

                    {/* Corporate Registration Fields */}
                    {regRole === 'corporate' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 rounded-lg border border-amber-800/30 bg-amber-950/10 p-4"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-amber-500" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">Corporate Details</span>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reg-company-name" className="text-amber-200/70 text-xs uppercase tracking-wider">
                            Company Name <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                            <Input
                              id="reg-company-name"
                              type="text"
                              placeholder="Your company name"
                              value={regCompanyName}
                              onChange={(e) => setRegCompanyName(e.target.value)}
                              className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                              required={regRole === 'corporate'}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reg-work-email" className="text-amber-200/70 text-xs uppercase tracking-wider">
                            Work Email <span className="text-amber-200/30">(optional)</span>
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                            <Input
                              id="reg-work-email"
                              type="email"
                              placeholder="contact@company.com"
                              value={regWorkEmail}
                              onChange={(e) => setRegWorkEmail(e.target.value)}
                              className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reg-gst-number" className="text-amber-200/70 text-xs uppercase tracking-wider">
                            GST Number <span className="text-amber-200/30">(optional)</span>
                          </Label>
                          <Input
                            id="reg-gst-number"
                            type="text"
                            placeholder="22AAAAA0000A1Z5"
                            value={regGstNumber}
                            onChange={(e) => setRegGstNumber(e.target.value)}
                            className="border-amber-900/40 bg-stone-900/50 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reg-billing-address" className="text-amber-200/70 text-xs uppercase tracking-wider">
                            Billing Address <span className="text-amber-200/30">(optional)</span>
                          </Label>
                          <Input
                            id="reg-billing-address"
                            type="text"
                            placeholder="Company billing address"
                            value={regBillingAddress}
                            onChange={(e) => setRegBillingAddress(e.target.value)}
                            className="border-amber-900/40 bg-stone-900/50 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          />
                        </div>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                      >
                        {error}
                      </motion.div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-amber-700/40 bg-amber-950/30 px-4 py-2.5 text-center text-sm text-amber-300"
                      >
                        {success}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>

                    <p className="text-center text-xs text-amber-200/30">
                      By creating an account, you agree to our{' '}
                      <span className="cursor-pointer text-amber-500/60 hover:text-amber-400 transition-colors">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="cursor-pointer text-amber-500/60 hover:text-amber-400 transition-colors">
                        Privacy Policy
                      </span>
                    </p>
                  </form>

                  {/* Social Login Divider */}
                  <div className="relative my-6">
                    <Separator className="bg-amber-900/30" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-950 px-3 text-xs text-amber-200/40 uppercase tracking-wider">
                      or sign up with
                    </span>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSocialLogin('Google')}
                      className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="sr-only sm:not-sr-only sm:text-xs">Google</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSocialLogin('Facebook')}
                      className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span className="sr-only sm:not-sr-only sm:text-xs">Facebook</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSocialLogin('LinkedIn')}
                      className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span className="sr-only sm:not-sr-only sm:text-xs">LinkedIn</span>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
