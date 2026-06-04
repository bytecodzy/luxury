'use client';

import { useStore, type View } from '@/lib/store';
import { QueryProvider } from '@/lib/query-provider';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HeroSection } from '@/components/hero-section';
import { CategoryGrid } from '@/components/category-grid';
import { ProductGrid } from '@/components/product-grid';
import { ProductDetail } from '@/components/product-detail';
import { CartView } from '@/components/cart-view';
import { CheckoutView } from '@/components/checkout-view';
import { OrderConfirmation } from '@/components/order-confirmation';
import { OrderHistory } from '@/components/order-history';
import { AuthDialog } from '@/components/auth-dialog';
import { AdminDashboard } from '@/components/admin-dashboard';
import { UserDashboard } from '@/components/user-dashboard';
import { AgentDashboard } from '@/components/agent-dashboard';
import { TeamDashboard } from '@/components/team-dashboard';
import { CorporateDashboard } from '@/components/corporate-dashboard';
import { SecurityPolicy } from '@/components/security-policy';
import { GiftAssistant } from '@/components/gift-assistant';
import { GiftBuilder } from '@/components/gift-builder';
import { AppDownloadSection } from '@/components/app-download-section';
import { AppDownloadBanner } from '@/components/app-download-banner';
import { FamilyPackSection } from '@/components/family-pack-section';
import { SocialConnectionsSection } from '@/components/social-connections-section';
import { ThreeboxesCurateSection } from '@/components/threeboxes-curate-section';
import { ToastContainer } from '@/hooks/use-toast-notification';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

// ── ErrorBoundary must be defined BEFORE any component that uses it ──

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      const isDataError = this.state.error?.message?.includes('undefined') ||
        this.state.error?.message?.includes('null') ||
        this.state.error?.message?.includes('length') ||
        this.state.error?.message?.includes('map is not a function');
      
      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center bg-stone-950/50 p-8 text-center rounded-xl border border-amber-900/20">
          <div className="mb-4 rounded-full bg-amber-900/20 p-4">
            <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="mb-3 text-sm text-amber-200/60">
            {isDataError
              ? 'A data loading issue occurred. This is usually temporary.'
              : this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-stone-950 hover:bg-amber-500 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Home page sections (uses ErrorBoundary, so must be after it) ──

function HomeSections() {
  return (
    <>
      <ErrorBoundary fallback={null}>
        <HeroSection />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <CategoryGrid />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <ProductGrid />
      </ErrorBoundary>

      {/* Family Pack Section - inline */}
      <section className="py-12 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            <span className="text-amber-50">Family </span>
            <span className="luxury-text">Gift Packs</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-amber-200/60 sm:text-base">
            Pre-curated luxury gift bundles for every member of your family. Save up to 30% with our exclusive packs.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Parents Pack', icon: '❤️', desc: 'Show your love with premium gifts for mom & dad', price: '₹12,999', save: '30%', color: 'border-rose-500/30 hover:border-rose-500/50' },
            { name: 'Kids Pack', icon: '👶', desc: 'Delight the little ones with fun gift combos', price: '₹4,999', save: '33%', color: 'border-cyan-500/30 hover:border-cyan-500/50' },
            { name: 'Couple Pack', icon: '💑', desc: 'Celebrate togetherness with matching luxury gifts', price: '₹15,999', save: '30%', color: 'border-amber-500/30 hover:border-amber-500/50' },
            { name: 'Home Pack', icon: '🏠', desc: 'Transform their home with elegant décor essentials', price: '₹8,999', save: '28%', color: 'border-orange-500/30 hover:border-orange-500/50' },
          ].map((pack) => (
            <div key={pack.name} className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b from-stone-900/80 to-stone-950/90 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10 ${pack.color}`}>
              <div className="mb-3 text-3xl">{pack.icon}</div>
              <h3 className="mb-2 text-lg font-bold text-amber-100">{pack.name}</h3>
              <p className="mb-4 text-xs leading-relaxed text-amber-200/50">{pack.desc}</p>
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-100">{pack.price}</span>
                <span className="text-xs font-semibold text-amber-400">Save {pack.save}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Connections Section - inline */}
      <section className="relative overflow-hidden border-t border-amber-900/20 py-12 sm:py-16">
        <div className="relative container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              <span className="text-amber-50">Social </span>
              <span className="luxury-text">Connections</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-amber-200/60 sm:text-base">
              Gift giving is better together. Connect with loved ones and make every celebration memorable.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '🔗', title: 'Share Wishlists', desc: 'Create and share gift wishlists with family & friends.' },
              { icon: '👥', title: 'Group Gifting', desc: 'Pool contributions for that one special luxury gift.' },
              { icon: '💬', title: 'Gift Chat', desc: 'Discuss and plan gifts with your close circle.' },
              { icon: '🎉', title: 'Celebration Reminders', desc: 'Never miss a birthday or anniversary again.' },
              { icon: '💝', title: 'Gift Registry', desc: 'Set up your personal gift registry for milestones.' },
              { icon: '🏆', title: 'Referral Rewards', desc: 'Share 3BOXES with friends and earn luxury credits.' },
            ].map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-amber-900/20 bg-gradient-to-b from-stone-900/60 to-stone-950/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-900/10">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <h3 className="text-base font-bold text-amber-100">{feature.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-amber-200/50">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3BOXES Curate Section - inline */}
      <section className="relative overflow-hidden border-t border-amber-900/20 bg-gradient-to-b from-stone-950 via-stone-900/30 to-stone-950 py-12 sm:py-16">
        <div className="relative container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              <span className="luxury-text">3BOXES </span>
              <span className="text-amber-50">Curate</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-amber-200/60 sm:text-base">
              Every piece is handpicked by our expert curators. Explore collections that reflect the finest in luxury and craftsmanship.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '💎', title: 'Timeless Jewelry', curator: 'Priya Sharma', items: 42, color: 'border-amber-500/30 hover:border-amber-500/50' },
              { icon: '⌚', title: 'Modern Watches', curator: 'Arjun Malhotra', items: 28, color: 'border-rose-500/30 hover:border-rose-500/50' },
              { icon: '🌸', title: 'Artisan Fragrances', curator: 'Neha Kapoor', items: 35, color: 'border-teal-500/30 hover:border-teal-500/50' },
              { icon: '👗', title: 'Couture Edit', curator: 'Riya Singh', items: 56, color: 'border-pink-500/30 hover:border-pink-500/50' },
              { icon: '🏡', title: 'Luxury Home', curator: 'Vikram Patel', items: 31, color: 'border-orange-500/30 hover:border-orange-500/50' },
              { icon: '🎨', title: 'The Gift Edit', curator: '3BOXES Team', items: 78, color: 'border-cyan-500/30 hover:border-cyan-500/50' },
            ].map((collection) => (
              <div key={collection.title} className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-stone-900/60 to-stone-950/90 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10 ${collection.color}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl">{collection.icon}</span>
                  <span className="text-[10px] text-amber-200/40">{collection.items} items</span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-amber-100">{collection.title}</h3>
                <p className="text-xs text-amber-200/40">Curated by {collection.curator}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ErrorBoundary fallback={null}>
        <AppDownloadSection />
      </ErrorBoundary>
    </>
  );
}

// ── App Content ──

function AppContent() {
  const view = useStore((s) => s.view);
  const appTheme = useStore((s) => s.appTheme);

  const renderView = () => {
    switch (view) {
      case 'home':
        return <HomeSections />;
      case 'product':
        return <ProductDetail />;
      case 'cart':
        return <CartView />;
      case 'checkout':
        return <CheckoutView />;
      case 'order-confirmation':
        return <OrderConfirmation />;
      case 'orders':
        return <OrderHistory />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'user-dashboard':
        return <UserDashboard />;
      case 'agent-dashboard':
        return <AgentDashboard />;
      case 'team-dashboard':
        return <TeamDashboard />;
      case 'corporate-dashboard':
        return <CorporateDashboard />;
      case 'security-policy':
        return <SecurityPolicy />;
      default:
        return <HomeSections />;
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${appTheme === 'light' ? 'bg-white' : 'bg-stone-950'}`}
      data-theme={appTheme}
    >
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
      <ErrorBoundary fallback={null}>
        <AuthDialog />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <GiftBuilder />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <GiftAssistant />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <AppDownloadBanner />
      </ErrorBoundary>
      <ToastContainer />
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppContent />
      </QueryProvider>
    </ErrorBoundary>
  );
}
