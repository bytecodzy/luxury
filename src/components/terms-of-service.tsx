'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  FileText,
  UserCheck,
  Tag,
  CreditCard,
  Truck,
  RotateCcw,
  Shield,
  AlertTriangle,
  Scale,
  Mail,
  CheckCircle2,
  Globe,
  Lock,
  Gavel,
  Store,
} from 'lucide-react';

export function TermsOfService() {
  return (
    <PolicyPage
      title="Terms of Service"
      subtitle="The rules and guidelines that govern your use of our platform"
      icon={FileText}
      badge="Legal"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <Gavel className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            By accessing or using the <strong className="text-amber-300">3 Boxes Luxury</strong> platform
            (website and mobile applications), you agree to be bound by these Terms of Service. Please read
            them carefully before making any purchase or using our services.
          </span>
        </div>
      </PolicyCallout>

      {/* 1. Acceptance of Terms */}
      <PolicySection icon={CheckCircle2} title="Acceptance of Terms" index={0}>
        <p className="text-amber-200/60">
          By creating an account, browsing our platform, or placing an order, you acknowledge that you have
          read, understood, and agree to be bound by these Terms of Service, our Privacy Policy, and all
          applicable policies referenced herein.
        </p>
        <PolicyBullet>
          These terms apply to all users: customers, corporate clients, agents, team members, and visitors.
        </PolicyBullet>
        <PolicyBullet>
          If you do not agree with any part of these terms, you must discontinue use of the platform immediately.
        </PolicyBullet>
        <PolicyBullet>
          We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance of the revised terms.
        </PolicyBullet>
        <PolicyBullet>
          Material changes to these terms will be communicated via email or a prominent notice on our platform at least 15 days before they take effect.
        </PolicyBullet>
      </PolicySection>

      {/* 2. Account Registration */}
      <PolicySection icon={UserCheck} title="Account Registration & Responsibilities" badge="Required" index={1}>
        <p className="text-amber-200/60">
          To access certain features and make purchases, you must create an account. You are responsible for
          maintaining the confidentiality and security of your account.
        </p>
        <PolicyBullet icon={UserCheck}>
          You must provide accurate, complete, and current information during registration.
        </PolicyBullet>
        <PolicyBullet icon={Lock}>
          You are responsible for safeguarding your password and for all activities under your account.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          You must notify us immediately of any unauthorized use of your account or any security breach.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          Each person may maintain only one account. Duplicate accounts may be merged or deactivated.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          You must be at least 18 years of age to create an account and make purchases. Minors may use the platform only under parental or guardian supervision.
        </PolicyBullet>
        <PolicyCallout variant="warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
            <span>
              3 Boxes Luxury reserves the right to suspend or terminate accounts that violate these terms,
              engage in fraudulent activity, or compromise the security of other users.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 3. Products & Pricing */}
      <PolicySection icon={Tag} title="Products & Pricing" index={2}>
        <p className="text-amber-200/60">
          We strive to provide accurate product descriptions and pricing, but errors may occasionally occur.
        </p>
        <PolicyBullet icon={Tag}>
          <strong className="text-amber-200/80">Pricing Accuracy:</strong> All prices are displayed in Indian Rupees (INR) unless otherwise specified. Prices include applicable taxes unless stated otherwise.
        </PolicyBullet>
        <PolicyBullet icon={Globe}>
          <strong className="text-amber-200/80">Currency Conversion:</strong> For international customers, prices shown in other currencies are indicative and subject to conversion rates at the time of payment.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Price Errors:</strong> In the event of a pricing error, we reserve the right to cancel any orders placed at the incorrect price and issue a full refund.
        </PolicyBullet>
        <PolicyBullet icon={Store}>
          <strong className="text-amber-200/80">Product Availability:</strong> Product availability is subject to change without notice. We do not guarantee that any product will be in stock at the time of your order.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Luxury Authenticity:</strong> All products sold on our platform are guaranteed to be 100% authentic and sourced directly from authorized suppliers and brands.
        </PolicyBullet>
      </PolicySection>

      {/* 4. Orders & Payment */}
      <PolicySection icon={CreditCard} title="Orders & Payment" badge="Secure" badgeColor="bg-sky-600/15 text-sky-300 border-sky-600/25" index={3}>
        <p className="text-amber-200/60">
          By placing an order, you agree to pay the total amount including applicable taxes and shipping charges.
        </p>
        <PolicyBullet icon={CreditCard}>
          We accept major credit/debit cards, UPI, net banking, and other payment methods as available.
        </PolicyBullet>
        <PolicyBullet icon={Lock}>
          All payment transactions are processed through PCI-compliant, encrypted payment gateways.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          An order confirmation will be sent to your registered email upon successful placement.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          We reserve the right to refuse or cancel any order for reasons including: suspected fraud, stock unavailability, pricing errors, or violation of these terms.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Order Acceptance:</strong> Placing an order is an offer to purchase. We confirm acceptance by sending an order confirmation email. Until then, no contract exists.
        </PolicyBullet>
      </PolicySection>

      {/* 5. Shipping & Delivery */}
      <PolicySection icon={Truck} title="Shipping & Delivery" index={4}>
        <p className="text-amber-200/60">
          We deliver across India and to select international destinations. Delivery timelines and charges vary by location and product.
        </p>
        <PolicyBullet icon={Truck}>
          <strong className="text-amber-200/80">Domestic Shipping:</strong> Standard delivery within India typically takes 5–10 business days. Express delivery options may be available.
        </PolicyBullet>
        <PolicyBullet icon={Globe}>
          <strong className="text-amber-200/80">International Shipping:</strong> Delivery to international destinations may take 10–20 business days depending on customs and local logistics.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Tracking:</strong> A tracking number will be provided via email and SMS once your order has been dispatched.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Delays:</strong> We are not responsible for delays caused by customs, natural disasters, strikes, or other events beyond our control.
        </PolicyBullet>
        <PolicyBullet>
          <strong className="text-amber-200/80">Signature Required:</strong> High-value orders may require a signature upon delivery for security purposes.
        </PolicyBullet>
      </PolicySection>

      {/* 6. Returns & Refunds */}
      <PolicySection icon={RotateCcw} title="Returns & Refunds" index={5}>
        <p className="text-amber-200/60">
          We want you to be completely satisfied with your purchase. For full details, please refer to our Refund Policy.
        </p>
        <PolicyBullet icon={RotateCcw}>
          Returns are accepted within <strong className="text-amber-200/80">7 days</strong> of delivery for eligible items.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          Items must be unused, unworn, and in their original packaging with all tags attached.
        </PolicyBullet>
        <PolicyBullet icon={CreditCard}>
          Refunds are processed within <strong className="text-amber-200/80">5–7 business days</strong> after we receive and inspect the returned item.
        </PolicyBullet>
        <PolicyBullet>
          Certain items are non-returnable — see our Refund Policy for complete details.
        </PolicyBullet>
      </PolicySection>

      {/* 7. Intellectual Property */}
      <PolicySection icon={Shield} title="Intellectual Property" badge="Protected" badgeColor="bg-violet-600/15 text-violet-300 border-violet-600/25" index={6}>
        <p className="text-amber-200/60">
          All content on the 3 Boxes Luxury platform is the intellectual property of 3 Boxes Luxury Curations
          or its licensors and is protected by applicable intellectual property laws.
        </p>
        <PolicyBullet icon={Shield}>
          This includes, but is not limited to: logos, text, graphics, images, product photography, designs, and software.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          You may not reproduce, distribute, modify, create derivative works from, or commercially exploit any content without our prior written consent.
        </PolicyBullet>
        <PolicyBullet>
          Product images and descriptions are the property of their respective brand owners and are used with authorization.
        </PolicyBullet>
        <PolicyBullet>
          The 3 Boxes Luxury name, logo, and all related marks are trademarks of 3 Boxes Luxury Curations.
        </PolicyBullet>
      </PolicySection>

      {/* 8. Limitation of Liability */}
      <PolicySection icon={Scale} title="Limitation of Liability" index={7}>
        <p className="text-amber-200/60">
          To the maximum extent permitted by law, 3 Boxes Luxury Curations shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising from your use of our platform or services.
        </p>
        <PolicyBullet>
          Our total liability for any claim arising from or related to these terms shall not exceed the amount you paid for the specific product or service giving rise to the claim.
        </PolicyBullet>
        <PolicyBullet>
          We do not guarantee uninterrupted or error-free operation of the platform.
        </PolicyBullet>
        <PolicyBullet>
          We are not responsible for any loss or damage resulting from unauthorized access to your account due to your failure to maintain account security.
        </PolicyBullet>
        <PolicyBullet>
          Third-party links or services on our platform are provided for convenience only and we are not responsible for their content or practices.
        </PolicyBullet>
      </PolicySection>

      {/* 9. Governing Law */}
      <PolicySection icon={Gavel} title="Governing Law" badge="India" badgeColor="bg-orange-600/15 text-orange-300 border-orange-600/25" index={8}>
        <p className="text-amber-200/60">
          These Terms of Service are governed by and construed in accordance with the laws of India.
        </p>
        <PolicyBullet>
          Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.
        </PolicyBullet>
        <PolicyBullet>
          We encourage resolving disputes amicably through direct communication before initiating legal proceedings.
        </PolicyBullet>
        <PolicyBullet>
          These terms shall be interpreted without regard to conflict of law principles that would require the application of the laws of any other jurisdiction.
        </PolicyBullet>
      </PolicySection>

      {/* 10. Contact */}
      <PolicySection icon={Mail} title="Contact" index={9}>
        <p className="text-amber-200/60">
          If you have any questions about these Terms of Service, please contact us:
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
          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Thank you</strong> for choosing 3 Boxes Luxury. We are committed to providing
            you with an exceptional luxury experience built on trust, transparency, and the highest standards of service.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
