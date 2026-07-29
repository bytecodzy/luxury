'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  Newspaper,
  Megaphone,
  Image as ImageIcon,
  BarChart3,
  Mail,
  Phone,
  Globe,
  Quote,
  Download,
  Camera,
  Award,
  Heart,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export function PressPage() {
  return (
    <PolicyPage
      title="Press & Media"
      subtitle="Resources, press releases, and brand assets for journalists and partners"
      icon={Newspaper}
      badge="Media Kit"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <Megaphone className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            Welcome to the <strong className="text-amber-300">3 Boxes Luxury</strong> press room. We're
            happy to assist journalists, content creators, and partners with stories, assets, and
            interviews. For any media inquiry, reach out to us at{' '}
            <strong className="text-amber-300">press@3boxes.in</strong>.
          </span>
        </div>
      </PolicyCallout>

      {/* About 3 Boxes Luxury */}
      <PolicySection icon={Heart} title="About 3 Boxes Luxury" index={0}>
        <p className="text-amber-200/60">
          Founded in Bengaluru, India, 3 Boxes Luxury Curations is a premium gifting house that
          brings together fine watches, jewelry, leather goods, fragrances, and curated hampers
          under one roof. Our mission is to make luxury gifting effortless, memorable, and personal —
          for individuals, families, and corporations alike.
        </p>
        <p className="text-amber-200/60">
          We blend traditional Indian craftsmanship with modern curation, working directly with
          authorized manufacturers and distributors to guarantee authenticity on every product we
          ship. Each order is hand-packed in our signature matte-black gift box with gold foil
          branding.
        </p>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Founded:</strong> 2023, Bengaluru
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Headquarters:</strong> Yelahanka New Town, Bengaluru — 560064
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Domains:</strong> 3boxes.in, 3boxesluxurycurations.com
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Reach:</strong> Pan-India delivery + select international destinations
        </PolicyBullet>
      </PolicySection>

      {/* Brand Facts */}
      <PolicySection icon={BarChart3} title="Brand Facts at a Glance" badge="Quick stats" index={1}>
        <p className="text-amber-200/60">
          A snapshot of our scale and offerings — useful for context in articles and feature stories.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-3 text-center">
            <p className="text-xl font-semibold text-amber-300 sm:text-2xl">1,200+</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-200/50 sm:text-xs">Curated SKUs</p>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-3 text-center">
            <p className="text-xl font-semibold text-amber-300 sm:text-2xl">25,000+</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-200/50 sm:text-xs">Orders Delivered</p>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-3 text-center">
            <p className="text-xl font-semibold text-amber-300 sm:text-2xl">7</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-200/50 sm:text-xs">Product Verticals</p>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-3 text-center">
            <p className="text-xl font-semibold text-amber-300 sm:text-2xl">4.8/5</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-200/50 sm:text-xs">Avg. Rating</p>
          </div>
        </div>
        <p className="text-xs text-amber-200/30 mt-2">
          * Figures are approximate and updated quarterly. Reach out to press@3boxes.in for the latest verified numbers.
        </p>
      </PolicySection>

      {/* Press Releases */}
      <PolicySection icon={Newspaper} title="Press Releases" badge="Latest" index={2}>
        <p className="text-amber-200/60">
          Recent announcements from 3 Boxes Luxury. Full text available on request.
        </p>
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3 sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-amber-200/90">3 Boxes Luxury launches AI-powered Virtual Try-On</p>
              <span className="text-[10px] uppercase tracking-wider text-amber-400/60 sm:text-xs">2025</span>
            </div>
            <p className="mt-1 text-xs text-amber-200/50">
              New in-house try-on engine lets customers preview jewelry, watches, and accessories on their
              own selfies before purchase — powered by a multi-backend AI pipeline.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3 sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-amber-200/90">Corporate Gifting portal crosses 500 enterprise clients</p>
              <span className="text-[10px] uppercase tracking-wider text-amber-400/60 sm:text-xs">2025</span>
            </div>
            <p className="mt-1 text-xs text-amber-200/50">
              B2B portal now serves over 500 companies across India with bulk gifting, branded packaging,
              CSV recipient import, and dedicated account managers.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3 sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-amber-200/90">Partnership with Shopify for unified storefront</p>
              <span className="text-[10px] uppercase tracking-wider text-amber-400/60 sm:text-xs">2024</span>
            </div>
            <p className="mt-1 text-xs text-amber-200/50">
              3 Boxes Luxury migrates commerce backend to Shopify Plus while keeping the custom luxury
              storefront experience intact.
            </p>
          </div>
        </div>
      </PolicySection>

      {/* Media Assets */}
      <PolicySection icon={ImageIcon} title="Media Assets & Brand Kit" badge="Download" index={3}>
        <p className="text-amber-200/60">
          High-resolution logos, product photography, and brand guidelines are available for press and
          partner use. All assets are provided royalty-free for editorial purposes only.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-200/90">Logo Pack</p>
            </div>
            <p className="mt-1 text-xs text-amber-200/50">
              PNG (transparent), SVG, and EPS variants in light, dark, and monochrome.
            </p>
            <a
              href="mailto:press@3boxes.in?subject=Logo Pack Request"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              <Download className="h-3.5 w-3.5" /> Request logo pack
            </a>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-200/90">Product Photography</p>
            </div>
            <p className="mt-1 text-xs text-amber-200/50">
              Curated hero shots, lifestyle imagery, and unboxing photos (300 DPI).
            </p>
            <a
              href="mailto:press@3boxes.in?subject=Product Photography Request"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              <Download className="h-3.5 w-3.5" /> Request photo set
            </a>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-200/90">Brand Guidelines</p>
            </div>
            <p className="mt-1 text-xs text-amber-200/50">
              Color palette, typography, voice &amp; tone, and usage do's &amp; don'ts (PDF).
            </p>
            <a
              href="mailto:press@3boxes.in?subject=Brand Guidelines Request"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              <Download className="h-3.5 w-3.5" /> Request guidelines
            </a>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-200/90">Executive Headshots</p>
            </div>
            <p className="mt-1 text-xs text-amber-200/50">
              Founder &amp; leadership team headshots in high resolution.
            </p>
            <a
              href="mailto:press@3boxes.in?subject=Executive Headshots Request"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              <Download className="h-3.5 w-3.5" /> Request headshots
            </a>
          </div>
        </div>
      </PolicySection>

      {/* Media Coverage */}
      <PolicySection icon={Quote} title="Selected Media Coverage" index={4}>
        <p className="text-amber-200/60">
          A selection of recent features and mentions. Full list available on request.
        </p>
        <div className="space-y-2">
          <PolicyBullet icon={ExternalLink}>
            <span className="text-amber-200/70">
              <strong className="text-amber-200/80">YourStory</strong> — How 3 Boxes Luxury is
              reimagining premium gifting in India
            </span>
          </PolicyBullet>
          <PolicyBullet icon={ExternalLink}>
            <span className="text-amber-200/70">
              <strong className="text-amber-200/80">Vogue India</strong> — The art of corporate
              gifting, decoded
            </span>
          </PolicyBullet>
          <PolicyBullet icon={ExternalLink}>
            <span className="text-amber-200/70">
              <strong className="text-amber-200/80">Economic Times Retail</strong> — Inside the
              rise of curated luxury gifting platforms
            </span>
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* Usage Guidelines */}
      <PolicySection
        icon={CheckCircle2}
        title="Usage Guidelines"
        badgeColor="bg-emerald-600/15 text-emerald-300 border-emerald-600/25"
        index={5}
      >
        <p className="text-amber-200/60">
          When using our brand assets, please observe these guidelines to keep our identity consistent.
        </p>
        <PolicyBullet icon={CheckCircle2}>
          Always use the official logo files — do not recreate, recolor, or stretch.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          Maintain clear space around the logo equal to at least the height of the "3" in the mark.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          Do not place the logo on busy backgrounds without a solid contrasting panel.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          Refer to the brand as <strong className="text-amber-200/80">&quot;3 Boxes Luxury&quot;</strong> on
          first mention; <strong className="text-amber-200/80">&quot;3BOXES&quot;</strong> is acceptable thereafter.
        </PolicyBullet>
      </PolicySection>

      {/* Press Contact */}
      <PolicySection icon={Mail} title="Press Contact" index={6}>
        <p className="text-amber-200/60">
          For interviews, product samples, embargoed stories, or anything else, our media team is here to help.
        </p>
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <PolicyBullet icon={Mail}>
            <strong className="text-amber-200/80">Email:</strong> press@3boxes.in
          </PolicyBullet>
          <PolicyBullet icon={Phone}>
            <strong className="text-amber-200/80">Phone:</strong> +91 9611533511
          </PolicyBullet>
          <PolicyBullet icon={Globe}>
            <strong className="text-amber-200/80">Website:</strong> 3boxes.in
          </PolicyBullet>
        </div>
        <p className="text-xs text-amber-200/30 mt-2">
          Response time: within 1 business day. For time-sensitive embargo requests, please mention
          &quot;URGENT — PRESS&quot; in the subject line.
        </p>
      </PolicySection>

      {/* Closing */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <Heart className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Thank you for covering 3 Boxes Luxury.</strong> We
            appreciate every story that helps more people discover thoughtful, curated gifting.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
