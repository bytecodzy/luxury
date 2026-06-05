'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  Building2,
  Target,
  Heart,
  Users,
  Award,
  Globe,
  Lightbulb,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

export function AboutPage() {
  return (
    <PolicyPage
      title="About Us"
      subtitle="Luxury thinking applied to modern growth"
      icon={Building2}
      badge="Since 2020"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            At <strong className="text-amber-300">3 Boxes Luxury Curations</strong>, we combine luxury presentation with business practicality. From meaningful gifting and staffing support to strategic consulting and digital execution, we deliver thoughtful solutions that are tailored, elegant, and effective.
          </span>
        </div>
      </PolicyCallout>

      {/* Who We Are */}
      <PolicySection icon={Building2} title="Who We Are" index={0}>
        <p className="text-amber-200/60">
          3 Boxes Luxury Curations is a diversified luxury brand headquartered in Bengaluru, India. 
          We bring together elegance, innovation, and business acumen under one distinctive brand, 
          offering curated solutions that span luxury gifting, strategic consulting, technology solutions, 
          and AI-powered career discovery.
        </p>
        <p className="text-amber-200/60">
          Our name represents the three pillars of our philosophy: <strong className="text-amber-200/80">Elegance</strong>, 
          <strong className="text-amber-200/80"> Excellence</strong>, and 
          <strong className="text-amber-200/80"> Execution</strong>. Every product we curate, 
          every solution we deliver, and every interaction we have reflects these core values.
        </p>
      </PolicySection>

      {/* Our Divisions */}
      <PolicySection icon={Globe} title="Our Divisions" badge="4 Verticles" index={1}>
        <p className="text-amber-200/60">
          We operate across four strategic divisions, each designed to serve a distinct need while 
          maintaining the luxury experience that defines our brand.
        </p>
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200/90">3 Boxes Gifts</span>
            </div>
            <p className="text-xs text-amber-200/50">
              A portal dedicated to elegant, themed gift boxes and curated selections in fashion, 
              jewelry, and lifestyle for thoughtful gifting. From corporate hampers to personal 
              celebrations, we curate luxury gifts that leave lasting impressions.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200/90">3 Boxes Consulting</span>
            </div>
            <p className="text-xs text-amber-200/50">
              Staffing and strategic consulting from the experts at 3 Boxes Luxury Curations, 
              focused on building enduring teams and brands. We help businesses find the right 
              talent and build the right strategies for sustainable growth.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200/90">3 Boxes Technologies</span>
            </div>
            <p className="text-xs text-amber-200/50">
              Technology solutions crafted through the balance of business strategy, technological 
              innovation, and user experience. We build digital products that are modern, scalable, 
              and user-first.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200/90">3 Boxes Jobs</span>
            </div>
            <p className="text-xs text-amber-200/50">
              An AI-based job portal dedicated to startups and large corporates for smarter job 
              search and hiring discovery. Powered by intelligent matching algorithms for the 
              modern workforce.
            </p>
          </div>
        </div>
      </PolicySection>

      {/* Our Promise */}
      <PolicySection icon={Heart} title="Our Promise" badge="Core Values" index={2}>
        <p className="text-amber-200/60">
          Luxury thinking applied to modern growth — this is our guiding philosophy. 
          Everything we do is anchored in four core promises:
        </p>
        <PolicyBullet icon={Sparkles}>
          <strong className="text-amber-200/80">Curated Approach</strong> — We don't offer one-size-fits-all services. 
          Every solution is chosen with purpose, ensuring each gift, each strategy, and each technology 
          solution is perfectly aligned with your needs.
        </PolicyBullet>
        <PolicyBullet icon={Award}>
          <strong className="text-amber-200/80">Business Value</strong> — We align sophistication with measurable 
          outcomes for founders and enterprise teams. Luxury isn't just about appearance — it's about 
          delivering real results.
        </PolicyBullet>
        <PolicyBullet icon={ShieldCheck}>
          <strong className="text-amber-200/80">Brand Legacy</strong> — Our consulting mindset focuses on long-term 
          brand strength, not short-term fixes. We build enduring value that stands the test of time.
        </PolicyBullet>
        <PolicyBullet icon={Lightbulb}>
          <strong className="text-amber-200/80">Smart Innovation</strong> — Technology and hiring solutions are 
          built to be modern, scalable, and user-first. We embrace innovation that serves people.
        </PolicyBullet>
      </PolicySection>

      {/* Why Choose Us */}
      <PolicySection icon={Target} title="Why Choose Us" badge="Differentiators" index={3}>
        <p className="text-amber-200/60">
          We bring together luxury aesthetics, thoughtful curation, people expertise, and technology 
          thinking under one distinctive brand. Here's what sets us apart:
        </p>
        <PolicyBullet icon={Award}>
          <strong className="text-amber-200/80">Peak Performance</strong> — Premium service delivery with 
          attention to detail, precision, and brand alignment.
        </PolicyBullet>
        <PolicyBullet icon={Globe}>
          <strong className="text-amber-200/80">Solutions Sphere</strong> — A diversified business covering 
          gifts, consulting, technologies, and AI-based jobs, giving you a single partner for 
          multiple needs.
        </PolicyBullet>
        <PolicyBullet icon={Heart}>
          <strong className="text-amber-200/80">Personal Touch</strong> — Every gift is hand-curated, 
          every solution is custom-tailored, and every interaction reflects our commitment to excellence.
        </PolicyBullet>
      </PolicySection>

      {/* Leadership */}
      <PolicySection icon={Users} title="Leadership" badge="Founder" index={4}>
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-amber-600/10 border border-amber-700/20">
              <span className="text-2xl font-bold text-amber-400">M</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-100">Mahesh Kumar Parvathareddy</h3>
              <p className="text-xs text-amber-400/70">Founder & CEO</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-amber-200/60">
            <div className="flex items-start gap-2">
              <Award className="h-4 w-4 text-amber-400/60 mt-0.5 flex-shrink-0" />
              <span><strong className="text-amber-200/80">20+ Years</strong> of technology strategy and execution experience</span>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="h-4 w-4 text-amber-400/60 mt-0.5 flex-shrink-0" />
              <span><strong className="text-amber-200/80">Global Standard</strong> — Innovation-led product thinking with scale in mind</span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400/60 mt-0.5 flex-shrink-0" />
              <span><strong className="text-amber-200/80">Investor-Backed Exposure</strong> — Leadership roles across angel and VC-funded companies</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-amber-200/50 leading-relaxed">
            Having rich experience in various technologies, product architecture, AI analytics, API integrations, 
            DB architecture, IT infrastructure, and encryption-based security methods has given him an edge in 
            handling competition in the market, identifying technology trends and social behaviours that may 
            support or impede the success of the business. This has helped evolve 3 BOXES products to a global 
            standard with innovative approaches.
          </p>
          <p className="mt-2 text-xs text-amber-200/50 leading-relaxed">
            Mahesh comes with 20+ years of extensive experience in technology strategic planning to achieve 
            business goals by identifying and prioritizing development initiatives and setting timetables for 
            the evaluation, development, and deployment of all web-based applications, product engineering, 
            and IT consulting services.
          </p>
        </div>
      </PolicySection>

      {/* Contact Info */}
      <PolicySection icon={MapPin} title="Get in Touch" index={5}>
        <p className="text-amber-200/60">
          We'd love to hear from you. Reach out to us through any of the channels below.
        </p>
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <PolicyBullet icon={Phone}>
            <strong className="text-amber-200/80">Phone:</strong> +91 9611533511
          </PolicyBullet>
          <PolicyBullet icon={Mail}>
            <strong className="text-amber-200/80">Email:</strong> info@3boxes.in
          </PolicyBullet>
          <PolicyBullet icon={MapPin}>
            <strong className="text-amber-200/80">Address:</strong> 338/14, Sri Nilyam, 3rd A Main, 4th A Cross, 
            A Sector, Yelahanka New Town, Bengaluru - 560064
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* Closing */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Elegant Gifting • Strategic Staffing • Business Technology • AI Job Search</strong> — 
            3 Boxes Luxury Curations is where luxury meets purpose.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
