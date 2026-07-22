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
import { StyleGallerySection } from '@/components/style-gallery-section';
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
            className="rounded-full bg-amber-600 px-6 py-2 text-sm font-medium text-stone-950 hover:bg-amber-500 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Luxury Section Divider ──
function LuxuryDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/15" />
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rotate-45 bg-amber-500/30" />
        <div className="h-px w-8 bg-amber-500/25" />
        <div className="h-1.5 w-1.5 rotate-45 border border-amber-500/40 bg-amber-500/20" />
        <div className="h-px w-8 bg-amber-500/25" />
        <div className="h-1 w-1 rotate-45 bg-amber-500/30" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/15" />
    </div>
  );
}

// ── Luxury Promo Banner ──
function LuxuryPromoBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-900/20 via-amber-800/10 to-amber-900/20 backdrop-blur-sm"
    >
      {/* Decorative shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      
      <div className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:text-left sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/70">
            AI-Powered Experience
          </p>
          <h3 className="mt-1 text-lg font-bold text-amber-100 sm:text-xl">
            Virtual Try-On with AI Style Preview
          </h3>
          <p className="mt-1 max-w-md text-sm text-amber-200/45">
            See how luxury looks on you before you buy. Upload a selfie and let our AI drape sarees, jewelry & more — with your face preserved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live on all products
          </span>
        </div>
      </div>

      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
    </motion.div>
  );
}

// ── Home page sections (uses ErrorBoundary, so must be after it) ──

function HomeSections() {
  return (
    <>
      {/* Full-screen hero — no container wrapper needed */}
      <ErrorBoundary fallback={null}>
        <HeroSection />
      </ErrorBoundary>

      {/* Content below hero with luxury spacing */}
      <div className="mt-8 space-y-2 sm:mt-12">
        {/* Promo Banner */}
        <ErrorBoundary fallback={null}>
          <LuxuryPromoBanner />
        </ErrorBoundary>

        <LuxuryDivider />

        {/* Category sub-navigation */}
        <ErrorBoundary fallback={null}>
          <CategoryGrid />
        </ErrorBoundary>

        <LuxuryDivider />

        {/* Products */}
        <div id="products-section">
          <ErrorBoundary fallback={null}>
            <ProductGrid />
          </ErrorBoundary>
        </div>

        <LuxuryDivider />

        {/* AI Style Gallery */}
        <ErrorBoundary fallback={null}>
          <StyleGallerySection />
        </ErrorBoundary>

        <LuxuryDivider />

        {/* Family Pack Section */}
        <div id="family-pack-section">
          <ErrorBoundary fallback={null}>
            <FamilyPackSection />
          </ErrorBoundary>
        </div>

        <LuxuryDivider />

        {/* Social Connections Section */}
        <div id="social-connections-section">
          <ErrorBoundary fallback={null}>
            <SocialConnectionsSection />
          </ErrorBoundary>
        </div>

        <LuxuryDivider />
        
        {/* 3BOXES Curate Section */}
        <div id="3boxes-curate-section">
          <ErrorBoundary fallback={null}>
            <ThreeboxesCurateSection />
          </ErrorBoundary>
        </div>

        <LuxuryDivider />

        <ErrorBoundary fallback={null}>
          <AppDownloadSection />
        </ErrorBoundary>
      </div>
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
      className={`min-h-screen flex flex-col ${appTheme === 'light' ? 'bg-[#fdf9f1]' : 'bg-stone-950'}`}
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
              transition={{ duration: 0.25 }}
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
