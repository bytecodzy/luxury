'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  Cookie,
  ShieldCheck,
  BarChart3,
  Settings,
  Megaphone,
  Globe,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ExternalLink,
  Info,
} from 'lucide-react';

export function CookiePolicy() {
  return (
    <PolicyPage
      title="Cookie Policy"
      subtitle="How we use cookies and similar technologies on our platform"
      icon={Cookie}
      badge="Transparent"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <Cookie className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            At <strong className="text-amber-300">3 Boxes Luxury</strong>, we use cookies and similar technologies
            to provide you with a seamless, personalized, and secure luxury shopping experience. This Cookie Policy
            explains what cookies are, how we use them, and how you can manage your preferences.
          </span>
        </div>
      </PolicyCallout>

      {/* 1. What Are Cookies */}
      <PolicySection icon={Info} title="What Are Cookies?" index={0}>
        <p className="text-amber-200/60">
          Cookies are small text files that are placed on your device (computer, tablet, or mobile phone) when you
          visit a website. They are widely used to make websites work more efficiently and to provide information to
          the owners of the site.
        </p>
        <PolicyBullet>
          <strong className="text-amber-200/80">First-party cookies</strong> are set by us directly when you visit our platform.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Third-party cookies</strong> are set by our trusted partners and service providers.
        </PolicyBullet>
        <PolicyBullet>
          Cookies can be <strong className="text-amber-200/80">session cookies</strong> (deleted when you close your browser) or{' '}
          <strong className="text-amber-200/80">persistent cookies</strong> (remain until they expire or are deleted).
        </PolicyBullet>
        <PolicyBullet>
          Similar technologies include web beacons, pixel tags, and local storage — all used to enhance your experience.
        </PolicyBullet>
      </PolicySection>

      {/* 2. Types of Cookies We Use */}
      <PolicySection icon={Cookie} title="Types of Cookies We Use" badge="4 Categories" index={1}>
        <p className="text-amber-200/60">
          We categorize the cookies used on our platform into four types based on their purpose and function.
        </p>

        {/* Essential */}
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-amber-200/90">1. Essential Cookies</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/15 text-emerald-300 border border-emerald-600/25">Always Active</span>
          </div>
          <p className="text-amber-200/50 text-xs mb-2">
            These cookies are strictly necessary for the website to function. They cannot be disabled.
          </p>
          <PolicyBullet>
            <strong className="text-amber-200/80">Session authentication:</strong> Keeps you logged in as you navigate the site.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Shopping cart:</strong> Preserves items in your cart across page navigation.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Security tokens:</strong> Protects against CSRF attacks and ensures request authenticity.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Load balancing:</strong> Distributes traffic across servers for reliable performance.
          </PolicyBullet>
        </div>

        {/* Analytics */}
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-semibold text-amber-200/90">2. Analytics Cookies</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-600/15 text-sky-300 border border-sky-600/25">Opt-in</span>
          </div>
          <p className="text-amber-200/50 text-xs mb-2">
            These cookies help us understand how visitors interact with our platform so we can improve it.
          </p>
          <PolicyBullet>
            <strong className="text-amber-200/80">Page views & navigation:</strong> Tracks which pages are visited and for how long.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">User flow analysis:</strong> Helps us understand the typical journey from browsing to purchase.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Error tracking:</strong> Identifies broken links, slow pages, or technical issues.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Device & browser data:</strong> Aggregated statistics about devices and browsers used.
          </PolicyBullet>
        </div>

        {/* Functionality */}
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-200/90">3. Functionality Cookies</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/15 text-amber-300 border border-amber-600/25">Opt-in</span>
          </div>
          <p className="text-amber-200/50 text-xs mb-2">
            These cookies remember your preferences and choices to provide a more personalized experience.
          </p>
          <PolicyBullet>
            <strong className="text-amber-200/80">Language & currency:</strong> Remembers your preferred language and currency settings.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Theme preference:</strong> Stores your light/dark mode selection.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Recently viewed:</strong> Remembers products you have recently browsed.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Wishlist:</strong> Preserves your saved items for future visits.
          </PolicyBullet>
        </div>

        {/* Marketing */}
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-semibold text-amber-200/90">4. Marketing Cookies</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600/15 text-rose-300 border border-rose-600/25">Consent Required</span>
          </div>
          <p className="text-amber-200/50 text-xs mb-2">
            These cookies are used to deliver personalized product recommendations and relevant advertisements.
          </p>
          <PolicyBullet>
            <strong className="text-amber-200/80">Product recommendations:</strong> Suggests products based on your browsing and purchase history.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Retargeting:</strong> Shows relevant 3 Boxes Luxury ads on other platforms you visit.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Campaign tracking:</strong> Measures the effectiveness of our marketing campaigns and promotions.
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Social media integration:</strong> Enables sharing and social features on our platform.
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* 3. How to Manage Cookies */}
      <PolicySection icon={Settings} title="How to Manage Cookies" badge="Your Choice" badgeColor="bg-emerald-600/15 text-emerald-300 border-emerald-600/25" index={2}>
        <p className="text-amber-200/60">
          You have the right to decide whether to accept or reject cookies. Here is how you can manage your cookie preferences:
        </p>
        <PolicyBullet icon={Settings}>
          <strong className="text-amber-200/80">Cookie Banner:</strong> When you first visit our platform, a cookie consent banner allows you to accept or customize your cookie preferences.
        </PolicyBullet>
        <PolicyBullet icon={Settings}>
          <strong className="text-amber-200/80">Browser Settings:</strong> Most web browsers allow you to manage cookies through their settings. You can set your browser to refuse cookies or alert you when a cookie is being set.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Disabling Essential Cookies:</strong> Please note that disabling essential cookies may affect the functionality of our platform, including the ability to log in, maintain a shopping cart, or complete a purchase.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Opt-out Links:</strong> For third-party advertising cookies, you can also opt out through industry tools such as the Network Advertising Initiative opt-out page.
        </PolicyBullet>
        <PolicyCallout variant="warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
            <span>
              If you delete all cookies on your device, you will need to set your preferences again on your next visit.
              Clearing cookies will also log you out of your account.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 4. Third-Party Cookies */}
      <PolicySection icon={ExternalLink} title="Third-Party Cookies" index={3}>
        <p className="text-amber-200/60">
          Some cookies on our platform are set by trusted third-party services that help us operate and improve our platform.
        </p>
        <PolicyBullet icon={BarChart3}>
          <strong className="text-amber-200/80">Analytics Providers:</strong> Services like Google Analytics help us understand platform usage through aggregated, anonymized data.
        </PolicyBullet>
        <PolicyBullet icon={ShieldCheck}>
          <strong className="text-amber-200/80">Payment Processors:</strong> Secure payment gateways may set cookies to process and verify transactions.
        </PolicyBullet>
        <PolicyBullet icon={Megaphone}>
          <strong className="text-amber-200/80">Advertising Partners:</strong> Approved advertising platforms may set cookies for retargeting and campaign measurement (requires your consent).
        </PolicyBullet>
        <PolicyBullet icon={Lock}>
          <strong className="text-amber-200/80">Security Services:</strong> Fraud detection and bot prevention services may use cookies to protect the platform.
        </PolicyBullet>
        <PolicyBullet>
          We carefully vet all third-party services and require them to comply with applicable data protection laws.
          We do not control third-party cookies and recommend reviewing their individual privacy policies.
        </PolicyBullet>
      </PolicySection>

      {/* 5. Contact */}
      <PolicySection icon={Mail} title="Contact Us" index={4}>
        <p className="text-amber-200/60">
          If you have questions about our use of cookies or this Cookie Policy, please contact us:
        </p>
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <PolicyBullet icon={Mail}>
            <strong className="text-amber-200/80">Email:</strong> info@3boxes.in
          </PolicyBullet>
          <PolicyBullet icon={Globe}>
            <strong className="text-amber-200/80">Website:</strong> www.3boxesluxury.com
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Phone:</strong> +91 9611533511
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Address:</strong> Bengaluru, Karnataka, India
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* Closing */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Your privacy matters.</strong> We only use cookies to enhance your luxury shopping experience
            and will always respect your choices regarding cookie preferences. This policy may be updated from time to time —
            any changes will be reflected on this page.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
