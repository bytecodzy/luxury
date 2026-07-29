'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  Ruler,
  Shirt,
  Gem,
  Watch,
  Sparkles,
  Footprints,
  Info,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
} from 'lucide-react';

export function SizeGuidePage() {
  return (
    <PolicyPage
      title="Size Guide"
      subtitle="Find your perfect fit with our comprehensive measurement charts"
      icon={Ruler}
      badge="Fit Guide"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            Use the charts below to find your ideal size across our product categories. When in doubt,
            size up — or reach out to us at <strong className="text-amber-300">info@3boxes.in</strong> and
            our concierge team will help you choose.
          </span>
        </div>
      </PolicyCallout>

      {/* How to Measure */}
      <PolicySection icon={Ruler} title="How to Measure" badge="Step-by-step" index={0}>
        <p className="text-amber-200/60">
          Accurate measurements are the key to a perfect fit. Use a soft measuring tape (or a piece of
          string + a ruler) and follow these steps. Measure over light clothing for best results.
        </p>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Chest:</strong> Wrap the tape around the fullest part of
          your chest, keeping it parallel to the floor and snug but not tight.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Waist:</strong> Measure around your natural waistline —
          the narrowest part of your torso, usually just above the belly button.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Hips:</strong> Stand with feet together and measure
          around the fullest part of your hips and seat.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Inseam:</strong> Measure from the top of your inner
          thigh to the bottom of your ankle bone.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Ring:</strong> Wrap a thin strip of paper around the
          intended finger, mark where it overlaps, and measure the length in mm — that's your
          circumference.
        </PolicyBullet>
      </PolicySection>

      {/* Apparel Size Chart */}
      <PolicySection icon={Shirt} title="Apparel Size Chart" badge="Womenswear & Menswear" index={1}>
        <p className="text-amber-200/60">
          Standard Indian / international apparel sizing. All measurements are in inches.
        </p>
        <div className="overflow-x-auto rounded-lg border border-amber-900/15 bg-stone-800/30">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-amber-900/15 bg-stone-900/80">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Size</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Bust / Chest</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Waist</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Hips</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">UK</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">EU</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">US</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/60">
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">XS</td>
                <td className="px-4 py-2 text-xs">32&quot;</td>
                <td className="px-4 py-2 text-xs">24&quot;</td>
                <td className="px-4 py-2 text-xs">35&quot;</td>
                <td className="px-4 py-2 text-xs">6</td>
                <td className="px-4 py-2 text-xs">34</td>
                <td className="px-4 py-2 text-xs">2</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">S</td>
                <td className="px-4 py-2 text-xs">34&quot;</td>
                <td className="px-4 py-2 text-xs">26&quot;</td>
                <td className="px-4 py-2 text-xs">37&quot;</td>
                <td className="px-4 py-2 text-xs">8</td>
                <td className="px-4 py-2 text-xs">36</td>
                <td className="px-4 py-2 text-xs">4</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">M</td>
                <td className="px-4 py-2 text-xs">36&quot;</td>
                <td className="px-4 py-2 text-xs">28&quot;</td>
                <td className="px-4 py-2 text-xs">39&quot;</td>
                <td className="px-4 py-2 text-xs">10</td>
                <td className="px-4 py-2 text-xs">38</td>
                <td className="px-4 py-2 text-xs">6</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">L</td>
                <td className="px-4 py-2 text-xs">38&quot;</td>
                <td className="px-4 py-2 text-xs">30&quot;</td>
                <td className="px-4 py-2 text-xs">41&quot;</td>
                <td className="px-4 py-2 text-xs">12</td>
                <td className="px-4 py-2 text-xs">40</td>
                <td className="px-4 py-2 text-xs">8</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">XL</td>
                <td className="px-4 py-2 text-xs">40&quot;</td>
                <td className="px-4 py-2 text-xs">32&quot;</td>
                <td className="px-4 py-2 text-xs">43&quot;</td>
                <td className="px-4 py-2 text-xs">14</td>
                <td className="px-4 py-2 text-xs">42</td>
                <td className="px-4 py-2 text-xs">10</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">XXL</td>
                <td className="px-4 py-2 text-xs">42&quot;</td>
                <td className="px-4 py-2 text-xs">34&quot;</td>
                <td className="px-4 py-2 text-xs">45&quot;</td>
                <td className="px-4 py-2 text-xs">16</td>
                <td className="px-4 py-2 text-xs">44</td>
                <td className="px-4 py-2 text-xs">12</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-amber-200/30 mt-2">
          Tip: If you're between sizes, choose the larger size for a relaxed fit and the smaller size for a fitted look.
        </p>
      </PolicySection>

      {/* Ring Size Chart */}
      <PolicySection icon={Gem} title="Ring Size Chart" badge="Indian + Intl" index={2}>
        <p className="text-amber-200/60">
          Ring sizes for the Indian, US, and UK systems. Measure the circumference of your finger in mm
          and match it to the chart below.
        </p>
        <div className="overflow-x-auto rounded-lg border border-amber-900/15 bg-stone-800/30">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-amber-900/15 bg-stone-900/80">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Circumference (mm)</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Diameter (mm)</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">India</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">US</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">UK</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/60">
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">44.2</td>
                <td className="px-4 py-2 text-xs">14.1</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">6</td>
                <td className="px-4 py-2 text-xs">3</td>
                <td className="px-4 py-2 text-xs">D</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">46.8</td>
                <td className="px-4 py-2 text-xs">14.9</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">8</td>
                <td className="px-4 py-2 text-xs">3.5</td>
                <td className="px-4 py-2 text-xs">E</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">49.3</td>
                <td className="px-4 py-2 text-xs">15.7</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">10</td>
                <td className="px-4 py-2 text-xs">5</td>
                <td className="px-4 py-2 text-xs">G</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">51.9</td>
                <td className="px-4 py-2 text-xs">16.5</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">12</td>
                <td className="px-4 py-2 text-xs">6</td>
                <td className="px-4 py-2 text-xs">I</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">54.4</td>
                <td className="px-4 py-2 text-xs">17.3</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">14</td>
                <td className="px-4 py-2 text-xs">7</td>
                <td className="px-4 py-2 text-xs">K</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">57.0</td>
                <td className="px-4 py-2 text-xs">18.2</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">16</td>
                <td className="px-4 py-2 text-xs">8</td>
                <td className="px-4 py-2 text-xs">M</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-xs">59.5</td>
                <td className="px-4 py-2 text-xs">19.0</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">18</td>
                <td className="px-4 py-2 text-xs">9</td>
                <td className="px-4 py-2 text-xs">O</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Knuckle check:</strong> If your knuckle is larger than
          the base of your finger, measure both and pick a size in between.
        </PolicyBullet>
      </PolicySection>

      {/* Watch Case Diameter Guide */}
      <PolicySection icon={Watch} title="Watch Case Size Guide" badge="Case diameter" index={3}>
        <p className="text-amber-200/60">
          Choose a watch case diameter that suits your wrist size. As a rule of thumb, the case should
          not extend past the edge of your wrist bone.
        </p>
        <div className="overflow-x-auto rounded-lg border border-amber-900/15 bg-stone-800/30">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-amber-900/15 bg-stone-900/80">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Wrist Circumference</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Recommended Case</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Style</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/60">
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">14–16 cm (5.5&quot;–6.3&quot;)</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">32–38 mm</td>
                <td className="px-4 py-2 text-xs">Slim / classic</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">16–18 cm (6.3&quot;–7.1&quot;)</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">38–42 mm</td>
                <td className="px-4 py-2 text-xs">Versatile / everyday</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">18–20 cm (7.1&quot;–7.9&quot;)</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">42–46 mm</td>
                <td className="px-4 py-2 text-xs">Bold / sport</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-xs">20+ cm (7.9&quot;+)</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">46–50 mm</td>
                <td className="px-4 py-2 text-xs">Oversized / statement</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Strap length:</strong> Most watches ship with a
          standard strap fitting 16–20 cm wrists. Contact us for extra-long or short straps.
        </PolicyBullet>
      </PolicySection>

      {/* Footwear Size Chart */}
      <PolicySection icon={Footprints} title="Footwear Size Chart" badge="EU / UK / US" index={4}>
        <p className="text-amber-200/60">
          Convert your usual shoe size across international systems. Lengths shown are the insole length
          in cm — measure your longest foot from heel to longest toe.
        </p>
        <div className="overflow-x-auto rounded-lg border border-amber-900/15 bg-stone-800/30">
          <table className="w-full min-w-[460px] text-sm">
            <thead>
              <tr className="border-b border-amber-900/15 bg-stone-900/80">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Foot Length (cm)</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">India / UK</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">EU</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">US (M)</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">US (W)</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/60">
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">23.5</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">4</td>
                <td className="px-4 py-2 text-xs">37</td>
                <td className="px-4 py-2 text-xs">5</td>
                <td className="px-4 py-2 text-xs">6.5</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">24.5</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">5</td>
                <td className="px-4 py-2 text-xs">38</td>
                <td className="px-4 py-2 text-xs">6</td>
                <td className="px-4 py-2 text-xs">7.5</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">25.5</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">6</td>
                <td className="px-4 py-2 text-xs">39</td>
                <td className="px-4 py-2 text-xs">7</td>
                <td className="px-4 py-2 text-xs">8.5</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">26.5</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">7</td>
                <td className="px-4 py-2 text-xs">41</td>
                <td className="px-4 py-2 text-xs">8</td>
                <td className="px-4 py-2 text-xs">9.5</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs">27.5</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">8</td>
                <td className="px-4 py-2 text-xs">42</td>
                <td className="px-4 py-2 text-xs">9</td>
                <td className="px-4 py-2 text-xs">10.5</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-xs">28.5</td>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">9</td>
                <td className="px-4 py-2 text-xs">43</td>
                <td className="px-4 py-2 text-xs">10</td>
                <td className="px-4 py-2 text-xs">11.5</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PolicyBullet icon={AlertTriangle}>
          <strong className="text-amber-200/80">Tip:</strong> Measure your feet at the end of the day
          — they're slightly larger than in the morning.
        </PolicyBullet>
      </PolicySection>

      {/* Saree Blouse Size Guide */}
      <PolicySection icon={Sparkles} title="Saree Blouse Size Guide" badge="Indian wear" index={5}>
        <p className="text-amber-200/60">
          Standard saree blouse measurements in inches. For custom tailoring, please provide your
          measurements at checkout or contact us after placing your order.
        </p>
        <div className="overflow-x-auto rounded-lg border border-amber-900/15 bg-stone-800/30">
          <table className="w-full min-w-[460px] text-sm">
            <thead>
              <tr className="border-b border-amber-900/15 bg-stone-900/80">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Blouse Size</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Chest</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Waist</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Shoulder</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-amber-400/80">Sleeve Length</th>
              </tr>
            </thead>
            <tbody className="text-amber-200/60">
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">34</td>
                <td className="px-4 py-2 text-xs">34&quot;</td>
                <td className="px-4 py-2 text-xs">28&quot;</td>
                <td className="px-4 py-2 text-xs">12.5&quot;</td>
                <td className="px-4 py-2 text-xs">11&quot;</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">36</td>
                <td className="px-4 py-2 text-xs">36&quot;</td>
                <td className="px-4 py-2 text-xs">30&quot;</td>
                <td className="px-4 py-2 text-xs">13&quot;</td>
                <td className="px-4 py-2 text-xs">11.5&quot;</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">38</td>
                <td className="px-4 py-2 text-xs">38&quot;</td>
                <td className="px-4 py-2 text-xs">32&quot;</td>
                <td className="px-4 py-2 text-xs">13.5&quot;</td>
                <td className="px-4 py-2 text-xs">12&quot;</td>
              </tr>
              <tr className="border-b border-amber-900/10">
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">40</td>
                <td className="px-4 py-2 text-xs">40&quot;</td>
                <td className="px-4 py-2 text-xs">34&quot;</td>
                <td className="px-4 py-2 text-xs">14&quot;</td>
                <td className="px-4 py-2 text-xs">12.5&quot;</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-xs font-medium text-amber-200/80">42</td>
                <td className="px-4 py-2 text-xs">42&quot;</td>
                <td className="px-4 py-2 text-xs">36&quot;</td>
                <td className="px-4 py-2 text-xs">14.5&quot;</td>
                <td className="px-4 py-2 text-xs">13&quot;</td>
              </tr>
            </tbody>
          </table>
        </div>
      </PolicySection>

      {/* Fit Tips */}
      <PolicySection
        icon={CheckCircle2}
        title="Fit Tips & Notes"
        badgeColor="bg-emerald-600/15 text-emerald-300 border-emerald-600/25"
        index={6}
      >
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Between sizes?</strong> Size down for fitted silhouettes,
          size up for relaxed or layered looks.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Natural fabrics</strong> (cotton, linen, silk) may shrink
          2–3% on first wash — account for this when choosing your size.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Tailoring available:</strong> Many of our sarees, lehengas,
          and suits include complimentary stitching. Provide measurements at checkout.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Kids' fashion:</strong> For children's apparel, refer to
          the age range on the product page — sizes vary by brand.
        </PolicyBullet>
      </PolicySection>

      {/* Help */}
      <PolicySection icon={Mail} title="Need Help Finding Your Size?" index={7}>
        <p className="text-amber-200/60">
          If you're still unsure, our concierge team is happy to help with personalized sizing advice.
        </p>
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <PolicyBullet icon={Mail}>
            <strong className="text-amber-200/80">Email:</strong> info@3boxes.in
          </PolicyBullet>
          <PolicyBullet icon={Phone}>
            <strong className="text-amber-200/80">Phone / WhatsApp:</strong> +91 9611533511
          </PolicyBullet>
        </div>
        <p className="text-xs text-amber-200/30 mt-2">
          For fastest response, include the product name/URL and your measurements in your message.
        </p>
      </PolicySection>

      {/* Closing */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Easy exchanges:</strong> If your item doesn't fit, we
            offer hassle-free size exchanges within 7 days of delivery (subject to our return policy).
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
