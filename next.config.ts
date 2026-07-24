import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: [
    'sharp',
    '@img/sharp-linux-x64',
    '@img/sharp-libvips-linux-x64',
    '@img/sharp-linuxmusl-x64',
    '@img/sharp-libvips-linuxmusl-x64',
    'nodemailer',
    '@prisma/client',
    'prisma',
    'jspdf',
    'canvg',
    'core-js',
    'canvas',
  ],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-icons',
      'framer-motion',
      'date-fns',
    ],
  },
  outputFileTracingExcludes: {
    '*': [
      // ── Prisma CLI (build-time only, NOT needed at runtime) ──
      'node_modules/prisma/**',
      'node_modules/@prisma/engines/**',
      'node_modules/@prisma/config/**',
      'node_modules/@prisma/internals/**',
      // ── Non-linux Prisma engines (Vercel runs linux x64) ──
      'node_modules/.prisma/client/libquery_engine-darwin-*',
      'node_modules/.prisma/client/libquery_engine-windows-*',
      'node_modules/.prisma/client/schema-engine-darwin-*',
      'node_modules/.prisma/client/schema-engine-windows-*',
      // ── Image/native binaries ──
      // v41: DO NOT exclude @img/sharp-libvips-linux-x64 — Vercel needs it!
      // Only exclude darwin/win/musl variants that Vercel (linux gnu x64) doesn't need.
      'node_modules/@img/sharp-libvips-darwin-*',
      'node_modules/@img/sharp-libvips-win32-*',
      'node_modules/@img/sharp-libvips-linuxmusl-*',
      'node_modules/@img/sharp-libvips-linux-arm*',
      'node_modules/@img/sharp-darwin-*',
      'node_modules/@img/sharp-win32-*',
      'node_modules/@img/sharp-linuxmusl-*',
      'node_modules/@img/sharp-linux-arm*',
      // ── react-day-picker + date-fns (removed from deps) ──
      'node_modules/react-day-picker/**',
      'node_modules/date-fns/**',
      'node_modules/date-fns-jalali/**',
      // ── Unused heavy packages (not imported in src/) ──
      'node_modules/@codesandbox/**',
      'node_modules/react-icons/**',
      'node_modules/pptxgenjs/**',
      'node_modules/canvas/**',
      'node_modules/react-syntax-highlighter/**',
      'node_modules/@mdxeditor/**',
      'node_modules/@codemirror/**',
      'node_modules/@reduxjs/**',
      'node_modules/es-toolkit/**',
      'node_modules/core-js/**',
      'node_modules/es-abstract/**',
      // ── Platform-specific binaries (Vercel uses linux x64 gnu) ──
      'node_modules/lightningcss-linux-x64-musl',
      'node_modules/lightningcss-darwin-*',
      'node_modules/lightningcss-win32-*',
      'node_modules/@esbuild/linux-loong64',
      'node_modules/@esbuild/linux-arm*',
      'node_modules/esbuild/linux-loong64',
      'node_modules/esbuild/linux-arm*',
      'node_modules/@next/swc-darwin-*',
      'node_modules/@next/swc-win32-*',
      'node_modules/@next/swc-linux-arm*',
      // ── Dev-only packages (not needed at runtime) ──
      'node_modules/typescript/**',
      'node_modules/eslint/**',
      'node_modules/eslint-config-next/**',
      'node_modules/bun-types/**',
      'node_modules/tsx/**',
      'node_modules/playwright-core/**',
      'node_modules/playwright/**',
      // ── Heavy test/build deps that leak through transitive deps ──
      'node_modules/@babel/**',
      // ── Large static files (NOT needed by API routes) ──
      'public/downloads/**',
      'public/app/**',
      'public/images/products/**',
      'public/uploads/**',
      'skills/**',
      'investor-assets/**',
      'upload/**',
      // ── Prisma client optimizations (only need linux-x64 query engine) ──
      'node_modules/@prisma/client/scripts/**',
      'node_modules/@prisma/client/generator-build/**',
      'node_modules/.prisma/client/schema-engine-*',
    ],
  },
  allowedDevOrigins: [
    'boxes3.space-z.ai',
    'preview-chat-97b5f242-82cb-4d42-801a-52a64cae9d47.space-z.ai',
    '.space-z.ai',
    '.space.z.ai',
    '127.0.0.1',
    'localhost',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Auth-Token',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
