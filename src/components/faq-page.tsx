'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  HelpCircle,
  Package,
  Truck,
  RotateCcw,
  CreditCard,
  ShieldCheck,
  Clock,
  Gift,
  MessageCircle,
  Phone,
  Mail,
} from 'lucide-react';

export function FAQPage() {
  return (
    <PolicyPage
      title="Frequently Asked Questions"
      subtitle="Answers to common questions about our products and services"
      icon={HelpCircle}
      badge="Help Center"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            Can't find what you're looking for? Reach out to us at{' '}
            <strong className="text-amber-300">info@3boxes.in</strong> or WhatsApp us at{' '}
            <strong className="text-amber-300">+91 9611533511</strong> — we're happy to help!
          </span>
        </div>
      </PolicyCallout>

      {/* Orders & Products */}
      <PolicySection icon={Package} title="Orders & Products" index={0}>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">How do I place an order?</p>
            <p className="text-xs text-amber-200/50">
              Browse our collection, add items to your cart, and proceed to checkout. You can pay securely 
              using credit/debit cards, UPI, net banking, or cash on delivery (for eligible orders).
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">Can I modify or cancel my order?</p>
            <p className="text-xs text-amber-200/50">
              You can modify or cancel your order within 2 hours of placing it. After that, orders enter 
              processing and cannot be changed. Please contact us immediately if you need to make changes.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">Are your products authentic?</p>
            <p className="text-xs text-amber-200/50">
              Absolutely. All products on 3 Boxes Luxury are 100% authentic and sourced directly from 
              authorized manufacturers and distributors. We stand behind the quality of every item we sell.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">Do you offer gift wrapping?</p>
            <p className="text-xs text-amber-200/50">
              Yes! All our gifts come elegantly packaged in our signature luxury gift boxes. For special 
              occasions, we offer premium gift wrapping with personalized messages at no extra cost.
            </p>
          </div>
        </div>
      </PolicySection>

      {/* Shipping & Delivery */}
      <PolicySection icon={Truck} title="Shipping & Delivery" index={1}>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">How long does delivery take?</p>
            <p className="text-xs text-amber-200/50">
              Standard delivery takes 3–7 business days across India. Express delivery (2–3 business days) 
              is available in select metro cities. International delivery takes 7–15 business days.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">Is shipping free?</p>
            <p className="text-xs text-amber-200/50">
              We offer free standard shipping on orders above ₹999. For orders below ₹999, a nominal 
              shipping fee of ₹99 applies. Express delivery charges vary by location.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">How can I track my order?</p>
            <p className="text-xs text-amber-200/50">
              Once your order ships, you'll receive a tracking number via email and SMS. You can also 
              track your order in real-time through the "Track Order" section on our website.
            </p>
          </div>
        </div>
      </PolicySection>

      {/* Returns & Refunds */}
      <PolicySection icon={RotateCcw} title="Returns & Refunds" index={2}>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">What is your return policy?</p>
            <p className="text-xs text-amber-200/50">
              We offer a 7-day return policy for most products. Items must be unused, in original packaging, 
              and with all tags attached. Personalized/customized items and perishable goods are non-returnable.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">How do I initiate a return?</p>
            <p className="text-xs text-amber-200/50">
              Go to your order history, select the item you wish to return, and follow the return process. 
              You can also contact our support team via email or WhatsApp for assistance.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">How long do refunds take?</p>
            <p className="text-xs text-amber-200/50">
              Refunds are processed within 5–7 business days after we receive the returned item. The amount 
              will be credited to your original payment method. Bank processing may take an additional 3–5 days.
            </p>
          </div>
        </div>
      </PolicySection>

      {/* Payment & Security */}
      <PolicySection icon={CreditCard} title="Payment & Security" index={3}>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">What payment methods do you accept?</p>
            <p className="text-xs text-amber-200/50">
              We accept Visa, Mastercard, RuPay, American Express credit/debit cards, UPI (Google Pay, 
              PhonePe, Paytm), net banking from all major banks, and cash on delivery for eligible orders.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">Is my payment information secure?</p>
            <p className="text-xs text-amber-200/50">
              Absolutely. All transactions are encrypted using TLS 1.3 and processed through PCI-DSS compliant 
              payment gateways. We never store your card details on our servers.
            </p>
          </div>
        </div>
      </PolicySection>

      {/* Corporate Gifting */}
      <PolicySection icon={Gift} title="Corporate & Bulk Gifting" index={4}>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">Do you offer corporate gifting solutions?</p>
            <p className="text-xs text-amber-200/50">
              Yes! We specialize in premium corporate gifting with custom hampers, branded merchandise, 
              and personalized gift boxes for employee appreciation, client gifts, festivals, and events.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">Can I customize gifts with my company logo?</p>
            <p className="text-xs text-amber-200/50">
              Yes, we offer full customization including company branding, personalized messages, and custom 
              packaging. Minimum order quantities apply for custom items. Contact us for a tailored quote.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/10 bg-stone-800/20 p-3">
            <p className="text-sm font-medium text-amber-200/90 mb-1">Do you offer bulk discounts?</p>
            <p className="text-xs text-amber-200/50">
              Yes, we offer competitive bulk pricing for orders of 10+ units. The discount increases with 
              order volume. Contact us at info@3boxes.in for a custom quote.
            </p>
          </div>
        </div>
      </PolicySection>

      {/* Still Need Help */}
      <PolicySection icon={MessageCircle} title="Still Need Help?" index={5}>
        <p className="text-amber-200/60">
          If your question isn't answered here, our team is ready to assist you through any of these channels:
        </p>
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <PolicyBullet icon={Mail}>
            <strong className="text-amber-200/80">Email:</strong> info@3boxes.in
          </PolicyBullet>
          <PolicyBullet icon={Phone}>
            <strong className="text-amber-200/80">Phone:</strong> +91 9611533511
          </PolicyBullet>
          <PolicyBullet icon={MessageCircle}>
            <strong className="text-amber-200/80">WhatsApp:</strong> Chat with us at wa.me/919611533511
          </PolicyBullet>
          <PolicyBullet icon={Clock}>
            <strong className="text-amber-200/80">Hours:</strong> Mon–Sat, 10 AM – 7 PM IST
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* Closing */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            At 3 Boxes Luxury, your satisfaction is our priority. If you're not completely happy with your 
            experience, please let us know and we'll make it right.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
