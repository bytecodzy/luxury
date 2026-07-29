'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  Truck,
  Globe,
  Clock,
  Package,
  CreditCard,
  AlertTriangle,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export function ShippingPage() {
  return (
    <PolicyPage
      title="Shipping Policy"
      subtitle="Everything you need to know about our delivery services"
      icon={Truck}
      badge="Pan-India"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <Truck className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            At <strong className="text-amber-300">3 Boxes Luxury Curations</strong>, we take great care 
            in packaging and delivering your luxury gifts. Every order is hand-packed with premium materials 
            to ensure your items arrive in perfect condition.
          </span>
        </div>
      </PolicyCallout>

      {/* Delivery Zones & Timelines */}
      <PolicySection icon={Globe} title="Delivery Zones & Timelines" badge="Estimates" index={0}>
        <p className="text-amber-200/60">
          We deliver across India and to select international destinations. Delivery timelines are 
          estimated from the date of dispatch, not the date of order placement.
        </p>
        <div className="overflow-x-auto rounded-lg border border-amber-900/15 bg-stone-800/30">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-amber-900/15 bg-stone-900/80">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Zone</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Standard Delivery</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Express Delivery</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/60">
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">Metro Cities (Delhi, Mumbai, Bengaluru, etc.)</td>
                <td className="px-4 py-2 text-xs">3–5 business days</td>
                <td className="px-4 py-2 text-xs">1–2 business days</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">Tier 1 & 2 Cities</td>
                <td className="px-4 py-2 text-xs">4–7 business days</td>
                <td className="px-4 py-2 text-xs">2–3 business days</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">Rest of India</td>
                <td className="px-4 py-2 text-xs">5–10 business days</td>
                <td className="px-4 py-2 text-xs">3–5 business days</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-xs">International (select countries)</td>
                <td className="px-4 py-2 text-xs">7–15 business days</td>
                <td className="px-4 py-2 text-xs">5–7 business days</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-amber-200/30 mt-2">
          * Delivery timelines are estimates and may vary during peak seasons, holidays, or due to 
          unforeseen circumstances.
        </p>
      </PolicySection>

      {/* Shipping Charges */}
      <PolicySection icon={CreditCard} title="Shipping Charges" badge="Free over ₹999" index={1}>
        <p className="text-amber-200/60">
          We offer competitive shipping rates and free delivery on qualifying orders.
        </p>
        <div className="overflow-x-auto rounded-lg border border-amber-900/15 bg-stone-800/30">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-amber-900/15 bg-stone-900/80">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Order Value</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Standard Shipping</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Express Shipping</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/60">
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">Below ₹999</td>
                <td className="px-4 py-2 text-xs">₹99</td>
                <td className="px-4 py-2 text-xs">₹199</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">₹999 – ₹4,999</td>
                <td className="px-4 py-2 text-xs text-emerald-300/80 font-medium">FREE</td>
                <td className="px-4 py-2 text-xs">₹149</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-xs">Above ₹4,999</td>
                <td className="px-4 py-2 text-xs text-emerald-300/80 font-medium">FREE</td>
                <td className="px-4 py-2 text-xs text-emerald-300/80 font-medium">FREE</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Corporate & Bulk Orders:</strong> Special shipping rates 
          available for bulk orders. Contact us at info@3boxes.in for details.
        </PolicyBullet>
      </PolicySection>

      {/* Order Processing */}
      <PolicySection icon={Clock} title="Order Processing" badge="Timeline" index={2}>
        <p className="text-amber-200/60">
          Understanding our order processing timeline helps you plan your gifting:
        </p>
        <PolicyBullet icon={Clock}>
          <strong className="text-amber-200/80">Order Confirmation:</strong> You'll receive an order 
          confirmation email within 30 minutes of placing your order.
        </PolicyBullet>
        <PolicyBullet icon={Package}>
          <strong className="text-amber-200/80">Processing Time:</strong> Orders are processed within 
          24–48 hours. Personalized/customized items may take 3–5 additional business days.
        </PolicyBullet>
        <PolicyBullet icon={Truck}>
          <strong className="text-amber-200/80">Dispatch Notification:</strong> You'll receive a shipping 
          confirmation email with tracking details once your order is dispatched.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Delivery:</strong> Your order arrives within the estimated 
          delivery window for your zone.
        </PolicyBullet>
      </PolicySection>

      {/* Packaging */}
      <PolicySection icon={Package} title="Premium Packaging" badge="Luxury" index={3}>
        <p className="text-amber-200/60">
          Every 3 Boxes Luxury order is packaged with the same care and attention we put into curating 
          our products:
        </p>
        <PolicyBullet>
          <strong className="text-amber-200/80">Signature Gift Box:</strong> Products arrive in our 
          premium matte black gift box with gold foil branding.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Protective Wrapping:</strong> Fragile items are 
          wrapped in protective materials to prevent damage during transit.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Gift Message:</strong> Personal messages are printed 
          on premium card stock and included inside the box.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Eco-Friendly:</strong> Our packaging uses recyclable 
          and sustainable materials wherever possible.
        </PolicyBullet>
      </PolicySection>

      {/* Important Notes */}
      <PolicySection icon={AlertTriangle} title="Important Notes" badgeColor="bg-rose-600/15 text-rose-300 border-rose-600/25" index={4}>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Delivery Attempts:</strong> Our courier partners will 
          attempt delivery 3 times. If delivery fails after 3 attempts, the order will be returned to 
          our warehouse and a re-delivery fee may apply.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Address Accuracy:</strong> Please ensure your delivery 
          address and contact number are correct. We are not responsible for delays caused by incorrect 
          address information.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Remote Areas:</strong> Delivery to remote or 
          hard-to-reach areas may take longer than estimated timelines.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Peak Seasons:</strong> During festivals (Diwali, 
          Christmas, Valentine's Day) delivery may take 1–2 additional days due to high demand.
        </PolicyBullet>
      </PolicySection>

      {/* Contact */}
      <PolicySection icon={Mail} title="Shipping Support" index={5}>
        <p className="text-amber-200/60">
          If you have questions about your shipment or need help tracking your order:
        </p>
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <PolicyBullet icon={Mail}>
            <strong className="text-amber-200/80">Email:</strong> info@3boxes.in
          </PolicyBullet>
          <PolicyBullet icon={Phone}>
            <strong className="text-amber-200/80">Phone:</strong> +91 9611533511
          </PolicyBullet>
          <PolicyBullet icon={MapPin}>
            <strong className="text-amber-200/80">Address:</strong> 338/14, Sri Nilyam, Yelahanka 
            New Town, Bengaluru - 560064
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* Closing */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Our guarantee:</strong> If your order arrives damaged, 
            we'll replace it at no additional cost. Simply contact us within 48 hours of delivery with 
            photos of the damage.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
