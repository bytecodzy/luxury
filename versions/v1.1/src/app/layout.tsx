import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "3 BOXES LUXURY - Curated Luxury Goods",
  description: "Discover timeless elegance. Shop the finest watches, jewelry, leather goods, fragrances, fashion, and home & living collections from the world's most prestigious makers.",
  keywords: ["luxury", "watches", "jewelry", "leather", "fragrances", "fashion", "3 Boxes Luxury"],
  icons: {
    icon: "/images/hero.png",
  },
  openGraph: {
    title: "3 BOXES LUXURY",
    description: "Curated luxury goods from the world's finest makers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-stone-950 text-amber-50`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
