'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock,
  Globe,
  Building2,
  Send,
  Users,
  HelpCircle,
} from 'lucide-react';

export function ContactPage() {
  return (
    <PolicyPage
      title="Contact Us"
      subtitle="Let's connect and build something meaningful"
      icon={Phone}
      badge="We're Here"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            At <strong className="text-amber-300">3 Boxes Luxury Curations</strong>, we value every conversation. 
            Whether you have a question about our products, need help with an order, or want to explore 
            business opportunities, our team is here to assist you.
          </span>
        </div>
      </PolicyCallout>

      {/* Contact Details */}
      <PolicySection icon={Phone} title="Contact Details" badge="Reach Us" index={0}>
        <p className="text-amber-200/60">
          You can reach us through any of the following channels. Our team typically responds within 
          24 hours on business days.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200/90">Phone</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-amber-200/60">+91 9611533511</p>
              <p className="text-xs text-amber-200/30">Available Mon–Sat, 10 AM – 7 PM IST</p>
            </div>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200/90">Email</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-amber-200/60">info@3boxes.in</p>
              <p className="text-xs text-amber-200/30">For general inquiries</p>
              <p className="text-sm text-amber-200/60">info@3boxesconsulting.com</p>
              <p className="text-xs text-amber-200/30">For consulting services</p>
            </div>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200/90">WhatsApp</span>
            </div>
            <div className="space-y-1">
              <a 
                href="https://wa.me/919611533511" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                Chat with us on WhatsApp →
              </a>
              <p className="text-xs text-amber-200/30">Quick responses, typically within 1 hour</p>
            </div>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200/90">Business Hours</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-amber-200/60">Monday – Saturday</p>
              <p className="text-xs text-amber-200/30">10:00 AM – 7:00 PM IST</p>
              <p className="text-xs text-amber-200/30 mt-1">Sunday: Closed</p>
            </div>
          </div>
        </div>
      </PolicySection>

      {/* Office Address */}
      <PolicySection icon={MapPin} title="Corporate Office" badge="Bengaluru" index={1}>
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-200/90 mb-1">3 Boxes Luxury Curations</p>
              <p className="text-sm text-amber-200/60">
                338/14, Sri Nilyam,<br />
                3rd A Main, 4th A Cross,<br />
                A Sector, Yelahanka New Town,<br />
                Bengaluru - 560064<br />
                Karnataka, India
              </p>
            </div>
          </div>
        </div>
      </PolicySection>

      {/* Inquiry Types */}
      <PolicySection icon={Send} title="How Can We Help?" badge="Quick Links" index={2}>
        <p className="text-amber-200/60">
          To help us respond to your inquiry more efficiently, please use the appropriate channel:
        </p>
        <div className="space-y-2">
          <PolicyBullet icon={HelpCircle}>
            <strong className="text-amber-200/80">Product & Order Support:</strong> Email info@3boxes.in or WhatsApp us for order tracking, returns, exchanges, or product questions.
          </PolicyBullet>
          <PolicyBullet icon={Users}>
            <strong className="text-amber-200/80">Corporate & Bulk Gifting:</strong> Email info@3boxes.in for custom gift hampers, bulk orders, and corporate gifting solutions.
          </PolicyBullet>
          <PolicyBullet icon={Globe}>
            <strong className="text-amber-200/80">Consulting & Staffing:</strong> Email info@3boxesconsulting.com for strategic consulting and staffing inquiries.
          </PolicyBullet>
          <PolicyBullet icon={Building2}>
            <strong className="text-amber-200/80">Business Partnerships:</strong> Email info@3boxes.in with the subject line "Partnership Inquiry" for collaboration opportunities.
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* Closing */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            We're committed to providing exceptional service. If you don't receive a response within 24 hours, 
            please WhatsApp us at <strong className="text-emerald-300">+91 9611533511</strong> for immediate assistance.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
