'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  Eye,
  UserCheck,
  Database,
  Cookie,
  Share2,
  Lock,
  ShieldCheck,
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Globe,
  Scale,
} from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <PolicyPage
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your personal information"
      icon={Eye}
      badge="GDPR Ready"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            At <strong className="text-amber-300">3 Boxes Luxury</strong>, your privacy is as important to us as the
            luxury experience we curate. This Privacy Policy explains what information we collect, how we use it,
            and the steps we take to protect your personal data in compliance with applicable Indian and international
            data protection laws.
          </span>
        </div>
      </PolicyCallout>

      {/* 1. Information We Collect */}
      <PolicySection icon={Database} title="Information We Collect" index={0}>
        <p className="text-amber-200/60">
          We collect information that you provide directly to us, as well as information that is gathered
          automatically when you interact with our platform.
        </p>

        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-200/90">Personal Information</span>
          </div>
          <PolicyBullet>
            Full name, email address, phone number, and billing/shipping addresses
          </PolicyBullet>
          <PolicyBullet>
            Date of birth and gender (optional, for personalized recommendations)
          </PolicyBullet>
          <PolicyBullet>
            Government-issued ID (only when required for order verification or compliance)
          </PolicyBullet>
          <PolicyBullet>
            Profile photographs (selfie uploads for identity verification, processed and deleted per our Security Policy)
          </PolicyBullet>
        </div>

        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-200/90">Usage Data</span>
          </div>
          <PolicyBullet>
            Browsing patterns, pages visited, time spent on each page, and click interactions
          </PolicyBullet>
          <PolicyBullet>
            Device information (browser type, operating system, screen resolution)
          </PolicyBullet>
          <PolicyBullet>
            IP address, approximate geolocation (city/country level), and referral source
          </PolicyBullet>
          <PolicyBullet>
            Search queries and product preferences within our platform
          </PolicyBullet>
        </div>

        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Cookie className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-200/90">Cookies & Tracking</span>
          </div>
          <PolicyBullet>
            Session cookies for authentication and cart persistence
          </PolicyBullet>
          <PolicyBullet>
            Analytics cookies to understand how users interact with our platform
          </PolicyBullet>
          <PolicyBullet>
            Marketing cookies (with your consent) to deliver personalized recommendations
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* 2. How We Use Your Information */}
      <PolicySection icon={FileText} title="How We Use Your Information" badge="Essential" index={1}>
        <p className="text-amber-200/60">
          Your information is used solely to deliver and improve the luxury shopping experience you expect from us.
        </p>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Order Processing:</strong> To fulfill purchases, process payments, arrange delivery, and provide order updates.
        </PolicyBullet>
        <PolicyBullet icon={Mail}>
          <strong className="text-amber-200/80">Communication:</strong> To send order confirmations, shipping notifications, and respond to your inquiries.
        </PolicyBullet>
        <PolicyBullet icon={Globe}>
          <strong className="text-amber-200/80">Personalization:</strong> To tailor product recommendations, curate content, and enhance your browsing experience.
        </PolicyBullet>
        <PolicyBullet icon={ShieldCheck}>
          <strong className="text-amber-200/80">Security:</strong> To verify your identity, detect fraud, and protect against unauthorized access.
        </PolicyBullet>
        <PolicyBullet icon={Database}>
          <strong className="text-amber-200/80">Improvement:</strong> To analyze usage patterns, optimize our platform, and develop new features.
        </PolicyBullet>
        <PolicyBullet icon={Scale}>
          <strong className="text-amber-200/80">Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes.
        </PolicyBullet>
      </PolicySection>

      {/* 3. Information Sharing */}
      <PolicySection icon={Share2} title="Information Sharing" badge="Restricted" badgeColor="bg-rose-600/15 text-rose-300 border-rose-600/25" index={2}>
        <p className="text-amber-200/60">
          We do <strong className="text-amber-200/80">not</strong> sell, rent, or trade your personal information to third parties for their
          marketing purposes. We share information only in the following limited circumstances:
        </p>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Service Providers:</strong> Trusted partners who assist with payment processing, shipping, email delivery, and analytics — bound by strict confidentiality agreements.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Legal Requirements:</strong> When required by law, court order, or governmental regulation, we may disclose information to comply with legal obligations.
        </PolicyBullet>
        <PolicyBullet icon={ShieldCheck}>
          <strong className="text-amber-200/80">Fraud Prevention:</strong> To protect against fraud, security breaches, or activities that may violate our Terms of Service.
        </PolicyBullet>
        <PolicyBullet icon={UserCheck}>
          <strong className="text-amber-200/80">With Your Consent:</strong> When you have explicitly given us permission to share your information for a specific purpose.
        </PolicyBullet>
        <PolicyCallout variant="warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
            <span>
              We will never share your payment card details with any third party. All payment processing is handled
              through PCI-compliant, encrypted payment gateways.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 4. Data Security */}
      <PolicySection icon={Lock} title="Data Security" badge="Encrypted" badgeColor="bg-sky-600/15 text-sky-300 border-sky-600/25" index={3}>
        <p className="text-amber-200/60">
          We implement industry-standard security measures to protect your personal data from unauthorized access,
          alteration, disclosure, or destruction.
        </p>
        <PolicyBullet icon={Lock}>
          <strong className="text-amber-200/80">Encryption in Transit:</strong> All data is encrypted using TLS 1.3 when transmitted between your device and our servers.
        </PolicyBullet>
        <PolicyBullet icon={ShieldCheck}>
          <strong className="text-amber-200/80">Encryption at Rest:</strong> Stored data is encrypted using AES-256 encryption standards.
        </PolicyBullet>
        <PolicyBullet icon={Database}>
          <strong className="text-amber-200/80">Secure Storage:</strong> Personal data is stored on secured servers with strict access controls, firewalls, and intrusion detection systems.
        </PolicyBullet>
        <PolicyBullet icon={Eye}>
          <strong className="text-amber-200/80">Access Controls:</strong> Only authorized personnel with a legitimate business need can access personal data, and all access is logged and audited.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Regular Audits:</strong> We conduct regular security assessments and penetration testing to identify and address vulnerabilities.
        </PolicyBullet>
      </PolicySection>

      {/* 5. Your Rights */}
      <PolicySection icon={Scale} title="Your Rights" badge="Empowered" badgeColor="bg-emerald-600/15 text-emerald-300 border-emerald-600/25" index={4}>
        <p className="text-amber-200/60">
          You have complete control over your personal data. We respect your rights and are committed to
          facilitating them promptly.
        </p>
        <PolicyBullet icon={Eye}>
          <strong className="text-amber-200/80">Right to Access:</strong> You can request a copy of the personal data we hold about you at any time.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Right to Correction:</strong> You can update or correct your personal information through your account settings or by contacting us.
        </PolicyBullet>
        <PolicyBullet icon={Trash2}>
          <strong className="text-amber-200/80">Right to Deletion:</strong> You can request the complete deletion of your personal data, subject to legal retention requirements.
        </PolicyBullet>
        <PolicyBullet icon={Share2}>
          <strong className="text-amber-200/80">Right to Data Portability:</strong> You can request your data in a structured, machine-readable format.
        </PolicyBullet>
        <PolicyBullet icon={Cookie}>
          <strong className="text-amber-200/80">Right to Opt Out:</strong> You can opt out of marketing communications and manage cookie preferences at any time.
        </PolicyBullet>
        <PolicyCallout variant="success">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
            <span>
              To exercise any of these rights, simply email us at{' '}
              <strong className="text-emerald-300">info@3boxes.in</strong> or contact us through your account dashboard.
              We respond to all requests within 30 days.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 6. Cookie Policy Overview */}
      <PolicySection icon={Cookie} title="Cookie Policy Overview" index={5}>
        <p className="text-amber-200/60">
          Our platform uses cookies and similar tracking technologies to enhance your browsing experience.
          For a detailed explanation, please refer to our full Cookie Policy.
        </p>
        <PolicyBullet>
          <strong className="text-amber-200/80">Essential Cookies:</strong> Required for the website to function properly (authentication, cart, security).
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Analytics Cookies:</strong> Help us understand how visitors interact with our platform.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Functionality Cookies:</strong> Remember your preferences (currency, language, theme).
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Marketing Cookies:</strong> Used to deliver personalized product recommendations (requires consent).
        </PolicyBullet>
        <PolicyBullet>
          You can manage or disable non-essential cookies through your browser settings at any time.
        </PolicyBullet>
      </PolicySection>

      {/* 7. Contact */}
      <PolicySection icon={Mail} title="Contact Us" index={6}>
        <p className="text-amber-200/60">
          If you have any questions, concerns, or requests regarding this Privacy Policy or how your data is handled,
          please reach out to us:
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
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Our promise:</strong> We are committed to transparency and accountability in how we handle your data.
            This policy may be updated periodically — we will always notify you of material changes via email or a prominent notice on our platform.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
