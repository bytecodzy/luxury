'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { PartnersTab } from '@/components/admin/partners-tab'
import {
  LayoutDashboard, Package, Warehouse, ShoppingBag, FileText, Calculator,
  Truck, Users, BookOpen, Share2, Tag, Import, Plus, Pencil, Trash2,
  Search, Upload, X, ChevronDown, AlertTriangle, Check, Loader2,
  Eye, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Box, UserCheck,
  Globe, ExternalLink, Image as ImageIcon, RefreshCw, Link2, ShoppingCart,
  Handshake,
} from 'lucide-react'

/* ─── style constants ─── */
const tabCls = 'data-[state=active]:bg-amber-600 data-[state=active]:text-stone-950 text-amber-200/60 text-xs'
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const inputCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100 placeholder:text-amber-200/30'
const lblCls = 'text-amber-200/60 text-xs'
const selCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100'
const selContentCls = 'border-amber-900/40 bg-stone-950'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'
const defCls = 'bg-stone-600/20 text-stone-400 border-stone-600/30'

const authH = (t: string | null) => t ? { Authorization: `Bearer ${t}` } : {}

async function apiFetch(url: string, opts: RequestInit = {}, token?: string | null) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...authH(token), ...opts.headers } })
  if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); throw new Error('Unauthorized') }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`) }
  return res.json()
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
    draft: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
    sent: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    paid: 'bg-green-600/20 text-green-400 border-green-600/30',
    approved: 'bg-green-600/20 text-green-400 border-green-600/30',
    rejected: 'bg-red-600/20 text-red-400 border-red-600/30',
    active: 'bg-green-600/20 text-green-400 border-green-600/30',
    inactive: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
  }
  return m[s] || defCls
}

const roleColor = (r: string) => {
  const m: Record<string, string> = {
    admin: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    user: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    agent: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    team: 'bg-green-600/20 text-green-400 border-green-600/30',
  }
  return m[r] || defCls
}

/* ─── Main Component ─── */
export function AdminDashboard() {
  const { authUser, authToken, setView, clearAuth, setAuthView } = useStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('dashboard')

  // 401 auto-logout
  useEffect(() => {
    const handler = () => { clearAuth(); setAuthView('login') }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, setAuthView])

  if (!authUser || authUser.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className={`${cardCls} w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-amber-100">Access Denied</h2>
            <p className="mb-4 text-sm text-amber-200/60">You do not have admin privileges to view this page.</p>
            <Button className={btnPrimary} onClick={() => setView('home')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const invalidateAll = () => qc.invalidateQueries()

  const tabItems = [
    { value: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { value: 'products', icon: Package, label: 'Products' },
    { value: 'inventory', icon: Warehouse, label: 'Inventory' },
    { value: 'orders', icon: ShoppingBag, label: 'Orders' },
    { value: 'invoices', icon: FileText, label: 'Invoices' },
    { value: 'accounting', icon: Calculator, label: 'Accounting' },
    { value: 'vendors', icon: Truck, label: 'Vendors' },
    { value: 'users', icon: Users, label: 'Users & Perms' },
    { value: 'content', icon: BookOpen, label: 'Content' },
    { value: 'sharedocs', icon: Share2, label: 'Share Docs' },
    { value: 'offers', icon: Tag, label: 'Offers' },
    { value: 'import', icon: Import, label: 'Import' },
    { value: 'integrations', icon: Globe, label: 'Integrations' },
    { value: 'partners', icon: Handshake, label: 'Partners' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20">
          <LayoutDashboard className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-amber-100">Admin Dashboard</h1>
          <p className="text-xs text-amber-200/50">3 BOXES LUXURY &mdash; Management Console</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className={roleColor('admin')}>Admin</Badge>
          <span className="text-xs text-amber-200/50">{authUser.email}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 overflow-x-auto">
          <TabsList className="inline-flex h-auto w-max gap-1 bg-stone-900/60 p-1">
            {tabItems.map(t => (
              <TabsTrigger key={t.value} value={t.value} className={tabCls}>
                <t.icon className="mr-1 h-3 w-3" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="dashboard"><DashboardTab token={authToken} /></TabsContent>
        <TabsContent value="products"><ProductsTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="inventory"><InventoryTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="orders"><OrdersTab token={authToken} /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="accounting"><AccountingTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="vendors"><VendorsTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="users"><UsersPermsTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="content"><ContentTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="sharedocs"><ShareDocsTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="offers"><OffersTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="import"><ImportTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="integrations"><IntegrationsTab token={authToken} onMutate={invalidateAll} /></TabsContent>
        <TabsContent value="partners"><PartnersTab token={authToken} onMutate={invalidateAll} /></TabsContent>
      </Tabs>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   1. DASHBOARD TAB
   ════════════════════════════════════════════ */
function DashboardTab({ token }: { token: string | null }) {
  const { data: productsData } = useQuery({ queryKey: ['admin-products'], queryFn: () => apiFetch('/api/admin/products?limit=1', undefined, token) })
  const { data: usersData } = useQuery({ queryKey: ['admin-users'], queryFn: () => apiFetch('/api/admin/users?limit=1', undefined, token) })
  const { data: ordersData } = useQuery({ queryKey: ['admin-orders'], queryFn: () => apiFetch('/api/admin/products?limit=1', undefined, token).then(() => fetch('/api/orders?email=admin@3boxes.com', { headers: authH(token) }).then(r => r.json()).catch(() => ({ orders: [] }))) })
  const { data: accountingData } = useQuery({ queryKey: ['accounting-summary'], queryFn: () => apiFetch('/api/accounting?limit=1', undefined, token) })

  const totalProducts = productsData?.pagination?.total || 0
  const totalUsers = usersData?.pagination?.total || 0
  const totalOrders = ordersData?.orders?.length || 0
  const totalRevenue = accountingData?.summary?.totalCredits || 0

  const { data: recentOrders } = useQuery({ queryKey: ['recent-orders'], queryFn: () => apiFetch('/api/admin/products?limit=5', undefined, token).catch(() => null) })

  const summaryCards = [
    { title: 'Total Revenue', value: fmt(totalRevenue), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-600/10' },
    { title: 'Total Orders', value: totalOrders.toString(), icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-600/10' },
    { title: 'Products', value: totalProducts.toString(), icon: Package, color: 'text-amber-400', bg: 'bg-amber-600/10' },
    { title: 'Users', value: totalUsers.toString(), icon: Users, color: 'text-purple-400', bg: 'bg-purple-600/10' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className={cardCls}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                  <div>
                    <p className={lblCls}>{c.title}</p>
                    <p className="text-lg font-bold text-amber-100">{c.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
              <p className={lblCls}>Account Balance</p>
              <p className="mt-1 text-lg font-bold text-amber-100">{fmt(accountingData?.summary?.balance || 0)}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                <TrendingUp className="h-3 w-3" /> Net position
              </div>
            </div>
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
              <p className={lblCls}>Total Credits</p>
              <p className="mt-1 text-lg font-bold text-green-400">{fmt(accountingData?.summary?.totalCredits || 0)}</p>
            </div>
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
              <p className={lblCls}>Total Debits</p>
              <p className="mt-1 text-lg font-bold text-red-400">{fmt(accountingData?.summary?.totalDebits || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   2. PRODUCTS TAB
   ════════════════════════════════════════════ */
function ProductsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search, page],
    queryFn: () => apiFetch(`/api/admin/products?search=${search}&page=${page}&limit=20`, undefined, token),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); onMutate(); setShowDelete(null) },
  })

  const products = data?.products || []
  const pagination = data?.pagination

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
          <Input className={`${inputCls} pl-9`} placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Button className={btnPrimary} onClick={() => { setEditProduct(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Product</TableHead>
                    <TableHead className="text-amber-200/50">SKU</TableHead>
                    <TableHead className="text-amber-200/50">Price</TableHead>
                    <TableHead className="text-amber-200/50">Stock</TableHead>
                    <TableHead className="text-amber-200/50">Category</TableHead>
                    <TableHead className="text-amber-200/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: any) => (
                    <TableRow key={p.id} className="border-amber-900/10 hover:bg-amber-900/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="h-8 w-8 rounded object-cover" />}
                          <div>
                            <p className="text-sm font-medium text-amber-100">{p.name}</p>
                            <p className="text-xs text-amber-200/40">{p.productNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{p.sku || '—'}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-amber-100">{fmt(p.price)}</p>
                        {p.compareAtPrice && <p className="text-xs text-amber-200/40 line-through">{fmt(p.compareAtPrice)}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge className={p.stock <= (p.reorderLevel || 5) ? 'bg-red-600/20 text-red-400 border-red-600/30' : 'bg-green-600/20 text-green-400 border-green-600/30'}>
                          {p.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{p.category?.name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditProduct(p); setShowForm(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(p)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No products found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
                <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <ProductForm token={token} product={editProduct} onClose={() => { setShowForm(false); setEditProduct(null) }} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-products'] }); onMutate(); setShowForm(false); setEditProduct(null) }} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-200/60">Are you sure you want to delete <strong className="text-amber-100">{showDelete?.name}</strong>?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Product Form ─── */
function ProductForm({ token, product, onClose, onSaved }: { token: string | null; product: any; onClose: () => void; onSaved: () => void }) {
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => apiFetch('/api/categories', undefined, token) })
  const { data: vendorsData } = useQuery({ queryKey: ['vendors'], queryFn: () => apiFetch('/api/vendors', undefined, token) })

  const categories = categoriesData?.categories || []
  const vendors = vendorsData?.vendors || []

  const [form, setForm] = useState({
    name: '', description: '', price: '', compareAtPrice: '', costPrice: '', sku: '',
    categoryId: '', stock: '0', reorderLevel: '5', featured: false, tags: '', vendorId: '',
  })
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '', description: product.description || '', price: String(product.price || ''),
        compareAtPrice: String(product.compareAtPrice || ''), costPrice: String(product.costPrice || ''),
        sku: product.sku || '', categoryId: product.categoryId || '', stock: String(product.stock || 0),
        reorderLevel: String(product.reorderLevel || 5), featured: product.featured || false,
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '', vendorId: product.vendorId || '',
      })
      setImages(Array.isArray(product.images) ? product.images : [])
    }
  }, [product])

  const handleUpload = async (files: FileList) => {
    const remaining = 3 - images.length
    if (remaining <= 0) return
    const toUpload = Array.from(files).slice(0, remaining)
    setUploading(true)
    try {
      const fd = new FormData()
      toUpload.forEach(f => fd.append('files', f))
      const res = await fetch('/api/upload', { method: 'POST', headers: authH(token), body: fd })
      if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); return }
      const data = await res.json()
      if (data.urls) setImages(prev => [...prev, ...data.urls].slice(0, 3))
      else throw new Error(data.error || 'Upload failed')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files) }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handleUpload(e.target.files) }

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.categoryId) { setError('Name, price, and category are required'); return }
    setSaving(true); setError('')
    try {
      const body = {
        ...form,
        price: parseFloat(form.price),
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        stock: parseInt(form.stock),
        reorderLevel: parseInt(form.reorderLevel),
        images,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        vendorId: form.vendorId || null,
      }
      if (product) {
        await apiFetch(`/api/admin/products/${product.id}`, { method: 'PUT', body: JSON.stringify(body) }, token)
      } else {
        await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }, token)
      }
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      {/* Image Upload */}
      <div>
        <Label className={lblCls}>Images (max 3)</Label>
        <div
          className={`mt-1 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${dragOver ? 'border-amber-400 bg-amber-900/10' : 'border-amber-900/30 bg-stone-800/30'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          {uploading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-400" />
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-amber-200/30" />
              <p className="mt-2 text-xs text-amber-200/40">Drag & drop or click to upload (max 3 images, 5MB each)</p>
            </>
          )}
        </div>
        {images.length > 0 && (
          <div className="mt-2 flex gap-2">
            {images.map((img, i) => (
              <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-amber-900/30">
                <img src={img} alt="" className="h-full w-full object-cover" />
                <button className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl bg-red-600/80 text-white opacity-0 group-hover:opacity-100" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><Label className={lblCls}>SKU</Label><Input className={`${inputCls} mt-1`} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
        <div><Label className={lblCls}>Price *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
        <div><Label className={lblCls}>Compare At Price</Label><Input type="number" className={`${inputCls} mt-1`} value={form.compareAtPrice} onChange={e => setForm(f => ({ ...f, compareAtPrice: e.target.value }))} /></div>
        <div><Label className={lblCls}>Cost Price</Label><Input type="number" className={`${inputCls} mt-1`} value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
        <div>
          <Label className={lblCls}>Category *</Label>
          <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Stock</Label><Input type="number" className={`${inputCls} mt-1`} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
        <div><Label className={lblCls}>Reorder Level</Label><Input type="number" className={`${inputCls} mt-1`} value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))} /></div>
        <div>
          <Label className={lblCls}>Vendor</Label>
          <Select value={form.vendorId} onValueChange={v => setForm(f => ({ ...f, vendorId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="none">None</SelectItem>
              {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Tags (comma separated)</Label><Input className={`${inputCls} mt-1`} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
      </div>
      <div>
        <Label className={lblCls}>Description</Label>
        <Textarea className={`${inputCls} mt-1`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.featured} onCheckedChange={v => setForm(f => ({ ...f, featured: v }))} />
        <Label className={lblCls}>Featured Product</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{product ? 'Update' : 'Create'} Product
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   3. INVENTORY TAB
   ════════════════════════════════════════════ */
function InventoryTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, typeFilter],
    queryFn: () => apiFetch(`/api/inventory?page=${page}&limit=20${typeFilter ? `&type=${typeFilter}` : ''}`, undefined, token),
  })

  const { data: productsData } = useQuery({ queryKey: ['admin-products-low'], queryFn: () => apiFetch('/api/admin/products?limit=50', undefined, token) })
  const lowStockProducts = (productsData?.products || []).filter((p: any) => p.stock <= (p.reorderLevel || 5))

  const logs = data?.logs || []
  const pagination = data?.pagination

  return (
    <div className="space-y-4">
      {lowStockProducts.length > 0 && (
        <Card className="border-red-900/30 bg-red-950/30">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">Low Stock Alerts</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((p: any) => (
                <Badge key={p.id} className="bg-red-600/20 text-red-400 border-red-600/30">
                  {p.name} — {p.stock} left
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-40`}><SelectValue placeholder="Filter type" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="in">Stock In</SelectItem>
            <SelectItem value="out">Stock Out</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="return">Return</SelectItem>
          </SelectContent>
        </Select>
        <Button className={btnPrimary} onClick={() => setShowAdjust(true)}>
          <Plus className="mr-1 h-4 w-4" /> Adjust Stock
        </Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Date</TableHead>
                  <TableHead className="text-amber-200/50">Product</TableHead>
                  <TableHead className="text-amber-200/50">Type</TableHead>
                  <TableHead className="text-amber-200/50">Qty</TableHead>
                  <TableHead className="text-amber-200/50">Current Stock</TableHead>
                  <TableHead className="text-amber-200/50">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell className="text-xs text-amber-200/60">{fmtDateTime(l.createdAt)}</TableCell>
                    <TableCell>
                      <p className="text-sm text-amber-100">{l.product?.name}</p>
                      <p className="text-xs text-amber-200/40">{l.product?.productNumber}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(l.type === 'in' || l.type === 'return' ? 'active' : l.type === 'out' ? 'cancelled' : 'pending')}>
                        {l.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-amber-100">{l.quantity}</TableCell>
                    <TableCell className="text-sm text-amber-100">{l.product?.stock}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-amber-200/40">{l.note || '—'}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No inventory logs</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
              <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Adjust Stock</DialogTitle></DialogHeader>
          <StockAdjustForm token={token} onClose={() => setShowAdjust(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['inventory'] }); onMutate(); setShowAdjust(false) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StockAdjustForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const { data: productsData } = useQuery({ queryKey: ['admin-products-all'], queryFn: () => apiFetch('/api/admin/products?limit=100', undefined, token) })
  const products = productsData?.products || []
  const [form, setForm] = useState({ productId: '', type: 'in', quantity: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.productId || !form.type || !form.quantity) { setError('All fields required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(form) }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div>
        <Label className={lblCls}>Product *</Label>
        <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className={lblCls}>Type *</Label>
        <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="in">Stock In</SelectItem>
            <SelectItem value="out">Stock Out</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="return">Return</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label className={lblCls}>Quantity *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
      <div><Label className={lblCls}>Note</Label><Input className={`${inputCls} mt-1`} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Adjust</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   4. ORDERS TAB
   ════════════════════════════════════════════ */
function OrdersTab({ token }: { token: string | null }) {
  const [page, setPage] = useState(1)
  const [viewOrder, setViewOrder] = useState<any>(null)

  // Using the orders endpoint - need admin access for all orders
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: async () => {
      const res = await fetch('/api/orders?email=all', { headers: authH(token) })
      if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); throw new Error('Unauthorized') }
      return res.json()
    },
  })

  const orders = data?.orders || []

  return (
    <div className="space-y-4">
      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Order #</TableHead>
                  <TableHead className="text-amber-200/50">Customer</TableHead>
                  <TableHead className="text-amber-200/50">Total</TableHead>
                  <TableHead className="text-amber-200/50">Status</TableHead>
                  <TableHead className="text-amber-200/50">Payment</TableHead>
                  <TableHead className="text-amber-200/50">Date</TableHead>
                  <TableHead className="text-amber-200/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: any) => (
                  <TableRow key={o.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell className="text-sm font-medium text-amber-100">{o.orderNumber}</TableCell>
                    <TableCell>
                      <p className="text-sm text-amber-100">{o.firstName} {o.lastName}</p>
                      <p className="text-xs text-amber-200/40">{o.email}</p>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-amber-100">{fmt(o.total)}</TableCell>
                    <TableCell><Badge className={statusColor(o.status)}>{o.status}</Badge></TableCell>
                    <TableCell><Badge className={statusColor(o.paymentStatus)}>{o.paymentStatus}</Badge></TableCell>
                    <TableCell className="text-xs text-amber-200/60">{fmtDate(o.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => setViewOrder(o)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No orders found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Order {viewOrder?.orderNumber}</DialogTitle></DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className={lblCls}>Customer</p><p className="text-sm text-amber-100">{viewOrder.firstName} {viewOrder.lastName}</p></div>
                <div><p className={lblCls}>Email</p><p className="text-sm text-amber-100">{viewOrder.email}</p></div>
                <div><p className={lblCls}>Status</p><Badge className={statusColor(viewOrder.status)}>{viewOrder.status}</Badge></div>
                <div><p className={lblCls}>Payment</p><Badge className={statusColor(viewOrder.paymentStatus)}>{viewOrder.paymentStatus}</Badge></div>
                <div><p className={lblCls}>Subtotal</p><p className="text-sm text-amber-100">{fmt(viewOrder.subtotal)}</p></div>
                <div><p className={lblCls}>Shipping</p><p className="text-sm text-amber-100">{fmt(viewOrder.shipping)}</p></div>
                <div><p className={lblCls}>Tax</p><p className="text-sm text-amber-100">{fmt(viewOrder.tax)}</p></div>
                <div><p className={lblCls}>Total</p><p className="text-sm font-bold text-amber-100">{fmt(viewOrder.total)}</p></div>
              </div>
              <Separator className="bg-amber-900/20" />
              <div>
                <p className={`mb-2 ${lblCls}`}>Address</p>
                <p className="text-sm text-amber-100">{viewOrder.address}, {viewOrder.city}, {viewOrder.state} {viewOrder.zipCode}</p>
              </div>
              {viewOrder.items?.length > 0 && (
                <div>
                  <p className={`mb-2 ${lblCls}`}>Items</p>
                  {viewOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 border-b border-amber-900/10 py-2">
                      {item.image && <img src={item.image} alt="" className="h-8 w-8 rounded object-cover" />}
                      <div className="flex-1">
                        <p className="text-sm text-amber-100">{item.name}</p>
                        <p className="text-xs text-amber-200/40">Qty: {item.quantity} × {fmt(item.price)}</p>
                      </div>
                      <p className="text-sm text-amber-100">{fmt(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ════════════════════════════════════════════
   5. INVOICES TAB
   ════════════════════════════════════════════ */
function InvoicesTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, statusFilter],
    queryFn: () => apiFetch(`/api/invoices?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`, undefined, token),
  })

  const invoices = data?.invoices || []
  const pagination = data?.pagination

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiFetch(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); onMutate() },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-40`}><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button className={btnPrimary} onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> Create Invoice</Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Invoice #</TableHead>
                  <TableHead className="text-amber-200/50">Vendor</TableHead>
                  <TableHead className="text-amber-200/50">Amount</TableHead>
                  <TableHead className="text-amber-200/50">Tax</TableHead>
                  <TableHead className="text-amber-200/50">Total</TableHead>
                  <TableHead className="text-amber-200/50">Status</TableHead>
                  <TableHead className="text-amber-200/50">Due Date</TableHead>
                  <TableHead className="text-amber-200/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell className="text-sm font-medium text-amber-100">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm text-amber-200/60">{inv.vendor?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-amber-100">{fmt(inv.amount)}</TableCell>
                    <TableCell className="text-sm text-amber-200/60">{fmt(inv.tax)}</TableCell>
                    <TableCell className="text-sm font-medium text-amber-100">{fmt(inv.total)}</TableCell>
                    <TableCell><Badge className={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-xs text-amber-200/60">{inv.dueDate ? fmtDate(inv.dueDate) : '—'}</TableCell>
                    <TableCell>
                      {inv.status === 'draft' && (
                        <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => updateStatusMut.mutate({ id: inv.id, status: 'sent' })}>Send</Button>
                      )}
                      {inv.status === 'sent' && (
                        <Button size="sm" variant="ghost" className="h-7 text-green-400/40 hover:text-green-400" onClick={() => updateStatusMut.mutate({ id: inv.id, status: 'paid' })}>Mark Paid</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-amber-200/40">No invoices</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
              <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Create Invoice</DialogTitle></DialogHeader>
          <InvoiceForm token={token} onClose={() => setShowCreate(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['invoices'] }); onMutate(); setShowCreate(false) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InvoiceForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const { data: vendorsData } = useQuery({ queryKey: ['vendors'], queryFn: () => apiFetch('/api/vendors', undefined, token) })
  const vendors = vendorsData?.vendors || []
  const [form, setForm] = useState({ vendorId: '', amount: '', tax: '0', dueDate: '', notes: '', status: 'draft' })
  const [items, setItems] = useState([{ description: '', quantity: '1', unitPrice: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: '1', unitPrice: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, j) => j !== i))
  const updateItem = (i: number, field: string, value: string) => setItems(prev => prev.map((item, j) => j === i ? { ...item, [field]: value } : item))

  const handleSubmit = async () => {
    if (!form.amount) { setError('Amount is required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          tax: parseFloat(form.tax),
          vendorId: form.vendorId || null,
          items: items.filter(i => i.description && i.unitPrice).map(i => ({
            description: i.description, quantity: parseInt(i.quantity) || 1, unitPrice: parseFloat(i.unitPrice),
          })),
        }),
      }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={lblCls}>Vendor</Label>
          <Select value={form.vendorId} onValueChange={v => setForm(f => ({ ...f, vendorId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="none">None</SelectItem>
              {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Amount *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
        <div><Label className={lblCls}>Tax</Label><Input type="number" className={`${inputCls} mt-1`} value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} /></div>
        <div><Label className={lblCls}>Due Date</Label><Input type="date" className={`${inputCls} mt-1`} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
      </div>
      <div><Label className={lblCls}>Notes</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      <Separator className="bg-amber-900/20" />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className={lblCls}>Line Items</Label>
          <Button size="sm" variant="ghost" className="text-amber-200/40 hover:text-amber-400" onClick={addItem}><Plus className="mr-1 h-3 w-3" />Add</Button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <Input className={`${inputCls} flex-1`} placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
            <Input type="number" className={`${inputCls} w-20`} placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
            <Input type="number" className={`${inputCls} w-24`} placeholder="Price" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
            {items.length > 1 && <Button size="sm" variant="ghost" className="text-red-400/40 hover:text-red-400" onClick={() => removeItem(i)}><X className="h-4 w-4" /></Button>}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   6. ACCOUNTING TAB
   ════════════════════════════════════════════ */
function AccountingTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['accounting', page, typeFilter, catFilter],
    queryFn: () => apiFetch(`/api/accounting?page=${page}&limit=20${typeFilter ? `&type=${typeFilter}` : ''}${catFilter ? `&category=${catFilter}` : ''}`, undefined, token),
  })

  const entries = data?.entries || []
  const summary = data?.summary
  const pagination = data?.pagination

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className={cardCls}>
            <CardContent className="p-4">
              <p className={lblCls}>Total Credits</p>
              <p className="text-lg font-bold text-green-400">{fmt(summary.totalCredits)}</p>
            </CardContent>
          </Card>
          <Card className={cardCls}>
            <CardContent className="p-4">
              <p className={lblCls}>Total Debits</p>
              <p className="text-lg font-bold text-red-400">{fmt(summary.totalDebits)}</p>
            </CardContent>
          </Card>
          <Card className={cardCls}>
            <CardContent className="p-4">
              <p className={lblCls}>Balance</p>
              <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(summary.balance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-36`}><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="debit">Debit</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={v => { setCatFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-36`}><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="refund">Refund</SelectItem>
            <SelectItem value="tax">Tax</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Button className={btnPrimary} onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> New Entry</Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Entry #</TableHead>
                  <TableHead className="text-amber-200/50">Date</TableHead>
                  <TableHead className="text-amber-200/50">Type</TableHead>
                  <TableHead className="text-amber-200/50">Category</TableHead>
                  <TableHead className="text-amber-200/50">Amount</TableHead>
                  <TableHead className="text-amber-200/50">Balance</TableHead>
                  <TableHead className="text-amber-200/50">Description</TableHead>
                  <TableHead className="text-amber-200/50">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e: any) => (
                  <TableRow key={e.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell className="text-sm font-medium text-amber-100">{e.entryNumber}</TableCell>
                    <TableCell className="text-xs text-amber-200/60">{fmtDate(e.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {e.type === 'credit' ? <ArrowUpRight className="h-3 w-3 text-green-400" /> : <ArrowDownRight className="h-3 w-3 text-red-400" />}
                        <span className={`text-sm ${e.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>{e.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-amber-200/60 capitalize">{e.category}</TableCell>
                    <TableCell className={`text-sm font-medium ${e.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>{fmt(e.amount)}</TableCell>
                    <TableCell className={`text-sm font-medium ${e.runningBalance >= 0 ? 'text-amber-100' : 'text-red-400'}`}>{fmt(e.runningBalance)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-amber-200/40">{e.description}</TableCell>
                    <TableCell className="text-xs text-amber-200/40">{e.reference || '—'}</TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-amber-200/40">No entries</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
              <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">New Account Entry</DialogTitle></DialogHeader>
          <AccountEntryForm token={token} onClose={() => setShowCreate(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['accounting'] }); onMutate(); setShowCreate(false) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountEntryForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ type: 'credit', category: 'sales', amount: '', description: '', reference: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.type || !form.category || !form.amount || !form.description) { setError('All fields required except reference'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/accounting', { method: 'POST', body: JSON.stringify(form) }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={lblCls}>Type *</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lblCls}>Category *</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="tax">Tax</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className={lblCls}>Amount *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
      <div><Label className={lblCls}>Description *</Label><Input className={`${inputCls} mt-1`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div><Label className={lblCls}>Reference</Label><Input className={`${inputCls} mt-1`} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create Entry</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   7. VENDORS TAB
   ════════════════════════════════════════════ */
function VendorsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editVendor, setEditVendor] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', search],
    queryFn: () => apiFetch(`/api/vendors?search=${search}&limit=50`, undefined, token),
  })

  const vendors = data?.vendors || []

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/vendors/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); onMutate(); setShowDelete(null) },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
          <Input className={`${inputCls} pl-9`} placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button className={btnPrimary} onClick={() => { setEditVendor(null); setShowForm(true) }}><Plus className="mr-1 h-4 w-4" /> Add Vendor</Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Vendor</TableHead>
                  <TableHead className="text-amber-200/50">Contact</TableHead>
                  <TableHead className="text-amber-200/50">GST Number</TableHead>
                  <TableHead className="text-amber-200/50">Status</TableHead>
                  <TableHead className="text-amber-200/50">Products</TableHead>
                  <TableHead className="text-amber-200/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v: any) => (
                  <TableRow key={v.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell>
                      <p className="text-sm font-medium text-amber-100">{v.name}</p>
                      <p className="text-xs text-amber-200/40">{v.email || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-amber-200/60">{v.contactName || '—'}</p>
                      <p className="text-xs text-amber-200/40">{v.phone || '—'}</p>
                    </TableCell>
                    <TableCell className="text-xs text-amber-200/60">{v.gstNumber || '—'}</TableCell>
                    <TableCell><Badge className={statusColor(v.isActive ? 'active' : 'inactive')}>{v.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-sm text-amber-200/60">{v._count?.products || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditVendor(v); setShowForm(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(v)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No vendors</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">{editVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle></DialogHeader>
          <VendorForm token={token} vendor={editVendor} onClose={() => { setShowForm(false); setEditVendor(null) }} onSaved={() => { qc.invalidateQueries({ queryKey: ['vendors'] }); onMutate(); setShowForm(false); setEditVendor(null) }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Delete Vendor</DialogTitle></DialogHeader>
          <p className="text-sm text-amber-200/60">Delete <strong className="text-amber-100">{showDelete?.name}</strong>?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending}>{deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VendorForm({ token, vendor, onClose, onSaved }: { token: string | null; vendor: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', address: '', gstNumber: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (vendor) setForm({ name: vendor.name || '', contactName: vendor.contactName || '', email: vendor.email || '', phone: vendor.phone || '', address: vendor.address || '', gstNumber: vendor.gstNumber || '', isActive: vendor.isActive ?? true })
  }, [vendor])

  const handleSubmit = async () => {
    if (!form.name) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      if (vendor) {
        await apiFetch(`/api/vendors/${vendor.id}`, { method: 'PUT', body: JSON.stringify(form) }, token)
      } else {
        await apiFetch('/api/vendors', { method: 'POST', body: JSON.stringify(form) }, token)
      }
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><Label className={lblCls}>Contact Name</Label><Input className={`${inputCls} mt-1`} value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} /></div>
        <div><Label className={lblCls}>Email</Label><Input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><Label className={lblCls}>Phone</Label><Input className={`${inputCls} mt-1`} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      </div>
      <div><Label className={lblCls}>Address</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
      <div><Label className={lblCls}>GST Number</Label><Input className={`${inputCls} mt-1`} value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))} /></div>
      <div className="flex items-center gap-2">
        <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
        <Label className={lblCls}>Active</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{vendor ? 'Update' : 'Create'}</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   8. USERS & PERMS TAB
   ════════════════════════════════════════════ */
function UsersPermsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showPerms, setShowPerms] = useState<any>(null)
  const [showAddUser, setShowAddUser] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => apiFetch(`/api/admin/users?search=${search}&page=${page}&limit=20`, undefined, token),
  })

  const users = data?.users || []
  const pagination = data?.pagination

  const approveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ approvalStatus: status }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onMutate() },
  })

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onMutate() },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
          <Input className={`${inputCls} pl-9`} placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Button className={btnPrimary} onClick={() => setShowAddUser(true)}><Plus className="mr-1 h-4 w-4" /> Add User</Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">User</TableHead>
                  <TableHead className="text-amber-200/50">Role</TableHead>
                  <TableHead className="text-amber-200/50">Approval</TableHead>
                  <TableHead className="text-amber-200/50">Active</TableHead>
                  <TableHead className="text-amber-200/50">Joined</TableHead>
                  <TableHead className="text-amber-200/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell>
                      <p className="text-sm font-medium text-amber-100">{u.name}</p>
                      <p className="text-xs text-amber-200/40">{u.email}</p>
                    </TableCell>
                    <TableCell><Badge className={roleColor(u.role)}>{u.role}</Badge></TableCell>
                    <TableCell><Badge className={statusColor(u.approvalStatus)}>{u.approvalStatus}</Badge></TableCell>
                    <TableCell>
                      <Switch checked={u.isActive} onCheckedChange={v => toggleActiveMut.mutate({ id: u.id, isActive: v })} />
                    </TableCell>
                    <TableCell className="text-xs text-amber-200/60">{fmtDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {u.approvalStatus === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-green-400/40 hover:text-green-400" onClick={() => approveMut.mutate({ id: u.id, status: 'approved' })}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 text-red-400/40 hover:text-red-400" onClick={() => approveMut.mutate({ id: u.id, status: 'rejected' })}><X className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => setShowPerms(u)}>
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No users</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
              <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Matrix Dialog */}
      <Dialog open={!!showPerms} onOpenChange={() => setShowPerms(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Permissions — {showPerms?.name}</DialogTitle></DialogHeader>
          {showPerms && <PermissionMatrix token={token} user={showPerms} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onMutate() }} />}
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Add User</DialogTitle></DialogHeader>
          <AddUserForm token={token} onClose={() => setShowAddUser(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onMutate(); setShowAddUser(false) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PermissionMatrix({ token, user, onSaved }: { token: string | null; user: any; onSaved: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['permissions', user.id],
    queryFn: () => apiFetch(`/api/admin/permissions?userId=${user.id}`, undefined, token),
  })

  const modules = ['products', 'orders', 'inventory', 'invoices', 'accounting', 'vendors', 'users', 'content', 'offers']
  const actions = ['read', 'write', 'edit', 'delete']
  const [perms, setPerms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.permissions) setPerms(data.permissions)
  }, [data])

  const togglePerm = (module: string, action: string) => {
    const key = `${module}.${action}`
    setPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/admin/permissions', { method: 'POST', body: JSON.stringify({ userId: user.id, permissions: perms }) }, token)
      onSaved()
    } catch (e: any) { console.error(e) } finally { setSaving(false) }
  }

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-amber-900/20 hover:bg-transparent">
              <TableHead className="text-amber-200/50">Module</TableHead>
              {actions.map(a => <TableHead key={a} className="text-center text-amber-200/50 capitalize">{a}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map(mod => (
              <TableRow key={mod} className="border-amber-900/10 hover:bg-amber-900/5">
                <TableCell className="capitalize text-amber-100">{mod}</TableCell>
                {actions.map(act => (
                  <TableCell key={act} className="text-center">
                    <Checkbox
                      checked={perms.includes(`${mod}.${act}`)}
                      onCheckedChange={() => togglePerm(mod, act)}
                      className="border-amber-900/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button className={btnPrimary} onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save Permissions</Button>
      </div>
    </div>
  )
}

function AddUserForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.email || !form.name || !form.password) { setError('All fields required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ ...form, approvalStatus: 'approved', isActive: true }) }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div><Label className={lblCls}>Email *</Label><Input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
      <div><Label className={lblCls}>Password *</Label><Input type="password" className={`${inputCls} mt-1`} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
      <div>
        <Label className={lblCls}>Role</Label>
        <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   9. CONTENT TAB (Wiki Documents)
   ════════════════════════════════════════════ */
function ContentTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editDoc, setEditDoc] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['wiki-docs'],
    queryFn: () => apiFetch('/api/admin/users?limit=1', undefined, token).then(() => ({ docs: [] })), // placeholder - wiki docs API
  })

  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        // Since there's no specific wiki docs list endpoint, we'll use a simple state
        setLoading(false)
      } catch { setLoading(false) }
    }
    fetchDocs()
  }, [token])

  const [form, setForm] = useState({ title: '', content: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Simple local CRUD for wiki docs since there's no dedicated endpoint
  const handleSave = async () => {
    if (!form.title || !form.content) { setError('Title and content required'); return }
    setSaving(true); setError('')
    try {
      // Using the wiki document creation through the database directly is not available
      // So we'll maintain a simple local state
      const newDoc = editDoc
        ? { ...editDoc, ...form, updatedAt: new Date().toISOString() }
        : { id: `doc-${Date.now()}`, ...form, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }

      if (editDoc) {
        setDocs(prev => prev.map(d => d.id === editDoc.id ? newDoc : d))
      } else {
        setDocs(prev => [newDoc, ...prev])
      }
      setShowForm(false); setEditDoc(null); setForm({ title: '', content: '', category: '' })
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button className={btnPrimary} onClick={() => { setEditDoc(null); setForm({ title: '', content: '', category: '' }); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> New Document
        </Button>
      </div>

      {showForm && (
        <Card className={cardCls}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-amber-100">{editDoc ? 'Edit Document' : 'New Document'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
            <div><Label className={lblCls}>Title *</Label><Input className={`${inputCls} mt-1`} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label className={lblCls}>Category</Label><Input className={`${inputCls} mt-1`} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div><Label className={lblCls}>Content *</Label><Textarea className={`${inputCls} mt-1`} rows={8} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className={btnOutline} onClick={() => { setShowForm(false); setEditDoc(null) }}>Cancel</Button>
              <Button className={btnPrimary} onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={cardCls}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-900/20 hover:bg-transparent">
                <TableHead className="text-amber-200/50">Title</TableHead>
                <TableHead className="text-amber-200/50">Category</TableHead>
                <TableHead className="text-amber-200/50">Updated</TableHead>
                <TableHead className="text-amber-200/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d: any) => (
                <TableRow key={d.id} className="border-amber-900/10 hover:bg-amber-900/5">
                  <TableCell className="text-sm font-medium text-amber-100">{d.title}</TableCell>
                  <TableCell className="text-xs text-amber-200/60">{d.category || '—'}</TableCell>
                  <TableCell className="text-xs text-amber-200/60">{fmtDate(d.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditDoc(d); setForm({ title: d.title, content: d.content, category: d.category || '' }); setShowForm(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-400/40 hover:text-red-400" onClick={() => setDocs(prev => prev.filter(x => x.id !== d.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {docs.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-amber-200/40">No documents yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   10. SHARE DOCS TAB
   ════════════════════════════════════════════ */
function ShareDocsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const { data: usersData } = useQuery({ queryKey: ['admin-users-agents'], queryFn: () => apiFetch('/api/admin/users?role=agent&limit=100', undefined, token) })
  const agents = (usersData?.users || []).filter((u: any) => u.role === 'agent')

  const [shares, setShares] = useState<any[]>([])
  const [form, setForm] = useState({ agentId: '', docId: '', docTitle: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleShare = async () => {
    if (!form.agentId || !form.docId) { setError('Agent and document ID are required'); return }
    setSaving(true); setError('')
    try {
      const newShare = {
        id: `share-${Date.now()}`,
        agentId: form.agentId,
        agentName: agents.find((a: any) => a.id === form.agentId)?.name || 'Unknown',
        docId: form.docId,
        docTitle: form.docTitle || form.docId,
        sharedBy: 'admin',
        createdAt: new Date().toISOString(),
      }
      setShares(prev => [newShare, ...prev])
      setForm({ agentId: '', docId: '', docTitle: '' })
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-amber-100">Share Document with Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className={lblCls}>Agent *</Label>
              <Select value={form.agentId} onValueChange={v => setForm(f => ({ ...f, agentId: v }))}>
                <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent className={selContentCls}>
                  {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className={lblCls}>Document ID *</Label><Input className={`${inputCls} mt-1`} value={form.docId} onChange={e => setForm(f => ({ ...f, docId: e.target.value }))} /></div>
            <div><Label className={lblCls}>Document Title</Label><Input className={`${inputCls} mt-1`} value={form.docTitle} onChange={e => setForm(f => ({ ...f, docTitle: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end">
            <Button className={btnPrimary} onClick={handleShare} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Share</Button>
          </div>
        </CardContent>
      </Card>

      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-amber-100">Shared Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-900/20 hover:bg-transparent">
                <TableHead className="text-amber-200/50">Document</TableHead>
                <TableHead className="text-amber-200/50">Agent</TableHead>
                <TableHead className="text-amber-200/50">Shared On</TableHead>
                <TableHead className="text-amber-200/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shares.map((s: any) => (
                <TableRow key={s.id} className="border-amber-900/10 hover:bg-amber-900/5">
                  <TableCell>
                    <p className="text-sm text-amber-100">{s.docTitle}</p>
                    <p className="text-xs text-amber-200/40">{s.docId}</p>
                  </TableCell>
                  <TableCell className="text-sm text-amber-200/60">{s.agentName}</TableCell>
                  <TableCell className="text-xs text-amber-200/60">{fmtDate(s.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-red-400/40 hover:text-red-400" onClick={() => setShares(prev => prev.filter(x => x.id !== s.id))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {shares.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-amber-200/40">No shared documents</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   11. OFFERS TAB
   ════════════════════════════════════════════ */
function OffersTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const [offers, setOffers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editOffer, setEditOffer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const { data: productsData } = useQuery({ queryKey: ['admin-products-quick'], queryFn: () => apiFetch('/api/admin/products?limit=1', undefined, token) })

  // Since there's no dedicated offers API endpoint, maintain local state
  useEffect(() => { setLoading(false) }, [])

  const [form, setForm] = useState({
    title: '', description: '', code: '', type: 'percentage', value: '',
    minOrder: '', maxDiscount: '', validFrom: '', validTo: '', isActive: true, usageLimit: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editOffer) {
      setForm({
        title: editOffer.title || '', description: editOffer.description || '',
        code: editOffer.code || '', type: editOffer.type || 'percentage',
        value: String(editOffer.value || ''), minOrder: String(editOffer.minOrder || ''),
        maxDiscount: String(editOffer.maxDiscount || ''),
        validFrom: editOffer.validFrom ? new Date(editOffer.validFrom).toISOString().split('T')[0] : '',
        validTo: editOffer.validTo ? new Date(editOffer.validTo).toISOString().split('T')[0] : '',
        isActive: editOffer.isActive ?? true, usageLimit: String(editOffer.usageLimit || ''),
      })
    }
  }, [editOffer])

  const handleSave = async () => {
    if (!form.title || !form.code || !form.value) { setError('Title, code, and value are required'); return }
    setSaving(true); setError('')
    try {
      const offerData = {
        ...form,
        value: parseFloat(form.value),
        minOrder: form.minOrder ? parseFloat(form.minOrder) : null,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : new Date().toISOString(),
        validTo: form.validTo ? new Date(form.validTo).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      }

      if (editOffer) {
        setOffers(prev => prev.map(o => o.id === editOffer.id ? { ...editOffer, ...offerData, updatedAt: new Date().toISOString() } : o))
      } else {
        const newOffer = { id: `offer-${Date.now()}`, ...offerData, usedCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        setOffers(prev => [newOffer, ...prev])
      }
      setShowForm(false); setEditOffer(null)
      setForm({ title: '', description: '', code: '', type: 'percentage', value: '', minOrder: '', maxDiscount: '', validFrom: '', validTo: '', isActive: true, usageLimit: '' })
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const toggleActive = (id: string) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button className={btnPrimary} onClick={() => { setEditOffer(null); setForm({ title: '', description: '', code: '', type: 'percentage', value: '', minOrder: '', maxDiscount: '', validFrom: '', validTo: '', isActive: true, usageLimit: '' }); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Create Offer
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">{editOffer ? 'Edit Offer' : 'Create Offer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={lblCls}>Title *</Label><Input className={`${inputCls} mt-1`} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label className={lblCls}>Code *</Label><Input className={`${inputCls} mt-1 uppercase`} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
              <div>
                <Label className={lblCls}>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
                  <SelectContent className={selContentCls}>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className={lblCls}>Value *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div><Label className={lblCls}>Min Order</Label><Input type="number" className={`${inputCls} mt-1`} value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} /></div>
              <div><Label className={lblCls}>Max Discount</Label><Input type="number" className={`${inputCls} mt-1`} value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} /></div>
              <div><Label className={lblCls}>Valid From</Label><Input type="date" className={`${inputCls} mt-1`} value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))} /></div>
              <div><Label className={lblCls}>Valid To</Label><Input type="date" className={`${inputCls} mt-1`} value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))} /></div>
              <div><Label className={lblCls}>Usage Limit</Label><Input type="number" className={`${inputCls} mt-1`} value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} /></div>
            </div>
            <div><Label className={lblCls}>Description</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <Label className={lblCls}>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className={btnOutline} onClick={() => { setShowForm(false); setEditOffer(null) }}>Cancel</Button>
              <Button className={btnPrimary} onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{editOffer ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-900/20 hover:bg-transparent">
                <TableHead className="text-amber-200/50">Offer</TableHead>
                <TableHead className="text-amber-200/50">Code</TableHead>
                <TableHead className="text-amber-200/50">Type</TableHead>
                <TableHead className="text-amber-200/50">Value</TableHead>
                <TableHead className="text-amber-200/50">Used</TableHead>
                <TableHead className="text-amber-200/50">Status</TableHead>
                <TableHead className="text-amber-200/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((o: any) => (
                <TableRow key={o.id} className="border-amber-900/10 hover:bg-amber-900/5">
                  <TableCell>
                    <p className="text-sm font-medium text-amber-100">{o.title}</p>
                    <p className="text-xs text-amber-200/40">{o.description}</p>
                  </TableCell>
                  <TableCell><code className="rounded bg-amber-600/10 px-2 py-0.5 text-xs text-amber-400">{o.code}</code></TableCell>
                  <TableCell className="text-sm text-amber-200/60 capitalize">{o.type}</TableCell>
                  <TableCell className="text-sm font-medium text-amber-100">{o.type === 'percentage' ? `${o.value}%` : fmt(o.value)}</TableCell>
                  <TableCell className="text-sm text-amber-200/60">{o.usedCount || 0}{o.usageLimit ? ` / ${o.usageLimit}` : ''}</TableCell>
                  <TableCell>
                    <Switch checked={o.isActive} onCheckedChange={() => toggleActive(o.id)} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditOffer(o); setShowForm(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {offers.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No offers yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   12. IMPORT TAB
   ════════════════════════════════════════════ */
function ImportTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [platform, setPlatform] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [scrapedProduct, setScrapedProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [error, setError] = useState('')

  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => apiFetch('/api/categories', undefined, token) })
  const { data: vendorsData } = useQuery({ queryKey: ['vendors-import'], queryFn: () => apiFetch('/api/vendors', undefined, token) })
  const categories = categoriesData?.categories || []
  const vendors = vendorsData?.vendors || []

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true); setError(''); setScrapedProduct(null)
    try {
      const data = await apiFetch('/api/product-import/search', {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery, platform: platform || undefined }),
      }, token)
      setResults(data.results || [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) return
    setScraping(true); setError(''); setScrapedProduct(null)
    try {
      const data = await apiFetch('/api/product-import/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: urlInput, platform: platform || undefined }),
      }, token)
      setScrapedProduct(data.product)
      setResults([])
    } catch (e: any) { setError(e.message) } finally { setScraping(false) }
  }

  const handleResultClick = async (result: any) => {
    setScraping(true); setError(''); setScrapedProduct(null)
    try {
      const data = await apiFetch('/api/product-import/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: result.url, platform: platform || undefined }),
      }, token)
      setScrapedProduct(data.product)
    } catch (e: any) { setError(e.message) } finally { setScraping(false) }
  }

  return (
    <div className="space-y-6">
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-amber-100">Import Products from External Platforms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

          {/* Platform Selector */}
          <div>
            <Label className={lblCls}>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className={`${selCls} mt-1 w-48`}><SelectValue placeholder="All Platforms" /></SelectTrigger>
              <SelectContent className={selContentCls}>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="myntra">Myntra</SelectItem>
                <SelectItem value="nykaa">Nykaa</SelectItem>
                <SelectItem value="amazon">Amazon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Bar */}
          <div>
            <Label className={lblCls}>Search Products</Label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
                <Input
                  className={`${inputCls} pl-9`}
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button className={btnPrimary} onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Separator className="bg-amber-900/20" />

          {/* URL Import */}
          <div>
            <Label className={lblCls}>Import by URL</Label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
                <Input
                  className={`${inputCls} pl-9`}
                  placeholder="https://www.myntra.com/..."
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScrapeUrl()}
                />
              </div>
              <Button className={btnPrimary} onClick={handleScrapeUrl} disabled={scraping}>
                {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Grid */}
      {results.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-amber-100">Search Results</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`${cardCls} cursor-pointer transition-colors hover:border-amber-600/40`} onClick={() => handleResultClick(r)}>
                  <CardContent className="p-3">
                    <div className="mb-2 flex items-start justify-between">
                      <p className="line-clamp-2 text-sm text-amber-100">{r.title || r.snippet?.slice(0, 80)}</p>
                      {r.platform && <Badge className={`ml-2 shrink-0 ${r.platform === 'myntra' ? 'bg-red-600/20 text-red-400' : r.platform === 'nykaa' ? 'bg-pink-600/20 text-pink-400' : 'bg-orange-600/20 text-orange-400'}`}>{r.platform}</Badge>}
                    </div>
                    {r.snippet && <p className="line-clamp-2 text-xs text-amber-200/40">{r.snippet}</p>}
                    {r.url && <p className="mt-1 truncate text-xs text-amber-600/60">{r.url}</p>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Scraped Product Preview */}
      {scrapedProduct && (
        <Card className={cardCls}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-amber-100">Product Preview</CardTitle>
              <Button className={btnPrimary} size="sm" onClick={() => setShowImport(true)}>
                <Import className="mr-1 h-3.5 w-3.5" /> Import Product
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                {scrapedProduct.images?.length > 0 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                    {scrapedProduct.images.slice(0, 5).map((img: string, i: number) => (
                      <img key={i} src={img} alt="" className="h-24 w-24 shrink-0 rounded-lg border border-amber-900/30 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ))}
                  </div>
                )}
                {!scrapedProduct.images?.length && (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-amber-900/20 bg-stone-800/30">
                    <ImageIcon className="h-8 w-8 text-amber-200/20" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-amber-100">{scrapedProduct.name}</h4>
                {scrapedProduct.brand && <p className="text-sm text-amber-200/60">Brand: <span className="text-amber-100">{scrapedProduct.brand}</span></p>}
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-amber-100">{fmt(scrapedProduct.price)}</span>
                  {scrapedProduct.compareAtPrice && <span className="text-sm text-amber-200/40 line-through">{fmt(scrapedProduct.compareAtPrice)}</span>}
                </div>
                {scrapedProduct.category && <Badge className={defCls}>{scrapedProduct.category}</Badge>}
                <p className="line-clamp-4 text-xs text-amber-200/50">{scrapedProduct.description}</p>
                {scrapedProduct.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {scrapedProduct.tags.map((t: string, i: number) => (
                      <Badge key={i} className="bg-amber-600/10 text-amber-400 border-amber-600/20 text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
                {scrapedProduct.inStock !== undefined && (
                  <Badge className={scrapedProduct.inStock ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}>
                    {scrapedProduct.inStock ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Import Product</DialogTitle></DialogHeader>
          {scrapedProduct && (
            <ImportProductForm
              token={token}
              product={scrapedProduct}
              sourceUrl={urlInput}
              platform={platform}
              categories={categories}
              vendors={vendors}
              onClose={() => setShowImport(false)}
              onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-products'] }); onMutate(); setShowImport(false); setScrapedProduct(null); setResults([]) }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ImportProductForm({ token, product, sourceUrl, platform, categories, vendors, onClose, onSaved }: {
  token: string | null; product: any; sourceUrl: string; platform: string;
  categories: any[]; vendors: any[]; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', compareAtPrice: '', categoryId: '',
    stock: '10', costPrice: '', vendorId: '', sku: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price: String(product.price || ''),
        compareAtPrice: String(product.compareAtPrice || ''),
        categoryId: '',
        stock: '10',
        costPrice: '',
        vendorId: '',
        sku: product.sku || '',
      })
    }
  }, [product])

  const handleImport = async () => {
    if (!form.name || !form.price || !form.categoryId) { setError('Name, price, and category are required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/product-import/import', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
          costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
          categoryId: form.categoryId,
          stock: parseInt(form.stock),
          images: product.images || [],
          tags: product.tags || [],
          sourceUrl,
          platform: platform || null,
          vendorId: form.vendorId || null,
          sku: form.sku || null,
        }),
      }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
        <p className="text-xs text-amber-200/50">Importing from: <span className="text-amber-400">{platform || 'Unknown'}</span></p>
        <p className="text-sm font-medium text-amber-100">{product.name}</p>
        <p className="text-sm text-amber-100">{fmt(product.price)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><Label className={lblCls}>Price *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
        <div><Label className={lblCls}>Compare At Price</Label><Input type="number" className={`${inputCls} mt-1`} value={form.compareAtPrice} onChange={e => setForm(f => ({ ...f, compareAtPrice: e.target.value }))} /></div>
        <div><Label className={lblCls}>Cost Price</Label><Input type="number" className={`${inputCls} mt-1`} value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
        <div>
          <Label className={lblCls}>Category *</Label>
          <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Stock</Label><Input type="number" className={`${inputCls} mt-1`} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
        <div>
          <Label className={lblCls}>Vendor</Label>
          <Select value={form.vendorId} onValueChange={v => setForm(f => ({ ...f, vendorId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="none">None</SelectItem>
              {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>SKU</Label><Input className={`${inputCls} mt-1`} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
      </div>
      <div><Label className={lblCls}>Description</Label><Textarea className={`${inputCls} mt-1`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleImport} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Import Product</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   13. INTEGRATIONS TAB
   ════════════════════════════════════════════ */
function IntegrationsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editIntegration, setEditIntegration] = useState<any>(null)
  const [showSyncDialog, setShowSyncDialog] = useState<any>(null)
  const [syncProgress, setSyncProgress] = useState<string | null>(null)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const syncPollRef = useRef<NodeJS.Timeout | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiFetch('/api/integrations', undefined, token),
  })

  const { data: integrationDetail } = useQuery({
    queryKey: ['integration-detail', selectedIntegration],
    queryFn: () => apiFetch(`/api/integrations/${selectedIntegration}`, undefined, token),
    enabled: !!selectedIntegration,
  })

  const integrations = data?.integrations || data || []
  const syncLogs = integrationDetail?.syncLogs || []

  const discoverMut = useMutation({
    mutationFn: () => apiFetch('/api/integrations/discover', { method: 'POST' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); onMutate() },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/api/integrations/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); onMutate() },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/integrations/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); onMutate() },
  })

  const syncMut = useMutation({
    mutationFn: ({ id, category, query }: { id: string; category?: string; query?: string }) =>
      apiFetch('/api/integrations/sync', { method: 'POST', body: JSON.stringify({ integrationId: id, category, query }) }, token),
    onSuccess: () => {
      setSyncProgress(null)
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['integration-detail'] })
      onMutate()
      if (syncPollRef.current) { clearInterval(syncPollRef.current); syncPollRef.current = null }
    },
    onError: () => {
      setSyncProgress(null)
      if (syncPollRef.current) { clearInterval(syncPollRef.current); syncPollRef.current = null }
    },
  })

  const handleSync = (integration: any, category?: string, query?: string) => {
    setSyncProgress(integration.id)
    syncMut.mutate({ id: integration.id, category, query })
    // Poll for sync status updates
    syncPollRef.current = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['integration-detail', integration.id] })
    }, 5000)
  }

  useEffect(() => {
    return () => { if (syncPollRef.current) clearInterval(syncPollRef.current) }
  }, [])

  const syncStatusColor = (s: string) => {
    const m: Record<string, string> = {
      idle: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
      syncing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
      error: 'bg-red-600/20 text-red-400 border-red-600/30',
      completed: 'bg-green-600/20 text-green-400 border-green-600/30',
      failed: 'bg-red-600/20 text-red-400 border-red-600/30',
    }
    return m[s] || defCls
  }

  const platformIcon = (slug: string) => {
    const colors: Record<string, string> = {
      myntra: 'bg-pink-600/20 text-pink-400',
      nykaa: 'bg-purple-600/20 text-purple-400',
      amazon: 'bg-orange-600/20 text-orange-400',
      flipkart: 'bg-blue-600/20 text-blue-400',
      caratlane: 'bg-amber-600/20 text-amber-400',
      tanishq: 'bg-yellow-600/20 text-yellow-400',
      bluestone: 'bg-cyan-600/20 text-cyan-400',
      voylla: 'bg-rose-600/20 text-rose-400',
    }
    return colors[slug?.toLowerCase()] || 'bg-stone-600/20 text-stone-400'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button className={btnPrimary} onClick={() => { setEditIntegration(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Add Platform
        </Button>
        <Button
          variant="outline"
          className={btnOutline}
          onClick={() => discoverMut.mutate()}
          disabled={discoverMut.isPending}
        >
          {discoverMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Globe className="mr-1 h-4 w-4" />}
          Auto-Discover Platforms
        </Button>
      </div>

      {discoverMut.isSuccess && discoverMut.data && (
        <Card className="border-green-900/30 bg-green-950/20">
          <CardContent className="p-3">
            <p className="text-sm text-green-400">
              <Check className="mr-1 inline h-4 w-4" />
              Discovered: {discoverMut.data.created?.length || 0} new, {discoverMut.data.skipped?.length || 0} existing
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : integrations.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="py-12 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
            <p className="text-amber-200/40">No platform integrations yet</p>
            <p className="mt-1 text-xs text-amber-200/30">Click "Auto-Discover Platforms" to add default integrations</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((intg: any) => (
              <motion.div key={intg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`${cardCls} transition-all hover:border-amber-600/30`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${platformIcon(intg.slug)}`}>
                          {intg.logo ? (
                            <img src={intg.logo} alt={intg.name} className="h-6 w-6 rounded object-contain" />
                          ) : (
                            <Globe className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-100">{intg.name}</p>
                          <p className="text-[10px] text-amber-200/40">{intg.slug}</p>
                        </div>
                      </div>
                      <Badge className={statusColor(intg.isActive ? 'active' : 'inactive')}>
                        {intg.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/40">Products</span>
                        <span className="text-amber-100 font-medium">{intg.productCount ?? intg._count?.products ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/40">Sync Status</span>
                        <Badge className={`${syncStatusColor(intg.syncStatus || 'idle')} text-[9px] px-1.5 py-0`}>
                          {intg.syncStatus || 'idle'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/40">Last Synced</span>
                        <span className="text-amber-100">{intg.lastSyncedAt ? fmtDateTime(intg.lastSyncedAt) : 'Never'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/40">Commission</span>
                        <span className="text-amber-100">{intg.commission || 0}%</span>
                      </div>
                    </div>

                    {intg.categories && intg.categories.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {(Array.isArray(intg.categories) ? intg.categories : JSON.parse(intg.categories || '[]')).slice(0, 3).map((c: string, i: number) => (
                          <Badge key={i} className="bg-stone-700/30 text-stone-300 border-stone-600/30 text-[8px] px-1.5 py-0">
                            {c}
                          </Badge>
                        ))}
                        {(Array.isArray(intg.categories) ? intg.categories : JSON.parse(intg.categories || '[]')).length > 3 && (
                          <Badge className="bg-stone-700/30 text-stone-300 border-stone-600/30 text-[8px] px-1.5 py-0">
                            +{(Array.isArray(intg.categories) ? intg.categories : JSON.parse(intg.categories || '[]')).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${btnOutline} flex-1 h-7 text-[10px]`}
                        onClick={() => handleSync(intg)}
                        disabled={syncProgress === intg.id || !intg.isActive}
                      >
                        {syncProgress === intg.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                        {syncProgress === intg.id ? 'Syncing...' : 'Sync Now'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${btnOutline} h-7 w-7 p-0`}
                        onClick={() => { setEditIntegration(intg); setShowForm(true) }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${btnOutline} h-7 w-7 p-0`}
                        onClick={() => toggleMut.mutate({ id: intg.id, isActive: !intg.isActive })}
                      >
                        {intg.isActive ? <Eye className="h-3 w-3" /> : <Eye className="h-3 w-3 text-red-400/60" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${btnOutline} h-7 w-7 p-0`}
                        onClick={() => { setSelectedIntegration(intg.id); setShowSyncDialog(intg) }}
                      >
                        <Link2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Sync History for Selected Integration */}
          {selectedIntegration && (
            <Card className={cardCls}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-amber-100">
                    Sync History — {integrations.find((i: any) => i.id === selectedIntegration)?.name || 'Platform'}
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => setSelectedIntegration(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-amber-900/20 hover:bg-transparent">
                        <TableHead className="text-amber-200/50">Date</TableHead>
                        <TableHead className="text-amber-200/50">Type</TableHead>
                        <TableHead className="text-amber-200/50">Status</TableHead>
                        <TableHead className="text-amber-200/50">Found</TableHead>
                        <TableHead className="text-amber-200/50">Added</TableHead>
                        <TableHead className="text-amber-200/50">Updated</TableHead>
                        <TableHead className="text-amber-200/50">Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No sync history</TableCell></TableRow>
                      ) : syncLogs.map((log: any) => (
                        <TableRow key={log.id} className="border-amber-900/10 hover:bg-amber-900/5">
                          <TableCell className="text-xs text-amber-200/60">{fmtDateTime(log.startedAt)}</TableCell>
                          <TableCell className="text-xs text-amber-200/60">{log.type || 'full'}</TableCell>
                          <TableCell>
                            <Badge className={syncStatusColor(log.status)}>{log.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-amber-100">{log.productsFound ?? '—'}</TableCell>
                          <TableCell className="text-sm text-amber-100">{log.productsAdded ?? '—'}</TableCell>
                          <TableCell className="text-sm text-amber-100">{log.productsUpdated ?? '—'}</TableCell>
                          <TableCell className="text-xs text-red-400/60 max-w-[200px] truncate">{log.errors || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Integration Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editIntegration ? 'Edit Integration' : 'Add Platform Integration'}</DialogTitle>
          </DialogHeader>
          <IntegrationForm
            token={token}
            integration={editIntegration}
            onClose={() => { setShowForm(false); setEditIntegration(null) }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['integrations'] }); onMutate(); setShowForm(false); setEditIntegration(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Trigger Sync Dialog */}
      <Dialog open={!!showSyncDialog} onOpenChange={() => setShowSyncDialog(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Trigger Sync — {showSyncDialog?.name}</DialogTitle>
          </DialogHeader>
          <SyncTriggerForm
            integration={showSyncDialog}
            onSync={(category, query) => { handleSync(showSyncDialog, category, query); setShowSyncDialog(null) }}
            onClose={() => setShowSyncDialog(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Integration Form ─── */
function IntegrationForm({ token, integration, onClose, onSaved }: {
  token: string | null; integration: any; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: '', slug: '', baseUrl: '', logo: '', categories: '', affiliateTag: '',
    commission: '5', maxProducts: '100', autoSync: true, syncInterval: '24',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (integration) {
      const cats = Array.isArray(integration.categories)
        ? integration.categories.join(', ')
        : integration.categories || ''
      setForm({
        name: integration.name || '', slug: integration.slug || '', baseUrl: integration.baseUrl || '',
        logo: integration.logo || '', categories: cats, affiliateTag: integration.affiliateTag || '',
        commission: String(integration.commission || 5), maxProducts: String(integration.maxProducts || 100),
        autoSync: integration.autoSync ?? true, syncInterval: String(integration.syncInterval || 24),
      })
    }
  }, [integration])

  const handleSubmit = async () => {
    if (!form.name || !form.slug) { setError('Name and slug are required'); return }
    setSaving(true); setError('')
    try {
      const body = {
        ...form,
        commission: parseFloat(form.commission),
        maxProducts: parseInt(form.maxProducts),
        syncInterval: parseInt(form.syncInterval),
        categories: form.categories ? form.categories.split(',').map(c => c.trim()).filter(Boolean) : [],
      }
      if (integration) {
        await apiFetch(`/api/integrations/${integration.id}`, { method: 'PUT', body: JSON.stringify(body) }, token)
      } else {
        await apiFetch('/api/integrations', { method: 'POST', body: JSON.stringify(body) }, token)
      }
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><Label className={lblCls}>Slug *</Label><Input className={`${inputCls} mt-1`} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. myntra" /></div>
        <div><Label className={lblCls}>Base URL</Label><Input className={`${inputCls} mt-1`} value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="https://www.myntra.com" /></div>
        <div><Label className={lblCls}>Logo URL</Label><Input className={`${inputCls} mt-1`} value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} /></div>
        <div className="sm:col-span-2"><Label className={lblCls}>Categories (comma separated)</Label><Input className={`${inputCls} mt-1`} value={form.categories} onChange={e => setForm(f => ({ ...f, categories: e.target.value }))} placeholder="sarees, jewelry, watches" /></div>
        <div><Label className={lblCls}>Affiliate Tag</Label><Input className={`${inputCls} mt-1`} value={form.affiliateTag} onChange={e => setForm(f => ({ ...f, affiliateTag: e.target.value }))} /></div>
        <div><Label className={lblCls}>Commission %</Label><Input type="number" className={`${inputCls} mt-1`} value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} /></div>
        <div><Label className={lblCls}>Max Products</Label><Input type="number" className={`${inputCls} mt-1`} value={form.maxProducts} onChange={e => setForm(f => ({ ...f, maxProducts: e.target.value }))} /></div>
        <div><Label className={lblCls}>Sync Interval (hrs)</Label><Input type="number" className={`${inputCls} mt-1`} value={form.syncInterval} onChange={e => setForm(f => ({ ...f, syncInterval: e.target.value }))} /></div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.autoSync} onCheckedChange={v => setForm(f => ({ ...f, autoSync: v }))} />
        <Label className={lblCls}>Auto Sync</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{integration ? 'Update' : 'Create'} Integration
        </Button>
      </div>
    </div>
  )
}

/* ─── Sync Trigger Form ─── */
function SyncTriggerForm({ integration, onSync, onClose }: {
  integration: any; onSync: (category?: string, query?: string) => void; onClose: () => void
}) {
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const categories = Array.isArray(integration?.categories)
    ? integration.categories
    : JSON.parse(integration?.categories || '[]')

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-amber-400/60" />
          <p className="text-sm font-medium text-amber-100">{integration?.name}</p>
        </div>
        <p className="text-xs text-amber-200/40">Current status: <Badge className={`${statusColor(integration?.isActive ? 'active' : 'inactive')} text-[9px]`}>{integration?.syncStatus || 'idle'}</Badge></p>
      </div>

      <div>
        <Label className={lblCls}>Category (optional — leave empty for all)</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c: string, i: number) => <SelectItem key={i} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className={lblCls}>Search Query (optional)</Label>
        <Input className={`${inputCls} mt-1`} value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. gold necklace" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={() => onSync(category === 'all' ? undefined : category || undefined, query || undefined)}>
          <RefreshCw className="mr-1 h-4 w-4" /> Start Sync
        </Button>
      </div>
    </div>
  )
}
