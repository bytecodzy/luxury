import type { Metadata, Viewport } from "next";
import { Urbanist, Lora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const urbanist = Urbanist({
  variable: "--font-body",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#dbaf36",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "3 BOXES LUXURY - Curated Luxury Goods",
  description:
    "Discover timeless elegance. Shop the finest watches, jewelry, leather goods, fragrances, fashion, and home & living collections from the world's most prestigious makers.",
  keywords: [
    "luxury",
    "watches",
    "jewelry",
    "leather",
    "fragrances",
    "fashion",
    "3 Boxes Luxury",
  ],
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "3 BOXES LUXURY",
  },
  openGraph: {
    title: "3 BOXES LUXURY",
    description:
      "Curated luxury goods from the world's finest makers",
    type: "website",
    images: ["/images/hero.png"],
  },
  applicationName: "3 BOXES LUXURY",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="3 BOXES LUXURY" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="msapplication-TileColor" content="#dbaf36" />
        <meta name="msapplication-TileImage" content="/icons/icon-512.png" />
      </head>
      <body
        className={`${urbanist.variable} ${lora.variable} antialiased`}
      >
        {children}
        <Toaster />
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered:', registration.scope);
                  }).catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
