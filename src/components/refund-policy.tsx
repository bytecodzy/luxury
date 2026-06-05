'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Mail,
  Truck,
  CreditCard,
  AlertTriangle,
  Clock,
  ShieldCheck,
  PackageCheck,
  ArrowRightLeft,
  Globe,
  Bug,
  Camera,
  Tag,
} from 'lucide-react';

export function RefundPolicy() {
  return (
    <PolicyPage
      title="Refund Policy"
      subtitle="Our commitment to your satisfaction with every luxury purchase"
      icon={RotateCcw}
      badge="7-Day Returns"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <PackageCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            At <strong className="text-amber-300">3 Boxes Luxury</strong>, we want you to be completely delighted with
            every purchase. If for any reason you are not satisfied, we offer a straightforward return and refund
            process. Please read this policy carefully to understand your options.
          </span>
        </div>
      </PolicyCallout>

      {/* 1. Return Eligibility */}
      <PolicySection icon={CheckCircle2} title="Return Eligibility" badge="7 Days" badgeColor="bg-emerald-600/15 text-emerald-300 border-emerald-600/25" index={0}>
        <p className="text-amber-200/60">
          We accept returns within <strong className="text-amber-200/80">7 days</strong> from the date of delivery,
          provided the following conditions are met:
        </p>
        <PolicyBullet icon={CheckCircle2}>
          The item must be <strong className="text-amber-200/80">unused, unworn, and unwashed</strong>.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          The item must be in its <strong className="text-amber-200/80">original packaging</strong> with all tags, labels, and accessories intact.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          A valid <strong className="text-amber-200/80">proof of purchase</strong> (order confirmation email or invoice) must be provided.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          The return must be <strong className="text-amber-200/80">initiated within 7 calendar days</strong> of delivery.
        </PolicyBullet>
        <PolicyBullet icon={Camera}>
          <strong className="text-amber-200/80">Photographic evidence</strong> may be required for certain returns to verify the condition of the item.
        </PolicyBullet>
        <PolicyCallout variant="success">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
            <span>
              <strong className="text-emerald-300">Hassle-free returns:</strong> We believe luxury should be effortless. If your item meets these conditions,
              we will process your return promptly — no unnecessary delays or complicated procedures.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 2. Non-Returnable Items */}
      <PolicySection icon={XCircle} title="Non-Returnable Items" badge="Exclusions" badgeColor="bg-rose-600/15 text-rose-300 border-rose-600/25" index={1}>
        <p className="text-amber-200/60">
          For hygiene, safety, and customization reasons, the following items <strong className="text-amber-200/80">cannot be returned</strong>:
        </p>
        <PolicyBullet icon={Tag}>
          <strong className="text-amber-200/80">Personalized & engraved items:</strong> Products that have been customized, monogrammed, or engraved specifically for you.
        </PolicyBullet>
        <PolicyBullet icon={XCircle}>
          <strong className="text-amber-200/80">Intimate & personal care items:</strong> Swimwear, lingerie, fragrances (once seal is broken), and personal care products.
        </PolicyBullet>
        <PolicyBullet icon={XCircle}>
          <strong className="text-amber-200/80">Perishable goods:</strong> Gourmet food items, candles (once opened), and items with a limited shelf life.
        </PolicyBullet>
        <PolicyBullet icon={XCircle}>
          <strong className="text-amber-200/80">Gift cards & vouchers:</strong> All gift cards, store credits, and promotional vouchers are non-refundable.
        </PolicyBullet>
        <PolicyBullet icon={XCircle}>
          <strong className="text-amber-200/80">Items marked &quot;Final Sale&quot;:</strong> Products explicitly sold as non-returnable at the time of purchase.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Sarees with altered fall/pico:</strong> Sarees that have been altered with fall or pico stitching cannot be returned.
        </PolicyBullet>
        <PolicyCallout variant="warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
            <span>
              If a non-returnable item arrives damaged or defective, please contact us immediately — we will address
              it on a case-by-case basis.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 3. How to Initiate a Return */}
      <PolicySection icon={RotateCcw} title="How to Initiate a Return" index={2}>
        <p className="text-amber-200/60">
          Starting a return is simple. Follow these steps:
        </p>
        <div className="rounded-lg bg-stone-800/50 border border-amber-900/15 p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400/70 mb-2">Return Process</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/15 text-amber-300 text-xs font-bold flex-shrink-0">1</div>
            <span className="text-amber-200/60">Log in to your account and navigate to &quot;My Orders&quot;</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/15 text-amber-300 text-xs font-bold flex-shrink-0">2</div>
            <span className="text-amber-200/60">Select the order and item you wish to return</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/15 text-amber-300 text-xs font-bold flex-shrink-0">3</div>
            <span className="text-amber-200/60">Choose a reason for the return and upload photos if required</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/15 text-amber-300 text-xs font-bold flex-shrink-0">4</div>
            <span className="text-amber-200/60">Submit your return request — you will receive a confirmation email</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/15 text-amber-300 text-xs font-bold flex-shrink-0">5</div>
            <span className="text-amber-200/60">Pack the item securely and hand it to our courier or drop it at the designated location</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-600/15 text-emerald-300 text-xs font-bold flex-shrink-0">✓</div>
            <span className="text-emerald-200/70">We inspect the item and process your refund</span>
          </div>
        </div>
        <PolicyBullet icon={Mail}>
          Alternatively, you can email us at <strong className="text-amber-200/80">info@3boxes.in</strong> with your order number and reason for return.
        </PolicyBullet>
        <PolicyBullet icon={Clock}>
          Return requests are reviewed within <strong className="text-amber-200/80">24–48 hours</strong> on business days.
        </PolicyBullet>
      </PolicySection>

      {/* 4. Refund Process */}
      <PolicySection icon={CreditCard} title="Refund Process" badge="5-7 Days" badgeColor="bg-sky-600/15 text-sky-300 border-sky-600/25" index={3}>
        <p className="text-amber-200/60">
          Once we receive and inspect your returned item, we will process the refund as follows:
        </p>
        <PolicyBullet icon={PackageCheck}>
          <strong className="text-amber-200/80">Inspection:</strong> Our team will inspect the returned item within 2–3 business days of receipt to verify it meets return conditions.
        </PolicyBullet>
        <PolicyBullet icon={CreditCard}>
          <strong className="text-amber-200/80">Original Payment Method:</strong> Refunds are issued to the original payment method used for the purchase.
        </PolicyBullet>
        <PolicyBullet icon={Clock}>
          <strong className="text-amber-200/80">Processing Time:</strong> Refunds are processed within <strong className="text-amber-200/80">5–7 business days</strong> after the item passes inspection.
        </PolicyBullet>
        <PolicyBullet icon={Mail}>
          <strong className="text-amber-200/80">Notification:</strong> You will receive an email confirmation once the refund has been initiated.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Bank Processing:</strong> Please allow an additional 3–5 business days for the refund to reflect in your account, depending on your bank or payment provider.
        </PolicyBullet>
        <PolicyCallout variant="info">
          <div className="flex items-start gap-2">
            <CreditCard className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <span>
              <strong className="text-amber-300">Store Credit Option:</strong> You may also opt for store credit instead of a refund, which is issued instantly
              and can be used for future purchases on our platform.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 5. Exchange Policy */}
      <PolicySection icon={ArrowRightLeft} title="Exchange Policy" index={4}>
        <p className="text-amber-200/60">
          We offer exchanges for size, color, or variant changes on eligible items.
        </p>
        <PolicyBullet icon={ArrowRightLeft}>
          Exchanges are subject to <strong className="text-amber-200/80">availability of the requested item</strong>.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          The same 7-day eligibility window applies — the exchange request must be initiated within 7 days of delivery.
        </PolicyBullet>
        <PolicyBullet icon={Truck}>
          If the exchanged item is of higher value, you will need to pay the difference. If it is of lower value, the difference will be refunded.
        </PolicyBullet>
        <PolicyBullet>
          Only <strong className="text-amber-200/80">one exchange</strong> is permitted per order item. The exchanged item cannot be exchanged again.
        </PolicyBullet>
        <PolicyBullet>
          Exchanges follow the same condition requirements as returns — unused, original packaging, all tags intact.
        </PolicyBullet>
      </PolicySection>

      {/* 6. Damaged/Defective Items */}
      <PolicySection icon={Bug} title="Damaged or Defective Items" badge="Priority" badgeColor="bg-rose-600/15 text-rose-300 border-rose-600/25" index={5}>
        <p className="text-amber-200/60">
          If you receive a damaged, defective, or incorrect item, we take full responsibility and will resolve
          the issue as a priority.
        </p>
        <PolicyBullet icon={Camera}>
          <strong className="text-amber-200/80">Report within 48 hours:</strong> Please notify us within 48 hours of delivery with photographic evidence of the damage or defect.
        </PolicyBullet>
        <PolicyBullet icon={Bug}>
          <strong className="text-amber-200/80">No return shipping cost:</strong> For damaged or defective items, we cover all return shipping charges.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Full refund or replacement:</strong> Choose between a full refund (including shipping charges) or a replacement item.
        </PolicyBullet>
        <PolicyBullet icon={Truck}>
          <strong className="text-amber-200/80">Priority processing:</strong> Damaged/defective item claims are processed within 24 hours.
        </PolicyBullet>
        <PolicyCallout variant="warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
            <span>
              Please do not discard the original packaging for damaged items — it may be needed for our investigation
              and courier pickup. Keep all packaging materials until the claim is resolved.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 7. Contact for Returns */}
      <PolicySection icon={Mail} title="Contact for Returns" index={6}>
        <p className="text-amber-200/60">
          For any return, exchange, or refund inquiries, please reach out to our dedicated support team:
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
            <strong className="text-amber-200/80">WhatsApp:</strong> +91 9611533511
          </PolicyBullet>
          <PolicyBullet>
            <strong className="text-amber-200/80">Address:</strong> Bengaluru, Karnataka, India
          </PolicyBullet>
        </div>
        <p className="text-amber-200/50 text-xs mt-3">
          Our support team is available Monday to Saturday, 10:00 AM to 7:00 PM IST.
        </p>
      </PolicySection>

      {/* Closing */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Our guarantee:</strong> Every product on 3 Boxes Luxury is 100% authentic and quality-checked
            before dispatch. We stand behind the quality of our luxury curation and are committed to making your
            experience exceptional — from browsing to delivery and beyond.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
