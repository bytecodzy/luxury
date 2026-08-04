'use client'

/**
 * UserDashboard  —  Luxury redesign (Task 4h-user-dashboard-v2)
 * ────────────────────────────────────────────────────────────────────────
 * CHANGES IN THIS VERSION (per user spec):
 *
 *  1. WELCOME BANNER
 *     • Removed the decorative gift-box icon block on the right.
 *     • Replaced it with a clickable VIDEO block that opens the Gift
 *       Builder overlay (`toggleGiftBuilder()`). Video asset path:
 *         /public/images/gift-builder.mp4  (user uploads this).
 *     • Added a "Gift Builder" heading underneath the video block.
 *
 *  2. STATS ROW
 *     • Removed the "Reward Points" card entirely.
 *     • Remaining cards: View all orders · Wishlist Items · Available Offers.
 *     • Removed all hardcoded numeric fallbacks (12 / 18 / 1250 / 5).
 *
 *  3. SIDEBAR PROFILE CARD
 *     • Removed the crown icon overlay on the avatar.
 *     • Removed the "Premium Member" badge.
 *     • Now shows: avatar (gold gradient w/ initial) · name · email.
 *
 *  4. SIDEBAR — STANDALONE PREMIUM MEMBER CARD
 *     • Removed entirely (was the dark gradient card with the crown).
 *
 *  5. HARDCODED DATA PURGE
 *     • Removed MOCK_TRENDING, MOCK_RECOMMENDED, MOCK_GIFT_CARDS,
 *       MOCK_ADDRESSES, MOCK_NOTIFICATIONS, MEMBER_BENEFITS.
 *     • Removed TrendingSection, RecommendedSection, MemberBenefitsCard,
 *       SavedAddressesCard (which used MOCK_ADDRESSES).
 *     • The Notifications badge count (5) is no longer hardcoded —
 *       nav item is rendered without a badge until a real API exists.
 *     • AddressesView / GiftCardsView / NotificationsView now show
 *       graceful empty states instead of mock data.
 *
 *  6. LUXURY THEME ALIGNMENT WITH HOME PAGE
 *     • Adopted the `appTheme === 'dark'` / `isDark` pattern used by
 *       hero-section, order-confirmation, order-failed.
 *     • Cream background (#fdf9f1) in light mode, stone-950 in dark.
 *     • Gold accent #dbaf36 used consistently for highlights, icons,
 *       and primary actions.
 *     • Refined card styling: softer borders, layered shadows, gold
 *       gradient avatars, hover lift, frosted-glass effects on dark.
 *     • Lora serif for section titles via the `font-lora` utility,
 *       Urbanist for body (loaded globally in layout.tsx).
 *
 * PRESERVED FUNCTIONALITY
 *   • 401 auto-logout (auth:unauthorized event)
 *   • Orders fetch via /api/orders?email=
 *   • Wishlist fetch via /api/wishlist
 *   • Cancel order dialog (DELETE /api/orders/[id])
 *   • View ticket dialog with messages
 */

import React, { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  LayoutDashboard, ShoppingBag, Heart, MapPin, User as UserIcon, CreditCard,
  Gift, Bell, RotateCcw, HelpCircle, LogOut, ChevronRight, ChevronDown, Plus,
  Package, Clock, Truck, XCircle, Loader2, Sparkles, Check,
  ArrowRight, Phone, Home as HomeIcon, Tag, Trash2,
  Pencil, CheckCircle2, AlertCircle, Headphones, Shield, FileText,
  Calendar, Play, TrendingUp, Ticket, ClipboardList, MapPinned,
  Download, RefreshCw, Eye,
} from 'lucide-react'
import jsPDF from 'jspdf'

/* ─── helpers ─── */
const authH = (t: string | null): Record<string, string> => t ? { Authorization: `Bearer ${t}` } : {}

const statusColor = (s: string, isDark: boolean) => {
  const light = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    shipped: 'bg-purple-100 text-purple-700 border-purple-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    open: 'bg-amber-100 text-amber-700 border-amber-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    closed: 'bg-stone-100 text-stone-700 border-stone-200',
  }
  const dark = {
    pending: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    delivered: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
    open: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    in_progress: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    resolved: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    closed: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
  }
  const map = isDark ? dark : light
  return map[s] || (isDark ? dark.closed : light.closed)
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d: string) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '—' }
}

/* ─── nav items ─── */
// NavKey covers every leaf view the dashboard can render internally.
// External navigations (wishlist, faq, track-order) go through setView()
// and don't appear here — they're handled via the `externalView` field on
// a NavLeaf so the parent highlight state can still resolve correctly.
type NavKey =
  | 'profile'              // Profile overview (dashboard home)
  | 'account'              // Profile → Account Details
  | 'addresses'            // Profile → Address
  | 'wishlist'             // Profile → Wishlist (external: setView('wishlist'))
  | 'orders'               // Orders overview (defaults to order history)
  | 'order-history'        // Orders → Order History
  | 'order-tracking'       // Orders → Order Tracking (external: setView('track-order'))
  | 'coupons'              // renamed from "My Gift Cards"
  | 'notifications'
  | 'faq'                  // renamed from "Help & Support" (external: setView('faq'))
  | 'logout'

interface NavLeaf {
  key: NavKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  // When set, clicking this leaf calls setView(externalView) instead of
  // switching the internal activeNav. Used for wishlist / faq / track-order.
  externalView?: string
}

interface NavItem {
  key: NavKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  externalView?: string
  children?: NavLeaf[]
}

/* ─── shared luxury style tokens (resolved per render via isDark) ─── */
interface Theme {
  isDark: boolean
  pageBg: string
  cardBg: string
  cardBgSoft: string
  cardBorder: string
  cardBorderHover: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accentText: string
  accentBg: string
  accentBgSoft: string
  hairline: string
  shadowColor: string
}

function useTheme(): Theme {
  const appTheme = useStore((s) => s.appTheme)
  const isDark = appTheme === 'dark'
  return {
    isDark,
    pageBg: isDark ? 'bg-stone-950' : 'bg-[#fdf9f1]',
    cardBg: isDark ? 'bg-stone-900/70' : 'bg-white',
    cardBgSoft: isDark ? 'bg-stone-800/40' : 'bg-amber-50/40',
    cardBorder: isDark ? 'border-amber-500/15' : 'border-amber-200',
    cardBorderHover: isDark ? 'hover:border-amber-500/35' : 'hover:border-amber-400',
    textPrimary: isDark ? 'text-amber-50' : 'text-stone-900',
    textSecondary: isDark ? 'text-amber-100/70' : 'text-stone-600',
    textMuted: isDark ? 'text-amber-100/40' : 'text-stone-500',
    accentText: isDark ? 'text-amber-300' : 'text-amber-700',
    accentBg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
    accentBgSoft: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
    hairline: isDark ? 'border-amber-500/15' : 'border-amber-200',
    shadowColor: isDark ? 'shadow-black/40' : 'shadow-amber-900/5',
  }
}

/* ─── Main Component ─── */
export function UserDashboard() {
  const { authUser, authToken, setView, clearAuth, setAuthView, selectProduct, toggleGiftBuilder, addItem } = useStore()
  // activeNav tracks the currently selected leaf (or parent when used as overview).
  const [activeNav, setActiveNav] = useState<NavKey>('profile')
  // Track which accordion parents are expanded. Profile is expanded by default
  // so the user sees its sub-modules immediately. Orders starts collapsed.
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({ profile: true })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const t = useTheme()

  // 401 auto-logout
  React.useEffect(() => {
    const handler = () => { clearAuth(); setAuthView('login') }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, setAuthView])

  if (!authUser || authUser.role !== 'user') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-10">
        <Card className={`w-full max-w-md ${t.cardBorder} ${t.cardBg} ${t.shadowColor}`}>
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className={`mb-2 text-xl font-bold ${t.textPrimary}`}>Access Denied</h2>
            <p className={`mb-4 text-sm ${t.textMuted}`}>You do not have user privileges to view this page.</p>
            <Button
              className="luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90"
              onClick={() => setView('home')}
            >
              Back to Store
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // New sidebar structure (per Task 4j spec):
  //   Profile (expandable)
  //     ├─ Account Details   → AccountDetailsView
  //     ├─ Address           → AddressesView
  //     └─ Wishlist          → setView('wishlist')
  //   Orders (expandable)
  //     ├─ Order History     → MyOrdersView
  //     └─ Order Tracking    → setView('track-order')
  //   Coupons                → GiftCardsView (renamed from "My Gift Cards")
  //   Notifications          → NotificationsView
  //   FAQ's                  → setView('faq') (renamed from "Help & Support")
  //   Logout                 → clearAuth() + setView('home')
  //
  // REMOVED: "Payment Methods", "Returns & Refunds"
  const navItems: NavItem[] = [
    {
      key: 'profile',
      label: 'Profile',
      icon: UserIcon,
      children: [
        { key: 'account', label: 'Account Details', icon: UserIcon },
        { key: 'addresses', label: 'Address', icon: MapPinned },
        { key: 'wishlist', label: 'Wishlist', icon: Heart, externalView: 'wishlist' },
      ],
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      children: [
        { key: 'order-history', label: 'Order History', icon: ClipboardList },
        { key: 'order-tracking', label: 'Order Tracking', icon: Truck, externalView: 'track-order' },
      ],
    },
    { key: 'coupons', label: 'Coupons', icon: Ticket },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'faq', label: "FAQ's", icon: HelpCircle, externalView: 'faq' },
    { key: 'logout', label: 'Logout', icon: LogOut },
  ]

  // Build a quick lookup: child key → parent key (for highlight resolution).
  const childToParent: Record<string, string> = {}
  for (const item of navItems) {
    if (item.children) {
      for (const child of item.children) {
        childToParent[child.key] = item.key
      }
    }
  }

  const handleNavClick = (key: NavKey) => {
    // Leaf items with external navigation:
    if (key === 'logout') { clearAuth(); setView('home'); return }

    // Find the nav item (could be a parent or a leaf)
    const parent = navItems.find(n => n.key === key)
    const leaf = parent?.children?.find(c => c.key === key)

    // External-view leaf (wishlist / faq / track-order): navigate via setView
    // and DON'T change activeNav (so the dashboard internal state stays put).
    if (leaf?.externalView) {
      setView(leaf.externalView as any)
      setMobileNavOpen(false)
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    // Top-level FAQ has externalView on itself (no children)
    if (parent?.externalView && !parent.children) {
      setView(parent.externalView as any)
      setMobileNavOpen(false)
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    // Parent click (Profile or Orders): toggle expand + navigate to overview.
    if (parent?.children) {
      setExpandedParents(prev => ({ ...prev, [key]: !prev[key] }))
      // When expanding the parent, also navigate to the parent overview view.
      // When collapsing, keep the current view as-is (don't navigate away).
      if (!expandedParents[key]) {
        setActiveNav(key)
      }
      setMobileNavOpen(false)
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    // Regular leaf (Account Details / Address / Order History / Coupons / Notifications)
    // — make sure its parent is expanded so the active leaf is visible.
    const parentKey = childToParent[key]
    if (parentKey) {
      setExpandedParents(prev => ({ ...prev, [parentKey]: true }))
    }
    setActiveNav(key)
    setMobileNavOpen(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* ── Sidebar ── */}
        <Sidebar
          user={authUser}
          navItems={navItems}
          activeNav={activeNav}
          onNavClick={handleNavClick}
          setView={setView}
          mobileNavOpen={mobileNavOpen}
          setMobileNavOpen={setMobileNavOpen}
          expandedParents={expandedParents}
          setExpandedParents={setExpandedParents}
          childToParent={childToParent}
          theme={t}
        />

        {/* ── Main content ── */}
        <main className="min-w-0">
          {/* Profile overview (dashboard home) */}
          {(activeNav === 'profile' || activeNav === 'wishlist') && (
            <DashboardHome
              user={authUser}
              token={authToken}
              setView={setView}
              selectProduct={selectProduct}
              toggleGiftBuilder={toggleGiftBuilder}
              theme={t}
            />
          )}
          {/* Profile → Account Details */}
          {activeNav === 'account' && <AccountDetailsView user={authUser} theme={t} />}
          {/* Profile → Address */}
          {activeNav === 'addresses' && <AddressesView theme={t} />}

          {/* Orders overview + Orders → Order History */}
          {(activeNav === 'orders' || activeNav === 'order-history') && (
            <MyOrdersView
              token={authToken}
              email={authUser.email}
              theme={t}
              setView={setView}
              selectProduct={selectProduct}
              addItem={addItem}
              userName={authUser.name}
            />
          )}
          {/* Orders → Order Tracking is external (setView('track-order')) — no internal view */}

          {/* Coupons (renamed from My Gift Cards) */}
          {activeNav === 'coupons' && <GiftCardsView theme={t} />}
          {/* Notifications */}
          {activeNav === 'notifications' && <NotificationsView theme={t} />}
        </main>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── SIDEBAR                                                     ── */
/* ─────────────────────────────────────────────────────────────── */

interface SidebarProps {
  user: { name: string; email: string; role: string }
  navItems: NavItem[]
  activeNav: NavKey
  onNavClick: (key: NavKey) => void
  setView: (v: any) => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  expandedParents: Record<string, boolean>
  setExpandedParents: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  childToParent: Record<string, string>
  theme: Theme
}

function Sidebar({
  user, navItems, activeNav, onNavClick, setView,
  mobileNavOpen, setMobileNavOpen,
  expandedParents, setExpandedParents, childToParent, theme,
}: SidebarProps) {
  const t = theme

  // Find the human-readable label for the mobile nav toggle button.
  const activeLabel = (() => {
    for (const item of navItems) {
      if (item.key === activeNav) return item.label
      if (item.children) {
        const child = item.children.find(c => c.key === activeNav)
        if (child) return child.label
      }
    }
    return 'Profile'
  })()

  return (
    <>
      {/* Mobile nav toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          className={`w-full justify-between ${t.cardBorder} ${t.cardBg} ${t.textPrimary}`}
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          <span className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            {activeLabel}
          </span>
          <ChevronRight className={`h-4 w-4 transition-transform ${mobileNavOpen ? 'rotate-90' : ''}`} />
        </Button>
      </div>

      <aside
        className={`
          ${mobileNavOpen ? 'block' : 'hidden'} lg:block
          space-y-4 lg:sticky lg:top-6 lg:self-start
        `}
      >
        {/* ── Profile card (no crown, no "Premium Member" badge) ── */}
        <div className={`relative overflow-hidden rounded-2xl border ${t.cardBorder} ${t.cardBg} p-5 shadow-sm ${t.shadowColor}`}>
          {/* subtle gold blob */}
          <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-2xl font-bold text-stone-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-300/30">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h3 className={`mt-3 text-base font-bold ${t.textPrimary}`}>{user.name}</h3>
            <p className={`mt-1 text-[11px] ${t.textMuted} break-all`}>{user.email}</p>
          </div>
        </div>

        {/* ── Nav menu (accordion) ── */}
        <nav className={`rounded-2xl border ${t.cardBorder} ${t.cardBg} p-2 shadow-sm ${t.shadowColor}`}>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isParent = !!item.children && item.children.length > 0
              const isExpanded = !!expandedParents[item.key]
              // A parent is "active" if either the parent itself is the activeNav
              // OR one of its children is the activeNav.
              const isChildActive = isParent && item.children!.some(c => c.key === activeNav)
              const isParentActive = activeNav === item.key || isChildActive
              const isLogout = item.key === 'logout'

              // For non-parent items, active if activeNav === item.key
              const isLeafActive = !isParent && activeNav === item.key

              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onNavClick(item.key)}
                    className={`
                      group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                      ${(isParentActive || isLeafActive)
                        ? `${t.accentBg} ${t.accentText} ${t.isDark ? 'bg-amber-500/15' : 'bg-amber-100'}`
                        : isLogout
                          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-600/10'
                          : `${t.textSecondary} ${t.isDark ? 'hover:bg-amber-500/10 hover:text-amber-200' : 'hover:bg-amber-50 hover:text-amber-900'}`
                      }
                    `}
                  >
                    <item.icon className={`h-4 w-4 ${(isParentActive || isLeafActive) ? t.accentText : ''}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge ? (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                    {isParent && (
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${(isParentActive || isLeafActive) ? t.accentText : t.textMuted}`}
                      />
                    )}
                  </button>

                  {/* Accordion children */}
                  {isParent && isExpanded && (
                    <ul className={`mt-0.5 ml-3 space-y-0.5 border-l ${t.isDark ? 'border-amber-500/15' : 'border-amber-200'} pl-2`}>
                      {item.children!.map((child) => {
                        const isChildSelected = activeNav === child.key
                        return (
                          <li key={child.key}>
                            <button
                              type="button"
                              onClick={() => onNavClick(child.key)}
                              className={`
                                group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all
                                ${isChildSelected
                                  ? `${t.accentText} ${t.isDark ? 'bg-amber-500/10' : 'bg-amber-50'} border ${t.isDark ? 'border-amber-500/30' : 'border-amber-300'}`
                                  : `${t.textMuted} ${t.isDark ? 'hover:bg-amber-500/10 hover:text-amber-200' : 'hover:bg-amber-50 hover:text-amber-900'}`
                                }
                              `}
                            >
                              <child.icon className={`h-3.5 w-3.5 ${isChildSelected ? t.accentText : ''}`} />
                              <span className="flex-1 text-left">{child.label}</span>
                              {child.badge ? (
                                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                                  {child.badge}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ── Support card ── */}
        <div className={`relative overflow-hidden rounded-2xl border ${t.cardBorder} ${t.isDark ? 'bg-stone-900/60' : 'bg-amber-50/60'} p-5 shadow-sm ${t.shadowColor}`}>
          <div className="absolute -top-8 -left-8 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-stone-950 shadow-md">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className={`text-sm font-bold ${t.textPrimary}`}>Need Help?</h4>
              <p className={`mt-1 text-[11px] leading-snug ${t.textMuted}`}>
                Our support team is here for you 24/7
              </p>
              <button
                type="button"
                onClick={() => setView('contact')}
                className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${t.accentText} hover:opacity-80`}
              >
                Contact Support
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── DASHBOARD HOME VIEW                                         ── */
/* ─────────────────────────────────────────────────────────────── */

interface DashboardHomeProps {
  user: { name: string; email: string }
  token: string | null
  setView: (v: any) => void
  selectProduct: (id: string) => void
  toggleGiftBuilder: () => void
  theme: Theme
}

function DashboardHome({ user, token, setView, selectProduct, toggleGiftBuilder, theme }: DashboardHomeProps) {
  return (
    <div className="space-y-6">
      {/* ── Welcome banner (with video block + Gift Builder heading) ── */}
      <WelcomeBanner
        userName={user.name}
        email={user.email}
        token={token}
        setView={setView}
        toggleGiftBuilder={toggleGiftBuilder}
        theme={theme}
      />

      {/* ── Stats row (3 cards — Reward Points removed) ── */}
      <StatsRow email={user.email} token={token} setView={setView} theme={theme} />

      {/* ── Recent Orders ── */}
      <RecentOrdersSection token={token} email={user.email} setView={setView} theme={theme} />

      {/* ── Wishlist ── */}
      <WishlistPreviewSection token={token} selectProduct={selectProduct} setView={setView} theme={theme} />

      {/* ── Account Overview (single full-width card) ── */}
      <AccountOverviewCard setView={setView} theme={theme} />
    </div>
  )
}

/* ── Welcome Banner ── */
function WelcomeBanner({
  userName, email, token, setView, toggleGiftBuilder, theme,
}: {
  userName: string
  email: string
  token: string | null
  setView: (v: any) => void
  toggleGiftBuilder: () => void
  theme: Theme
}) {
  const t = theme
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl border ${t.cardBorder} shadow-md ${t.shadowColor}`}
    >
      {/* Background — luxury gradient */}
      <div className={`absolute inset-0 ${t.isDark
        ? 'bg-gradient-to-br from-stone-900 via-stone-900 to-amber-900/15'
        : 'bg-gradient-to-br from-amber-50 via-white to-rose-50'
      }`} />

      {/* Decorative blobs */}
      <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-rose-300/15 blur-3xl pointer-events-none" />
      {/* fine gold rule top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-start gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: greeting */}
        <div className="max-w-md">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${t.accentBg} ${t.accentText}`}>
            <Sparkles className="h-3 w-3" />
            3 Boxes Luxury
          </div>
          <h1 className={`mt-3 text-2xl font-bold sm:text-3xl ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
            Welcome back, {userName.split(' ')[0]}! <span className="inline-block animate-pulse">🙌</span>
          </h1>
          <p className={`mt-2 text-sm ${t.textSecondary}`}>
            Here&apos;s what&apos;s happening with your account today.
          </p>
          <div className={`mt-3 flex items-center gap-2 text-xs ${t.textMuted}`}>
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

               {/* Right: video block (clickable → Gift Builder) + heading underneath */}
                <div className="flex w-full flex-col items-center sm:w-auto sm:items-end">
                  <button
                    type="button"
                    onClick={toggleGiftBuilder}
                    aria-label="Open Gift Builder"
                    className="group relative block w-full sm:w-72"
                  >
                    {/* Video frame */}
                    
                      {/* Video element — user uploads /public/images/gift-builder.mp4 */}
                      <video
                    src="/images/check-out.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-50 w-100 object-contain mx-auto rounded-xl"
                  />
                      
                    
                  </button>
        
                  {/* Heading underneath the video block — "Gift Builder" */}
                  <div className="mt-1 mr-11 flex items-center gap-2">
                    <Gift className={`h-4 w-4 ${t.accentText}`} />
                    <h3
                      className={`text-sm font-bold uppercase tracking-[0.18em] ${t.textPrimary}`}
                      style={{ fontFamily: 'var(--font-lora), Lora, serif' }}
                    >
                      Gift Builder
                    </h3>
                    <ArrowRight className={`h-3.5 w-3.5 ${t.accentText} opacity-60`} />
                  </div>
                </div>
              </div>
            </motion.div>
          )
        }

/* ── Stats Row (3 cards — Reward Points removed) ── */
function StatsRow({ email, token, setView, theme }: { email: string; token: string | null; setView: (v: any) => void; theme: Theme }) {
  const t = theme
  const { data: ordersData } = useQuery({
    queryKey: ['user-orders-stats', email],
    queryFn: async () => {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: wishlistData } = useQuery({
    queryKey: ['user-wishlist-stats'],
    queryFn: async () => {
      const res = await fetch('/api/wishlist', { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!token,
  })

  // Real counts — no hardcoded fallbacks.
  const totalOrders = Array.isArray(ordersData?.orders) ? ordersData.orders.length : 0
  const wishlistItems = Array.isArray(wishlistData?.wishlist) ? wishlistData.wishlist.length : 0

  const stats = [
    { icon: ShoppingBag, label: 'Total Orders', value: totalOrders, link: 'View all orders', view: 'orders', color: 'from-amber-400 to-amber-600' },
    { icon: Heart, label: 'Wishlist Items', value: wishlistItems, link: 'Go to wishlist', view: 'wishlist', color: 'from-rose-400 to-rose-600' },
    { icon: Tag, label: 'Available Offers', value: null, link: 'View offers', view: 'home', color: 'from-emerald-400 to-emerald-600' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {stats.map((stat, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => setView(stat.view)}
          className={`group relative overflow-hidden rounded-2xl border ${t.cardBorder} ${t.cardBg} p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${t.cardBorderHover} ${t.shadowColor}`}
        >
          {/* corner glow */}
          <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl pointer-events-none opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-2xl font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
                {stat.value === null ? '—' : stat.value}
              </p>
              <p className={`text-xs font-medium ${t.textMuted}`}>{stat.label}</p>
              <p className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${t.accentText}`}>
                {stat.link}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </p>
            </div>
          </div>
        </button>
      ))}
    </motion.div>
  )
}

/* ── Recent Orders Section ── */
function RecentOrdersSection({ token, email, setView, theme }: { token: string | null; email: string; setView: (v: any) => void; theme: Theme }) {
  const t = theme
  const { data, isLoading } = useQuery({
    queryKey: ['user-orders-recent', email],
    queryFn: async () => {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
  })

  const orders = (Array.isArray(data?.orders) ? data.orders : []).slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className={`relative overflow-hidden ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className={`h-4 w-4 ${t.accentText}`} />
              <CardTitle className={`text-base font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
                Recent Orders
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={t.accentText}
              onClick={() => setView('orders')}
            >
              View All Orders
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No orders yet"
              subtitle="Start shopping to see your orders here"
              cta={{ label: 'Browse Products', onClick: () => setView('home') }}
              theme={t}
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => (
                <OrderRow key={order.id} order={order} theme={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function OrderRow({ order, theme }: { order: any; theme: Theme; key?: string | number }) {
  const t = theme
  const firstItem = order.items?.[0]
  const statusLabel = order.status?.charAt(0).toUpperCase() + order.status?.slice(1)

  return (
    <div className={`flex items-center gap-4 rounded-xl border ${t.isDark ? 'border-amber-500/15 bg-stone-800/30' : 'border-amber-100 bg-amber-50/40'} p-3 transition-colors hover:bg-amber-50/60 dark:hover:bg-stone-800/50`}>
      {/* Product image */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
        {firstItem?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstItem.image} alt={firstItem.name} className="h-full w-full object-cover" />
        ) : (
          <Package className={`h-6 w-6 ${t.textMuted}`} />
        )}
      </div>

      {/* Order info */}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${t.textPrimary}`}>
          {firstItem?.name ?? 'Order'}
          {order.items?.length > 1 && (
            <span className={`ml-1 text-xs ${t.textMuted}`}>+{order.items.length - 1} more</span>
          )}
        </p>
        <p className={`mt-0.5 font-mono text-xs ${t.textMuted}`}>
          Order #{order.orderNumber ?? order.id.slice(-8).toUpperCase()}
        </p>
        <div className={`mt-1.5 flex flex-wrap items-center gap-2 text-[11px] ${t.textMuted}`}>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Placed: {fmtDate(order.createdAt)}
          </span>
          {order.status === 'delivered' && order.deliveredAt && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Delivered: {fmtDate(order.deliveredAt)}
            </span>
          )}
          {order.status === 'shipped' && order.estimatedDelivery && (
            <span className={`inline-flex items-center gap-1 ${t.accentText}`}>
              <Truck className="h-3 w-3" />
              Expected: {fmtDate(order.estimatedDelivery)}
            </span>
          )}
          {order.status === 'processing' && order.estimatedDelivery && (
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Clock className="h-3 w-3" />
              Estimated: {fmtDate(order.estimatedDelivery)}
            </span>
          )}
        </div>
      </div>

      {/* Status + amount */}
      <div className="flex flex-col items-end gap-1.5">
        <Badge variant="outline" className={`capitalize ${statusColor(order.status, t.isDark)}`}>{statusLabel}</Badge>
        <span className={`text-sm font-bold ${t.textPrimary}`}>{fmt(order.total)}</span>
      </div>

      <ChevronRight className={`h-4 w-4 shrink-0 ${t.textMuted} opacity-50`} />
    </div>
  )
}

/* ── Wishlist Preview Section ── */
function WishlistPreviewSection({ token, selectProduct, setView, theme }: { token: string | null; selectProduct: (id: string) => void; setView: (v: any) => void; theme: Theme }) {
  const t = theme
  const { data, isLoading } = useQuery({
    queryKey: ['user-wishlist-preview'],
    queryFn: async () => {
      const res = await fetch('/api/wishlist', { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!token,
  })

  const wishlist = (Array.isArray(data?.wishlist) ? data.wishlist : []).slice(0, 4)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className={`relative overflow-hidden ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <CardTitle className={`text-base font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
                Wishlist
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={t.accentText}
              onClick={() => setView('wishlist')}
            >
              View Wishlist
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : wishlist.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="Your wishlist is empty"
              subtitle="Save items you love to find them quickly later"
              cta={{ label: 'Discover Products', onClick: () => setView('home') }}
              theme={t}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {wishlist.map((item: any) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectProduct(item.productId || item.id)}
                  className={`group relative overflow-hidden rounded-xl border ${t.isDark ? 'border-amber-500/15 bg-stone-800/30' : 'border-amber-100 bg-amber-50/30'} text-left transition-all hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className="relative aspect-square overflow-hidden bg-stone-100 dark:bg-stone-800">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className={`h-8 w-8 ${t.textMuted}`} />
                      </div>
                    )}
                    <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm dark:bg-stone-900/80">
                      <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className={`truncate text-xs font-semibold ${t.textPrimary}`}>{item.name}</p>
                    <p className={`mt-0.5 text-sm font-bold ${t.accentText}`}>{fmt(item.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── MY ORDERS VIEW                                              ── */
/* ─────────────────────────────────────────────────────────────── */

function MyOrdersView({
  token, email, theme, setView, selectProduct, addItem, userName,
}: {
  token: string | null
  email: string
  theme: Theme
  setView: (v: any) => void
  selectProduct: (id: string) => void
  addItem: (item: { productId: string; name: string; price: number; image: string }) => void
  userName: string
}) {
  const t = theme
  const { data, isLoading } = useQuery({
    queryKey: ['user-orders-list', email],
    queryFn: async () => {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null)
  const [returnOrderNumber, setReturnOrderNumber] = useState<string>('')
  const [returnReason, setReturnReason] = useState('')
  const [returnLoading, setReturnLoading] = useState(false)
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const orders = Array.isArray(data?.orders) ? data.orders : []

  // ── Cancel order (DELETE /api/orders/[id]) ──
  const handleCancelOrder = async () => {
    if (!cancelOrderId) return
    setCancelLoading(true)
    try {
      const res = await fetch(`/api/orders/${cancelOrderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authH(token) },
        body: JSON.stringify({ reason: cancelReason, email }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['user-orders-list', email] })
        queryClient.invalidateQueries({ queryKey: ['user-orders-stats', email] })
        queryClient.invalidateQueries({ queryKey: ['user-orders-recent', email] })
      }
    } catch {
      // ignore
    } finally {
      setCancelLoading(false)
      setCancelDialogOpen(false)
      setCancelReason('')
      setCancelOrderId(null)
    }
  }

  // ── Return order (POST /api/support-tickets with return context) ──
  // Creates a support ticket with subject "Return request for order #XXX"
  // and the user's reason as the first message body.
  const handleReturnOrder = async () => {
    if (!returnOrderId) return
    setReturnLoading(true)
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH(token) },
        body: JSON.stringify({
          subject: `Return request for order #${returnOrderNumber}`,
          priority: 'medium',
          category: 'return',
          // First message body — include reason + order reference
          message: `I would like to return order #${returnOrderNumber}.\n\nReason: ${returnReason || 'Not specified'}`,
          metadata: { orderId: returnOrderId, orderNumber: returnOrderNumber, type: 'return_request' },
        }),
      })
      if (res.ok) {
        // After successfully creating the ticket, route the user to the
        // contact/support page so they can see their ticket and continue
        // the conversation there.
        setView('contact')
      }
    } catch {
      // ignore
    } finally {
      setReturnLoading(false)
      setReturnDialogOpen(false)
      setReturnReason('')
      setReturnOrderId(null)
      setReturnOrderNumber('')
    }
  }

  // ── Download invoice as PDF (client-side via jsPDF, matches order-confirmation page) ──
  const handleDownloadInvoice = useCallback(async (order: any) => {
    setInvoiceLoadingId(order.id)
    try {
      // Fetch the canonical invoice data from the API (returns invoice
      // number + order details + customer info).
      const res = await fetch(`/api/orders/${order.id}/invoice`, { headers: authH(token) })
      const invoiceData = await res.json().catch(() => null)

      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 40

      // Header band (matches order-confirmation invoice)
      doc.setFillColor(20, 16, 14)
      doc.rect(0, 0, pageWidth, 80, 'F')
      doc.setTextColor(219, 175, 54)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.text('3 BOXES LUXURY', margin, 35)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(245, 230, 163)
      doc.text('Where luxury meets personalization', margin, 52)
      doc.setFontSize(12)
      doc.setTextColor(219, 175, 54)
      doc.text('INVOICE', pageWidth - margin, 35, { align: 'right' })

      let y = 110
      doc.setTextColor(40, 40, 40)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      const displayOrderNumber = invoiceData?.order?.orderNumber || order.orderNumber || order.id.slice(-8).toUpperCase()
      doc.text(`Order ${displayOrderNumber}`, margin, y)

      y += 20
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Order Date: ${fmtDate(order.createdAt)}`, margin, y)
      if (order.estimatedDelivery) {
        doc.text(`Estimated Delivery: ${fmtDate(order.estimatedDelivery)}`, margin, y + 14)
        y += 14
      }
      doc.text(`Status: ${order.status}`, margin, y + 14)
      // Invoice number from the API
      if (invoiceData?.invoice?.invoiceNumber) {
        doc.text(`Invoice #: ${invoiceData.invoice.invoiceNumber}`, margin, y + 28)
        y += 14
      }
      y += 30

      // Items table header
      doc.setDrawColor(212, 164, 55)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 16
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(40, 40, 40)
      doc.text('Item', margin, y)
      doc.text('Qty', pageWidth - 200, y, { align: 'right' })
      doc.text('Price', pageWidth - 130, y, { align: 'right' })
      doc.text('Total', pageWidth - margin, y, { align: 'right' })
      y += 8
      doc.line(margin, y, pageWidth - margin, y)
      y += 16

      // Items
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      const items = (order.items ?? []).length > 0 ? order.items : []
      for (const item of items) {
        const itemTotal = (item.price || 0) * (item.quantity || 1)
        const name = (item.name || '').length > 60 ? (item.name || '').slice(0, 57) + '...' : (item.name || '')
        doc.text(name, margin, y)
        doc.text(String(item.quantity || 1), pageWidth - 200, y, { align: 'right' })
        doc.text(fmt(item.price || 0), pageWidth - 130, y, { align: 'right' })
        doc.text(fmt(itemTotal), pageWidth - margin, y, { align: 'right' })
        y += 16
        if (y > 720) { doc.addPage(); y = 60 }
      }

      // Totals
      y += 10
      doc.line(margin, y, pageWidth - margin, y)
      y += 16
      const drawTotal = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setTextColor(bold ? 40 : 100, bold ? 40 : 100, bold ? 40 : 100)
        doc.text(label, pageWidth - 200, y)
        doc.text(value, pageWidth - margin, y, { align: 'right' })
        y += 16
      }
      drawTotal('Subtotal', fmt(order.subtotal))
      drawTotal('Shipping', fmt(order.shipping))
      drawTotal('Tax', fmt(order.tax))
      if (order.discount && order.discount > 0) {
        drawTotal('Discount', `- ${fmt(order.discount)}`)
      }
      y += 4
      doc.setDrawColor(212, 164, 55)
      doc.setLineWidth(1)
      doc.line(pageWidth - 200, y, pageWidth - margin, y)
      y += 16
      drawTotal('Total', fmt(order.total), true)

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        'Thank you for your purchase. This invoice was generated electronically and is valid without signature.',
        margin, pageHeight - 30
      )

      doc.save(`Invoice-${displayOrderNumber}.pdf`)
    } catch (err) {
      console.error('Invoice generation failed:', err)
      alert('Sorry, we could not generate the invoice. Please try again.')
    } finally {
      setInvoiceLoadingId(null)
    }
  }, [token])

  // ── Buy Again — add the first item to cart + go to checkout ──
  const handleBuyAgain = (order: any) => {
    const firstItem = order.items?.[0]
    if (!firstItem) return
    addItem({
      productId: firstItem.productId || firstItem.id,
      name: firstItem.name,
      price: firstItem.price,
      image: firstItem.image || '',
    })
    setView('checkout')
  }

  // ── View Item — open the product detail page ──
  const handleViewItem = (order: any) => {
    const firstItem = order.items?.[0]
    if (!firstItem) return
    selectProduct(firstItem.productId || firstItem.id)
  }

  // ── Open return dialog ──
  const openReturnDialog = (order: any) => {
    setReturnOrderId(order.id)
    setReturnOrderNumber(order.orderNumber ?? order.id.slice(-8).toUpperCase())
    setReturnDialogOpen(true)
  }

  // ── Status label helper ──
  const getStatusHeadline = (status: string, estimatedDelivery?: string, deliveredAt?: string) => {
    if (status === 'delivered') {
      return deliveredAt
        ? `Delivered ${fmtDate(deliveredAt)}`
        : 'Delivered'
    }
    if (status === 'shipped' && estimatedDelivery) {
      return `Arriving ${fmtDate(estimatedDelivery)}`
    }
    if (status === 'processing') {
      return 'Processing your order'
    }
    if (status === 'pending') {
      return 'Order received'
    }
    if (status === 'cancelled') {
      return 'Cancelled'
    }
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getStatusSubtitle = (status: string, estimatedDelivery?: string) => {
    if (status === 'delivered') return 'Package was delivered successfully'
    if (status === 'shipped') return estimatedDelivery ? `Expected delivery ${fmtDate(estimatedDelivery)}` : 'Package is on the way'
    if (status === 'processing') return 'We are preparing your order for shipment'
    if (status === 'pending') return 'Awaiting confirmation'
    if (status === 'cancelled') return 'Order has been cancelled'
    return ''
  }

  return (
    <div className="space-y-4">
      <PageHeader title="My Orders" subtitle="Track and manage all your orders in one place" icon={ShoppingBag} theme={t} />

      {isLoading ? (
        <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
          <CardContent className="p-4">
            <EmptyState
              icon={Package}
              title="No orders yet"
              subtitle="When you place an order, it will appear here."
              theme={t}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const firstItem = order.items?.[0]
            const hasMultipleItems = (order.items?.length ?? 0) > 1
            const isExpanded = expandedOrderId === order.id
            const statusHeadline = getStatusHeadline(order.status, order.estimatedDelivery, order.deliveredAt)
            const statusSubtitle = getStatusSubtitle(order.status, order.estimatedDelivery)
            const cancellable = order.status === 'pending' || order.status === 'processing'
            const returnable = order.status === 'delivered'
            const invoiceLoading = invoiceLoadingId === order.id

            return (
              <div
                key={order.id}
                className={`overflow-hidden rounded-xl border ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}
              >
                {/* ── Header row (4 columns: Order Placed | Total | Ship To | Order #) ── */}
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
                      {userName || 'Customer'}
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

                {/* ── Divider ── */}
                <div className={`border-t ${t.hairline}`} />

                {/* ── Main content row: image | status + product | action buttons ── */}
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
                  {/* Product image */}
                  <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border ${t.cardBorder} bg-stone-100 dark:bg-stone-800`}>
                    {firstItem?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstItem.image} alt={firstItem.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className={`h-8 w-8 ${t.textMuted}`} />
                    )}
                  </div>

                  {/* Status + product info */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-base font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
                      {statusHeadline}
                    </p>
                    {statusSubtitle && (
                      <p className={`mt-0.5 text-sm ${t.textSecondary}`}>{statusSubtitle}</p>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleViewItem}
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

                    {/* Expanded items list (when "View order details" is clicked) */}
                    {isExpanded && hasMultipleItems && (
                      <div className={`mt-4 rounded-lg border ${t.cardBorder} ${t.cardBgSoft} p-3`}>
                        <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>
                          All items in this order
                        </p>
                        <ul className="space-y-2">
                          {(order.items ?? []).map((item: any, idx: number) => (
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
                      </div>
                    )}
                  </div>

                  {/* Action buttons column (right side) */}
                  <div className="flex shrink-0 flex-col gap-2 md:w-44">
                    {/* Cancel Order (replaces "Track package") */}
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

                    {/* Return Order (replaces "Leave seller feedback") */}
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
                    {/* "Leave delivery feedback" button intentionally removed per user spec */}
                  </div>
                </div>

                {/* ── Bottom action row: Buy Again + View Item ── */}
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
                    onClick={handleViewItem}
                    className={`inline-flex items-center gap-1.5 rounded-full border ${t.isDark ? 'border-amber-500/40 text-amber-200 hover:bg-amber-500/10' : 'border-amber-700/60 text-amber-800 hover:bg-amber-50'} px-4 py-2 text-xs font-semibold transition-all`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View your item
                  </button>
                  {/* Order status badge — small confirmation of current state */}
                  <Badge
                    variant="outline"
                    className={`ml-auto capitalize ${statusColor(order.status, t.isDark)}`}
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Cancel Order Dialog ── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className={`${t.cardBorder} ${t.cardBg} sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle className={t.textPrimary}>Cancel Order</DialogTitle>
            <DialogDescription className={t.textMuted}>Are you sure you want to cancel this order? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="cancel-reason" className={`text-sm ${t.textSecondary}`}>Reason for cancellation</Label>
              <Input
                id="cancel-reason"
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

      {/* ── Return Order Dialog ── */}
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
              <Label htmlFor="return-reason" className={`text-sm ${t.textSecondary}`}>Reason for return</Label>
              <textarea
                id="return-reason"
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
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── ADDRESSES VIEW (no hardcoded addresses — empty state)       ── */
/* ─────────────────────────────────────────────────────────────── */

function AddressesView({ theme }: { theme: Theme }) {
  const t = theme
  return (
    <div className="space-y-4">
      <PageHeader title="Saved Addresses" subtitle="Manage your shipping addresses" icon={MapPin} theme={t} />
      <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${t.accentBgSoft}`}>
              <MapPin className={`h-8 w-8 ${t.accentText}`} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${t.textPrimary}`}>No saved addresses</h3>
              <p className={`mt-1 text-sm ${t.textMuted}`}>Add a shipping address to speed up checkout.</p>
            </div>
          </div>
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed ${t.isDark ? 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10' : 'border-amber-300 text-amber-700 hover:bg-amber-50'} py-3 text-sm font-semibold transition-colors`}
          >
            <Plus className="h-4 w-4" />
            Add New Address
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── ACCOUNT DETAILS VIEW                                        ── */
/* ─────────────────────────────────────────────────────────────── */

function AccountDetailsView({ user, theme }: { user: { name: string; email: string; phone?: string | null }; theme: Theme }) {
  const t = theme
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => setSaving(false), 1000)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Account Details" subtitle="Manage your personal information and password" icon={UserIcon} theme={t} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile photo card */}
        <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
          <CardContent className="flex flex-col items-center p-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-3xl font-bold text-stone-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-300/30">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h3 className={`mt-3 text-base font-bold ${t.textPrimary}`}>{user.name}</h3>
            <p className={`text-xs ${t.textMuted}`}>{user.email}</p>
            <Button variant="outline" size="sm" className={`mt-4 ${t.cardBorder} ${t.textSecondary}`}>
              <Pencil className="mr-1 h-3 w-3" />
              Change Photo
            </Button>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm lg:col-span-2 ${t.shadowColor}`}>
          <CardHeader>
            <CardTitle className={`text-sm font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" className={`text-xs ${t.textSecondary}`}>Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className={`mt-1 ${t.cardBorder} ${t.cardBg} ${t.textPrimary}`}
                  />
                </div>
                <div>
                  <Label htmlFor="email" className={`text-xs ${t.textSecondary}`}>Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className={`mt-1 ${t.cardBorder} ${t.cardBg} ${t.textPrimary}`}
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className={`text-xs ${t.textSecondary}`}>Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className={`mt-1 ${t.cardBorder} ${t.cardBg} ${t.textPrimary}`}
                  />
                </div>
              </div>

              <Separator className={t.isDark ? 'bg-amber-500/15' : 'bg-amber-200'} />

              <div>
                <h4 className={`text-sm font-bold ${t.textPrimary}`}>Change Password</h4>
                <p className={`mt-0.5 text-xs ${t.textMuted}`}>Leave blank to keep your current password</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="currentPassword" className={`text-xs ${t.textSecondary}`}>Current</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={form.currentPassword}
                    onChange={(e) => setForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className={`mt-1 ${t.cardBorder} ${t.cardBg} ${t.textPrimary}`}
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword" className={`text-xs ${t.textSecondary}`}>New</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => setForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className={`mt-1 ${t.cardBorder} ${t.cardBg} ${t.textPrimary}`}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className={`text-xs ${t.textSecondary}`}>Confirm</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={`mt-1 ${t.cardBorder} ${t.cardBg} ${t.textPrimary}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" className={`${t.cardBorder} ${t.textSecondary}`}>Cancel</Button>
                <Button type="submit" disabled={saving} className="luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── PAYMENT METHODS VIEW (no hardcoded cards — empty state)     ── */
/* ─────────────────────────────────────────────────────────────── */

function PaymentMethodsView({ theme }: { theme: Theme }) {
  const t = theme
  return (
    <div className="space-y-4">
      <PageHeader title="Payment Methods" subtitle="Manage your saved cards and wallets" icon={CreditCard} theme={t} />
      <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${t.accentBgSoft}`}>
              <CreditCard className={`h-8 w-8 ${t.accentText}`} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${t.textPrimary}`}>No saved cards</h3>
              <p className={`mt-1 text-sm ${t.textMuted}`}>Add a card to make checkout faster and more secure.</p>
            </div>
          </div>
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed ${t.isDark ? 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10' : 'border-amber-300 text-amber-700 hover:bg-amber-50'} py-3 text-sm font-semibold transition-colors`}
          >
            <Plus className="h-4 w-4" />
            Add New Card
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── GIFT CARDS VIEW (no hardcoded cards — empty state)          ── */
/* ─────────────────────────────────────────────────────────────── */

function GiftCardsView({ theme }: { theme: Theme }) {
  const t = theme
  return (
    <div className="space-y-4">
      <PageHeader title="Coupons" subtitle="View your coupon balances and usage" icon={Ticket} theme={t} />
      <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${t.accentBgSoft}`}>
              <Gift className={`h-8 w-8 ${t.accentText}`} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${t.textPrimary}`}>No gift cards yet</h3>
              <p className={`mt-1 text-sm ${t.textMuted}`}>Redeem a gift card code or receive one as a reward to see it here.</p>
            </div>
          </div>
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed ${t.isDark ? 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10' : 'border-amber-300 text-amber-700 hover:bg-amber-50'} py-3 text-sm font-semibold transition-colors`}
          >
            <Plus className="h-4 w-4" />
            Redeem Gift Card Code
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── NOTIFICATIONS VIEW (no hardcoded notifications — empty)     ── */
/* ─────────────────────────────────────────────────────────────── */

function NotificationsView({ theme }: { theme: Theme }) {
  const t = theme
  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" subtitle="Stay updated with your account activity" icon={Bell} theme={t} />
      <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
        <CardContent className="p-6">
          <EmptyState
            icon={Bell}
            title="All caught up!"
            subtitle="You have no notifications right now. Check back later for updates on your orders and offers."
            theme={t}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── RETURNS & REFUNDS VIEW                                      ── */
/* ─────────────────────────────────────────────────────────────── */

function ReturnsRefundsView({ token, email, theme }: { token: string | null; email: string; theme: Theme }) {
  const t = theme
  const { data, isLoading } = useQuery({
    queryKey: ['user-orders-returns', email],
    queryFn: async () => {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const orders = (Array.isArray(data?.orders) ? data.orders : [])
    .filter((o: any) => ['delivered'].includes(o.status))
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <PageHeader title="Returns & Refunds" subtitle="Request a return or refund for your orders" icon={RotateCcw} theme={t} />
      <Card className={`${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="No returnable orders"
              subtitle="Delivered orders will appear here for return/refund requests."
              theme={t}
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => (
                <div
                  key={order.id}
                  className={`flex items-center gap-4 rounded-xl border ${t.isDark ? 'border-amber-500/15 bg-stone-800/30' : 'border-amber-100 bg-amber-50/30'} p-3`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
                    {order.items?.[0]?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={order.items[0].image} alt={order.items[0].name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className={`h-5 w-5 ${t.textMuted}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${t.textPrimary}`}>
                      {order.items?.[0]?.name ?? 'Order'}
                    </p>
                    <p className={`font-mono text-xs ${t.textMuted}`}>
                      #{order.orderNumber ?? order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className={`mt-0.5 text-xs ${t.textMuted}`}>
                      Delivered: {fmtDate(order.deliveredAt ?? order.estimatedDelivery)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${t.cardBorder} ${t.accentText} hover:bg-amber-50 dark:hover:bg-amber-900/20`}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Request Return
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund policy quick link */}
      <Card className={`${t.cardBorder} ${t.cardBgSoft} shadow-sm`}>
        <CardContent className="flex items-center gap-3 p-4">
          <FileText className={`h-5 w-5 shrink-0 ${t.accentText}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${t.textPrimary}`}>Refund Policy</p>
            <p className={`text-xs ${t.textMuted}`}>Learn about our return window and refund process</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/* ── SHARED HELPERS                                              ── */
/* ─────────────────────────────────────────────────────────────── */

function PageHeader({ title, subtitle, icon: Icon, theme }: { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; theme: Theme }) {
  const t = theme
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.accentBg} ${t.accentText}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h1 className={`text-xl font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>{title}</h1>
        <p className={`mt-0.5 text-sm ${t.textMuted}`}>{subtitle}</p>
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon, title, subtitle, cta, theme,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  cta?: { label: string; onClick: () => void }
  theme: Theme
}) {
  const t = theme
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${t.accentBgSoft}`}>
        <Icon className={`h-7 w-7 ${t.accentText}`} />
      </div>
      <p className={`mt-3 text-sm font-semibold ${t.textPrimary}`}>{title}</p>
      <p className={`mt-1 text-xs ${t.textMuted}`}>{subtitle}</p>
      {cta && (
        <Button
          onClick={cta.onClick}
          size="sm"
          className="mt-4 luxury-accent-gradient-bg text-stone-950 font-semibold hover:opacity-90"
        >
          {cta.label}
        </Button>
      )}
    </div>
  )
}

/* ── Account Overview Card (full-width) ── */
function AccountOverviewCard({ setView, theme }: { setView: (v: any) => void; theme: Theme }) {
  const t = theme
  const items = [
    { icon: UserIcon, label: 'Account Details', desc: 'Manage your personal information', color: 'text-blue-500' },
    { icon: MapPinned, label: 'Address', desc: 'Manage shipping addresses', color: 'text-purple-500' },
    { icon: Ticket, label: 'Coupons', desc: 'View balance and usage', color: 'text-rose-500' },
    { icon: Bell, label: 'Notifications', desc: 'Manage email & SMS preferences', color: 'text-amber-500' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className={`relative overflow-hidden ${t.cardBorder} ${t.cardBg} shadow-sm ${t.shadowColor}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserIcon className={`h-4 w-4 ${t.accentText}`} />
            <CardTitle className={`text-base font-bold ${t.textPrimary}`} style={{ fontFamily: 'var(--font-lora), Lora, serif' }}>
              Account Overview
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setView('user-dashboard')}
                className={`group flex w-full items-center gap-3 rounded-xl border ${t.isDark ? 'border-amber-500/10 bg-stone-800/20' : 'border-amber-100/60 bg-amber-50/20'} p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.isDark ? 'bg-stone-800' : 'bg-stone-100'} ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${t.textPrimary}`}>{item.label}</p>
                  <p className={`truncate text-[11px] ${t.textMuted}`}>{item.desc}</p>
                </div>
                <ChevronRight className={`h-4 w-4 ${t.textMuted} opacity-50 transition-transform group-hover:translate-x-0.5`} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

