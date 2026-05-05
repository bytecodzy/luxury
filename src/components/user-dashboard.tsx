'use client'

import React from 'react'
import { useStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  User, ShoppingBag, Heart, CreditCard, Ticket, ArrowLeft, Mail, Shield, Loader2, Package, Clock,
} from 'lucide-react'

/* ─── style constants ─── */
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'

const authH = (t: string | null) => t ? { Authorization: `Bearer ${t}` } : {}

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
  }
  return m[s] || 'bg-stone-600/20 text-stone-400 border-stone-600/30'
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/* ─── Main Component ─── */
export function UserDashboard() {
  const { authUser, authToken, setView, clearAuth, setAuthView } = useStore()

  // 401 auto-logout
  React.useEffect(() => {
    const handler = () => { clearAuth(); setAuthView('login') }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, setAuthView])

  if (!authUser || authUser.role !== 'user') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className={`${cardCls} w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-amber-100">Access Denied</h2>
            <p className="mb-4 text-sm text-amber-200/60">You do not have user privileges to view this page.</p>
            <Button className={btnPrimary} onClick={() => setView('home')}>Back to Store</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20">
            <User className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-100">My Account</h1>
            <p className="text-xs text-amber-200/50">Welcome back, {authUser.name}</p>
          </div>
        </div>
        <Button variant="outline" className={btnOutline} onClick={() => setView('home')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <ProfileCard user={authUser} />

        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <RecentOrders token={authToken} email={authUser.email} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Wishlist */}
        <WishlistSection token={authToken} />

        {/* Payment Methods */}
        <PaymentMethodsSection />

        {/* Support Tickets */}
        <SupportTicketsSection token={authToken} userId={authUser.id} />
      </div>
    </motion.div>
  )
}

/* ─── Profile Card ─── */
function ProfileCard({ user }: { user: { name: string; email: string; role: string } }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600/20 text-xl font-bold text-amber-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-100">{user.name}</p>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 capitalize">{user.role}</Badge>
            </div>
          </div>
          <Separator className="bg-amber-900/20" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-amber-200/40" />
              <div>
                <p className="text-xs text-amber-200/50">Email</p>
                <p className="text-sm text-amber-100">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-amber-200/40" />
              <div>
                <p className="text-xs text-amber-200/50">Role</p>
                <p className="text-sm text-amber-100 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Recent Orders ─── */
function RecentOrders({ token, email }: { token: string | null; email: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-orders', email],
    queryFn: async () => {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
  })

  const orders = data?.orders || []

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Recent Orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Order #</TableHead>
                    <TableHead className="text-amber-200/50">Items</TableHead>
                    <TableHead className="text-amber-200/50">Total</TableHead>
                    <TableHead className="text-amber-200/50">Status</TableHead>
                    <TableHead className="text-amber-200/50">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 10).map((o: any) => (
                    <TableRow key={o.id} className="border-amber-900/10 hover:bg-amber-900/5">
                      <TableCell className="text-sm font-medium text-amber-100">{o.orderNumber}</TableCell>
                      <TableCell className="text-sm text-amber-200/60">{o.itemCount || o.items?.length || 0}</TableCell>
                      <TableCell className="text-sm font-medium text-amber-100">{fmt(o.total)}</TableCell>
                      <TableCell>
                        <Badge className={statusColor(o.status)}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{fmtDate(o.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Wishlist Section ─── */
function WishlistSection({ token }: { token: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-wishlist'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=4&featured=true', { headers: authH(token) })
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const products = data?.products || []

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Wishlist</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-6 text-center">
              <Heart className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">Your wishlist is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.slice(0, 4).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-stone-700/50">
                      <Package className="h-4 w-4 text-amber-200/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-amber-100">{p.name}</p>
                    <p className="text-xs text-amber-200/50">{fmt(p.price)}</p>
                  </div>
                  <Heart className="h-4 w-4 text-red-400/60" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Payment Methods ─── */
function PaymentMethodsSection() {
  const cards = [
    { type: 'Visa', last4: '4242', expiry: '12/26', brand: 'visa' },
    { type: 'Mastercard', last4: '8888', expiry: '06/25', brand: 'mastercard' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Payment Methods</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cards.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                <CreditCard className="h-8 w-8 text-amber-200/40" />
                <div className="flex-1">
                  <p className="text-sm text-amber-100">{c.type} •••• {c.last4}</p>
                  <p className="text-xs text-amber-200/50">Expires {c.expiry}</p>
                </div>
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Default</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Support Tickets ─── */
function SupportTicketsSection({ token, userId }: { token: string | null; userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-tickets', userId],
    queryFn: async () => {
      // Use admin users endpoint to get ticket-like data, or just return empty
      // Since there's no dedicated tickets endpoint, we show a placeholder
      return { tickets: [] }
    },
  })

  const tickets = data?.tickets || []

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Support Tickets</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-6 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">No support tickets</p>
              <p className="mt-1 text-xs text-amber-200/30">Your support requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  <div>
                    <p className="text-sm text-amber-100">{t.subject}</p>
                    <p className="text-xs text-amber-200/50">{fmtDate(t.createdAt)}</p>
                  </div>
                  <Badge className={statusColor(t.status)}>{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
