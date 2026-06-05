'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  Package,
  Sparkles,
  Plus,
  Minus,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  Shield,
  Truck,
  Zap,
  X,
  Search,
  Star,
  Gift,
  PartyPopper,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useStore, SmartBundleItem } from '@/lib/store'
import { showToast } from '@/hooks/use-toast-notification'

// ─── Platform Configuration ────────────────────────────────────────────────────

interface PlatformConfig {
  name: string
  color: string
  initial: string
  category: string
}

const PLATFORMS: Record<string, PlatformConfig> = {
  myntra: { name: 'Myntra', color: '#FF3F6C', initial: 'M', category: 'Fashion' },
  amazon: { name: 'Amazon', color: '#FF9900', initial: 'A', category: 'Everything' },
  nykaa: { name: 'Nykaa', color: '#FC2779', initial: 'N', category: 'Beauty' },
  flipkart: { name: 'Flipkart', color: '#2874F0', initial: 'F', category: 'Everything' },
  caratlane: { name: 'CaratLane', color: '#C8A97E', initial: 'C', category: 'Jewellery' },
  tanishq: { name: 'Tanishq', color: '#D4AF37', initial: 'T', category: 'Jewellery' },
  bluestone: { name: 'BlueStone', color: '#2E86C1', initial: 'B', category: 'Jewellery' },
  voylla: { name: 'Voylla', color: '#8E44AD', initial: 'V', category: 'Fashion Jewellery' },
  '3box': { name: '3Box', color: '#D97706', initial: '3', category: 'Curated Luxury' },
}

// ─── Mock Products ─────────────────────────────────────────────────────────────

interface MockProduct {
  id: string
  name: string
  price: number
  platform: string
  description: string
}

const MOCK_PRODUCTS: MockProduct[] = [
  // Myntra
  { id: 'sb-m1', name: 'Sabyasachi Silk Saree', price: 18999, platform: 'myntra', description: 'Handwoven Banarasi silk with gold zari' },
  { id: 'sb-m2', name: 'Raw Mango Kurta Set', price: 8499, platform: 'myntra', description: 'Chanderi cotton with intricate embroidery' },

  // Amazon
  { id: 'sb-a1', name: 'Dyson Airwrap Complete', price: 42900, platform: 'amazon', description: 'Multi-styler hair tool with attachments' },
  { id: 'sb-a2', name: 'Apple Watch Ultra 2', price: 79900, platform: 'amazon', description: 'Titanium case with Alpine Loop' },

  // Nykaa
  { id: 'sb-n1', name: 'Charlotte Tilbury Flawless Filter', price: 2790, platform: 'nykaa', description: 'Complexion booster & highlighter' },
  { id: 'sb-n2', name: 'Estée Lauder Advanced Night Repair', price: 5900, platform: 'nykaa', description: 'Serum for visible repair & renewal' },

  // Flipkart
  { id: 'sb-f1', name: 'Samsung Galaxy S24 Ultra', price: 129999, platform: 'flipkart', description: 'Titanium finish with AI features' },
  { id: 'sb-f2', name: 'Sony WH-1000XM5', price: 29990, platform: 'flipkart', description: 'Premium noise cancelling headphones' },

  // CaratLane
  { id: 'sb-c1', name: 'Radiant Solitaire Ring', price: 75999, platform: 'caratlane', description: '0.25 carat diamond in 18K gold' },
  { id: 'sb-c2', name: 'Celestial Pendant Necklace', price: 34500, platform: 'caratlane', description: 'Diamond studded pendant in rose gold' },

  // Tanishq
  { id: 'sb-t1', name: 'Kundan Bridal Necklace Set', price: 245000, platform: 'tanishq', description: '22K gold with polki & enamel work' },
  { id: 'sb-t2', name: 'Temple Gold Jhumkas', price: 89900, platform: 'tanishq', description: '22K gold traditional jhumka earrings' },

  // BlueStone
  { id: 'sb-b1', name: 'Aurora Drop Earrings', price: 28750, platform: 'bluestone', description: 'Blue topaz & diamond in white gold' },
  { id: 'sb-b2', name: 'Eternity Band Ring', price: 42300, platform: 'bluestone', description: 'Channel set diamonds in platinum' },

  // Voylla
  { id: 'sb-v1', name: 'Oxidised Silver Choker', price: 1299, platform: 'voylla', description: 'Handcrafted tribal choker necklace' },
  { id: 'sb-v2', name: 'Kundan Maang Tikka', price: 899, platform: 'voylla', description: 'Traditional bridal hair accessory' },

  // 3Box
  { id: 'sb-3b1', name: 'Luxury Gift Hamper - Premium', price: 4999, platform: '3box', description: 'Curated artisan chocolates & candle set' },
  { id: 'sb-3b2', name: '3Box Signature Silk Scarf', price: 3499, platform: '3box', description: 'Hand-painted mulberry silk accessory' },
]

// ─── Helper: Format INR ────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Helper: Generate bundle ID ────────────────────────────────────────────────

function generateBundleId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = '3BX-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ─── Sub-Component: PlatformBadge ──────────────────────────────────────────────

function PlatformBadge({ platform, size = 'sm' }: { platform: string; size?: 'sm' | 'xs' }) {
  const config = PLATFORMS[platform]
  if (!config) return null

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses}`}
      style={{ backgroundColor: `${config.color}20`, color: config.color, border: `1px solid ${config.color}40` }}
    >
      <span
        className="rounded-full flex items-center justify-center font-bold"
        style={{
          backgroundColor: config.color,
          color: '#fff',
          width: size === 'sm' ? 16 : 14,
          height: size === 'sm' ? 16 : 14,
          fontSize: size === 'sm' ? 9 : 8,
        }}
      >
        {config.initial}
      </span>
      {config.name}
    </span>
  )
}

// ─── Sub-Component: ProductImage ───────────────────────────────────────────────

function ProductImage({ platform, name }: { platform: string; name: string }) {
  const config = PLATFORMS[platform]
  const color = config?.color || '#D97706'
  const initial = config?.initial || '?'

  return (
    <div
      className="relative w-full aspect-square rounded-lg overflow-hidden flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}30, ${color}10)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}40, transparent 60%)`,
        }}
      />
      <span
        className="text-5xl font-black opacity-30 select-none"
        style={{ color }}
      >
        {initial}
      </span>
      <div className="absolute bottom-2 left-2 right-2">
        <p className="text-[10px] text-stone-400 truncate text-center">{name}</p>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SmartBundle() {
  const { smartBundleItems, addSmartBundleItem, removeSmartBundleItem, clearSmartBundle } = useStore()

  // Local UI state
  const [activeTab, setActiveTab] = useState('all')
  const [consentOpen, setConsentOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [bundleId, setBundleId] = useState('')
  const [consentChecks, setConsentChecks] = useState({
    authorize: false,
    delivery: false,
    terms: false,
  })
  const [mobileBundleOpen, setMobileBundleOpen] = useState(false)

  // ─── Derived state ─────────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    if (activeTab === 'all') return MOCK_PRODUCTS
    return MOCK_PRODUCTS.filter((p) => p.platform === activeTab)
  }, [activeTab])

  const totalPrice = useMemo(() => {
    return smartBundleItems.reduce((sum, item) => sum + item.price, 0)
  }, [smartBundleItems])

  const has3BoxItem = useMemo(() => {
    return smartBundleItems.some((item) => item.isOwnProduct)
  }, [smartBundleItems])

  const bundleDiscount = useMemo(() => {
    const count = smartBundleItems.length
    if (count >= 5) return 0.1
    if (count >= 3) return 0.05
    return 0
  }, [smartBundleItems])

  const discountAmount = Math.round(totalPrice * bundleDiscount)
  const finalPrice = totalPrice - discountAmount

  const allConsentGiven = consentChecks.authorize && consentChecks.delivery && consentChecks.terms

  const isItemInBundle = (id: string) => smartBundleItems.some((item) => item.id === id)

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAddToBundle = (product: MockProduct) => {
    if (isItemInBundle(product.id)) return
    const config = PLATFORMS[product.platform]
    const item: SmartBundleItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: '',
      platform: product.platform,
      platformColor: config?.color || '#D97706',
      isOwnProduct: product.platform === '3box',
    }
    addSmartBundleItem(item)
    showToast('success', `${product.name} added to bundle`)
  }

  const handleRemoveFromBundle = (id: string, name: string) => {
    removeSmartBundleItem(id)
    showToast('info', `${name} removed from bundle`)
  }

  const handleProceed = () => {
    if (!has3BoxItem) {
      showToast('error', 'Please add at least 1 item from 3Box to proceed')
      return
    }
    setConsentOpen(true)
  }

  const handleConfirmBundle = () => {
    const id = generateBundleId()
    setBundleId(id)
    setConsentOpen(false)
    setSuccessOpen(true)
    setConsentChecks({ authorize: false, delivery: false, terms: false })
  }

  const handleContinueShopping = () => {
    setSuccessOpen(false)
  }

  // ─── Portal filter tabs ────────────────────────────────────────────────────

  const portalTabs = [
    { key: 'all', label: 'All', color: '#A8A29E' },
    ...Object.entries(PLATFORMS).map(([key, config]) => ({
      key,
      label: config.name,
      color: config.color,
    })),
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* ═══════════════════ HERO BANNER ═══════════════════ */}
      <section className="relative overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'linear-gradient(135deg, #1c1917 0%, #44403c 30%, #78350f 60%, #1c1917 100%)',
              'linear-gradient(135deg, #1c1917 0%, #78350f 30%, #44403c 60%, #1c1917 100%)',
              'linear-gradient(135deg, #78350f 0%, #1c1917 30%, #44403c 60%, #78350f 100%)',
              'linear-gradient(135deg, #1c1917 0%, #44403c 30%, #78350f 60%, #1c1917 100%)',
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              className="mb-4 bg-amber-600/20 text-amber-400 border-amber-600/40 hover:bg-amber-600/30 text-sm px-4 py-1.5"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI-Powered
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">
                3Box Curate
              </span>
            </h1>

            <p className="text-lg sm:text-xl lg:text-2xl text-amber-200/80 font-light mb-6 max-w-2xl mx-auto">
              Shop Across Portals. One Cart. One Delivery.
            </p>

            <p className="text-sm sm:text-base text-stone-400 max-w-xl mx-auto leading-relaxed">
              Pick products from Myntra, Amazon, Nykaa, Flipkart, CaratLane, Tanishq, BlueStone, Voylla
              — plus our own 3Box collection — and we&apos;ll curate them into a single package
              delivered to your doorstep.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="relative z-10 border-y border-stone-800/50 bg-stone-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className="text-center text-xl sm:text-2xl font-bold text-amber-200 mb-10">
            How It Works
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: Search,
                title: 'Browse & Pick',
                desc: 'Explore products from multiple portals in one place',
                step: '01',
              },
              {
                icon: Zap,
                title: 'AI Validates',
                desc: 'We verify availability, pricing & authenticity in real time',
                step: '02',
              },
              {
                icon: Shield,
                title: 'We Purchase',
                desc: '3Box buys on your behalf from every portal securely',
                step: '03',
              },
              {
                icon: Truck,
                title: 'One Delivery',
                desc: 'Everything arrives in a single curated package at your door',
                step: '04',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.12, duration: 0.5 }}
                className="relative group"
              >
                <Card className="bg-stone-900/60 border-stone-800/50 hover:border-amber-600/30 transition-colors p-4 sm:p-6 text-center h-full">
                  <span className="absolute top-3 right-3 text-3xl font-black text-amber-600/10 group-hover:text-amber-600/20 transition-colors">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-xl bg-amber-600/10 flex items-center justify-center group-hover:bg-amber-600/20 transition-colors">
                    <item.icon className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-amber-200 mb-1 sm:mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                    {item.desc}
                  </p>
                </Card>
                {idx < 3 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-amber-600/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ MAIN CONTENT: PRODUCTS + BUNDLE SIDEBAR ═══════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* ─── Product Discovery ─── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-amber-200">
                Discover Products
              </h2>
              <Badge variant="outline" className="border-stone-700 text-stone-400 text-xs">
                {MOCK_PRODUCTS.length} items
              </Badge>
            </div>

            {/* Portal Filter Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-stone-900/50 p-1.5 border border-stone-800/50 rounded-xl">
                {portalTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="text-xs sm:text-sm data-[state=active]:bg-stone-800 data-[state=active]:text-amber-200 text-stone-400 rounded-lg px-2 sm:px-3 py-1.5 transition-all"
                    style={
                      activeTab === tab.key
                        ? { borderBottomColor: tab.color, boxShadow: `0 2px 0 ${tab.color}` }
                        : undefined
                    }
                  >
                    {tab.key !== 'all' && (
                      <span
                        className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
                        style={{ backgroundColor: tab.color }}
                      />
                    )}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Products Grid */}
              {portalTabs.map((tab) => (
                <TabsContent key={tab.key} value={tab.key}>
                  <motion.div
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                    layout
                  >
                    <AnimatePresence mode="popLayout">
                      {(tab.key === 'all' ? MOCK_PRODUCTS : MOCK_PRODUCTS.filter((p) => p.platform === tab.key)).map(
                        (product) => {
                          const inBundle = isItemInBundle(product.id)
                          const config = PLATFORMS[product.platform]

                          return (
                            <motion.div
                              key={product.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Card className="group bg-stone-900/60 border-stone-800/50 hover:border-amber-600/30 transition-all duration-300 overflow-hidden h-full flex flex-col">
                                {/* Platform badge on image */}
                                <div className="relative">
                                  <ProductImage platform={product.platform} name={product.name} />
                                  <div className="absolute top-2 left-2">
                                    <PlatformBadge platform={product.platform} size="xs" />
                                  </div>
                                  {product.platform === '3box' && (
                                    <div className="absolute top-2 right-2">
                                      <Badge className="bg-amber-600/80 text-white text-[9px] px-1.5 py-0.5 border-0">
                                        <Star className="h-2.5 w-2.5 mr-0.5" />
                                        OWN
                                      </Badge>
                                    </div>
                                  )}
                                </div>

                                <div className="p-3 sm:p-4 flex flex-col flex-1">
                                  <h3 className="text-sm font-semibold text-stone-100 line-clamp-2 mb-1 group-hover:text-amber-200 transition-colors">
                                    {product.name}
                                  </h3>
                                  <p className="text-[11px] text-stone-500 line-clamp-1 mb-2">
                                    {product.description}
                                  </p>
                                  <div className="mt-auto flex items-center justify-between">
                                    <span className="text-base sm:text-lg font-bold text-amber-400">
                                      {formatINR(product.price)}
                                    </span>
                                    <Button
                                      size="sm"
                                      className={
                                        inBundle
                                          ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/40 h-8 w-8 p-0'
                                          : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/40 h-8 w-8 p-0'
                                      }
                                      onClick={() =>
                                        inBundle
                                          ? handleRemoveFromBundle(product.id, product.name)
                                          : handleAddToBundle(product)
                                      }
                                    >
                                      <AnimatePresence mode="wait" initial={false}>
                                        {inBundle ? (
                                          <motion.span
                                            key="check"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </motion.span>
                                        ) : (
                                          <motion.span
                                            key="plus"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                          >
                                            <Plus className="h-4 w-4" />
                                          </motion.span>
                                        )}
                                      </AnimatePresence>
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          )
                        }
                      )}
                    </AnimatePresence>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* ─── Bundle Sidebar (Desktop) ─── */}
          <div className="hidden lg:block w-[360px] flex-shrink-0">
            <div className="sticky top-4">
              <BundlePanel
                items={smartBundleItems}
                totalPrice={totalPrice}
                discountAmount={discountAmount}
                finalPrice={finalPrice}
                bundleDiscount={bundleDiscount}
                has3BoxItem={has3BoxItem}
                onRemove={handleRemoveFromBundle}
                onClear={clearSmartBundle}
                onProceed={handleProceed}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Mobile Bundle Bottom Bar ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {/* Collapsed bar */}
        <AnimatePresence>
          {!mobileBundleOpen && smartBundleItems.length > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-stone-900/95 backdrop-blur-md border-t border-stone-800 px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-200">
                    {smartBundleItems.length} item{smartBundleItems.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-stone-400">{formatINR(finalPrice)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-600/40 text-amber-400 text-xs h-8"
                  onClick={() => setMobileBundleOpen(true)}
                >
                  View Bundle
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 disabled:opacity-50"
                  disabled={!has3BoxItem || smartBundleItems.length === 0}
                  onClick={handleProceed}
                >
                  Proceed
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded bundle drawer */}
        <AnimatePresence>
          {mobileBundleOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-stone-950 border-t border-stone-800 max-h-[80vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-stone-950 border-b border-stone-800 px-4 py-3 flex items-center justify-between z-10">
                <h3 className="text-base font-bold text-amber-200">Your Bundle</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-stone-400 hover:text-stone-200 h-8 w-8 p-0"
                  onClick={() => setMobileBundleOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4">
                <BundlePanel
                  items={smartBundleItems}
                  totalPrice={totalPrice}
                  discountAmount={discountAmount}
                  finalPrice={finalPrice}
                  bundleDiscount={bundleDiscount}
                  has3BoxItem={has3BoxItem}
                  onRemove={handleRemoveFromBundle}
                  onClear={() => {
                    clearSmartBundle()
                    setMobileBundleOpen(false)
                  }}
                  onProceed={() => {
                    setMobileBundleOpen(false)
                    handleProceed()
                  }}
                  compact
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Mobile bottom padding ─── */}
      {smartBundleItems.length > 0 && (
        <div className="lg:hidden h-20" />
      )}

      {/* ═══════════════════ CONSENT DIALOG ═══════════════════ */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="bg-stone-950 border-stone-800 text-stone-100 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-amber-200 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              AI Curation Consent
            </DialogTitle>
            <DialogDescription className="text-stone-400">
              Before we proceed, please review and confirm the following details about your curated bundle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Explanation */}
            <div className="bg-stone-900/60 border border-stone-800/50 rounded-lg p-4">
              <p className="text-sm text-stone-300 leading-relaxed">
                <strong className="text-amber-400">3Box</strong> will purchase items from the listed
                third-party portals on your behalf. All items will be verified for availability and
                authenticity before purchase. Your bundle will be consolidated into a single shipment.
              </p>
            </div>

            {/* Estimated Delivery */}
            <div className="flex items-center gap-3 bg-stone-900/60 border border-stone-800/50 rounded-lg p-4">
              <Truck className="h-8 w-8 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-200">Estimated Delivery</p>
                <p className="text-xs text-stone-400">5–7 business days from confirmation</p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-stone-900/60 border border-stone-800/50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-amber-200 mb-3">Price Breakdown</h4>

              {smartBundleItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlatformBadge platform={item.platform} size="xs" />
                    <span className="text-stone-300 truncate">{item.name}</span>
                  </div>
                  <span className="text-stone-200 font-medium ml-2 flex-shrink-0">
                    {formatINR(item.price)}
                  </span>
                </div>
              ))}

              <Separator className="bg-stone-800 my-2" />

              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Subtotal</span>
                <span className="text-stone-200">{formatINR(totalPrice)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5" />
                    Bundle Discount ({Math.round(bundleDiscount * 100)}%)
                  </span>
                  <span className="text-emerald-400">−{formatINR(discountAmount)}</span>
                </div>
              )}

              <Separator className="bg-stone-800 my-2" />

              <div className="flex justify-between text-base font-bold">
                <span className="text-amber-200">Total</span>
                <span className="text-amber-400">{formatINR(finalPrice)}</span>
              </div>
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={consentChecks.authorize}
                  onCheckedChange={(checked) =>
                    setConsentChecks((prev) => ({ ...prev, authorize: checked === true }))
                  }
                  className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <span className="text-sm text-stone-300 group-hover:text-stone-200 transition-colors">
                  I authorize <strong className="text-amber-400">3Box</strong> to purchase on my behalf from the listed portals
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={consentChecks.delivery}
                  onCheckedChange={(checked) =>
                    setConsentChecks((prev) => ({ ...prev, delivery: checked === true }))
                  }
                  className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <span className="text-sm text-stone-300 group-hover:text-stone-200 transition-colors">
                  I understand delivery may take <strong className="text-amber-400">5–7 business days</strong> for bundled items
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={consentChecks.terms}
                  onCheckedChange={(checked) =>
                    setConsentChecks((prev) => ({ ...prev, terms: checked === true }))
                  }
                  className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <span className="text-sm text-stone-300 group-hover:text-stone-200 transition-colors">
                  I agree to the{' '}
                  <strong className="text-amber-400">Curate terms of service</strong>
                </span>
              </label>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="border-stone-700 text-stone-300 hover:bg-stone-800"
              onClick={() => setConsentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold min-w-[140px] disabled:opacity-50"
              disabled={!allConsentGiven}
              onClick={handleConfirmBundle}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Confirm Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ SUCCESS DIALOG ═══════════════════ */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="bg-stone-950 border-stone-800 text-stone-100 sm:max-w-md">
          <div className="text-center py-4">
            {/* Celebration Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-600/20 flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, repeat: 2, repeatDelay: 1 }}
              >
                <PartyPopper className="h-10 w-10 text-amber-400" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-amber-200 mb-2">Bundle Confirmed!</h3>
              <p className="text-stone-400 mb-6">
                Your curated bundle has been placed successfully.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-stone-900/60 border border-stone-800/50 rounded-lg p-5 mb-6 space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-400">Bundle ID</span>
                <span className="text-sm font-mono font-bold text-amber-400">{bundleId}</span>
              </div>
              <Separator className="bg-stone-800" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-400">Items</span>
                <span className="text-sm font-semibold text-stone-200">
                  {smartBundleItems.length} product{smartBundleItems.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-400">Total Paid</span>
                <span className="text-sm font-bold text-amber-400">{formatINR(finalPrice)}</span>
              </div>
              <Separator className="bg-stone-800" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-400">Est. Delivery</span>
                <span className="text-sm font-semibold text-emerald-400">5–7 business days</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Button
                variant="outline"
                className="border-amber-600/40 text-amber-400 hover:bg-amber-600/10"
                onClick={() => {
                  setSuccessOpen(false)
                  showToast('info', 'Tracking feature coming soon!')
                }}
              >
                <Package className="h-4 w-4 mr-2" />
                Track Bundle
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={handleContinueShopping}
              >
                Continue Shopping
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-Component: BundlePanel ────────────────────────────────────────────────

interface BundlePanelProps {
  items: SmartBundleItem[]
  totalPrice: number
  discountAmount: number
  finalPrice: number
  bundleDiscount: number
  has3BoxItem: boolean
  onRemove: (id: string, name: string) => void
  onClear: () => void
  onProceed: () => void
  compact?: boolean
}

function BundlePanel({
  items,
  totalPrice,
  discountAmount,
  finalPrice,
  bundleDiscount,
  has3BoxItem,
  onRemove,
  onClear,
  onProceed,
  compact,
}: BundlePanelProps) {
  return (
    <Card className="bg-stone-900/60 border-stone-800/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/30 to-stone-900/50 border-b border-stone-800/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-bold text-amber-200">Your Bundle</h3>
          {items.length > 0 && (
            <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/40 text-[10px] h-5 min-w-[20px] flex items-center justify-center">
              {items.length}
            </Badge>
          )}
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-stone-500 hover:text-red-400 text-xs h-7 px-2"
            onClick={onClear}
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-stone-800/50 flex items-center justify-center">
              <Package className="h-8 w-8 text-stone-600" />
            </div>
            <p className="text-sm text-stone-500 mb-1">Your bundle is empty</p>
            <p className="text-xs text-stone-600">
              Add products from any portal to get started
            </p>
          </div>
        )}

        {/* Items List */}
        {items.length > 0 && (
          <div className={`space-y-2 ${!compact ? 'max-h-72' : 'max-h-60'} overflow-y-auto pr-1 custom-scrollbar`}>
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3 bg-stone-800/40 rounded-lg p-2.5 group hover:bg-stone-800/60 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ backgroundColor: `${item.platformColor}30`, color: item.platformColor }}
                  >
                    {PLATFORMS[item.platform]?.initial || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-stone-200 truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-stone-500">
                      {PLATFORMS[item.platform]?.name || item.platform}
                    </p>
                  </div>

                  <span className="text-xs sm:text-sm font-semibold text-amber-400 flex-shrink-0">
                    {formatINR(item.price)}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={() => onRemove(item.id, item.name)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 3Box Validation Notice */}
        {items.length > 0 && !has3BoxItem && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 bg-amber-950/30 border border-amber-700/30 rounded-lg p-3"
          >
            <ExternalLink className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400">3Box item required</p>
              <p className="text-[10px] sm:text-[11px] text-amber-600/80 leading-relaxed">
                Add at least 1 item from our 3Box collection to proceed with curation
              </p>
            </div>
          </motion.div>
        )}

        {/* Discount Notice */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-700/20 rounded-lg p-3"
          >
            <Gift className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <div>
              {bundleDiscount > 0 ? (
                <p className="text-xs text-emerald-400 font-medium">
                  🎉 {Math.round(bundleDiscount * 100)}% bundle discount applied!
                </p>
              ) : items.length >= 2 ? (
                <p className="text-xs text-emerald-500/70">
                  Add {3 - items.length} more item{3 - items.length !== 1 ? 's' : ''} for 5% discount
                </p>
              ) : (
                <p className="text-xs text-emerald-500/70">
                  Add 3+ items for 5% or 5+ items for 10% bundle discount
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Price Summary */}
        {items.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-800/50">
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Subtotal ({items.length} items)</span>
              <span className="text-stone-300">{formatINR(totalPrice)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">Discount ({Math.round(bundleDiscount * 100)}%)</span>
                <span className="text-emerald-400">−{formatINR(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold pt-1">
              <span className="text-amber-200">Total</span>
              <span className="text-amber-400">{formatINR(finalPrice)}</span>
            </div>
          </div>
        )}

        {/* Proceed Button */}
        <Button
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed h-11"
          disabled={items.length === 0 || !has3BoxItem}
          onClick={onProceed}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Proceed with AI Curation
        </Button>

        {items.length > 0 && has3BoxItem && (
          <p className="text-center text-[10px] text-stone-600">
            3Box will verify & purchase all items on your behalf
          </p>
        )}
      </div>
    </Card>
  )
}
