import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: [
    'sharp',
    'nodemailer',
    '@prisma/client',
  ],
  outputFileTracingExcludes: {
    '*': [
      // Prisma CLI and engines (only needed at build time, not runtime)
      'node_modules/prisma',
      'node_modules/@prisma/engines',
      'node_modules/@prisma/config',
      'node_modules/@prisma/internals',
      'node_modules/effect',
      'node_modules/@effect/**',
      // Schema engine binary (only needed for migrations, not runtime)
      'node_modules/.prisma/client/schema-engine-*',
      // Image/native binary packages not needed in serverless
      'node_modules/@img/sharp-libvips*',
      'node_modules/@img/sharp-linux-x64',
      'node_modules/@img/sharp-darwin-*',
      'node_modules/@img/sharp-win32-*',
      // Unused heavy packages (transitive deps)
      'node_modules/@codesandbox/**',
      'node_modules/react-icons',
      'node_modules/date-fns',
      'node_modules/date-fns-jalali',
      'node_modules/pptxgenjs',
      'node_modules/jspdf',
      'node_modules/canvas',
      'node_modules/react-syntax-highlighter',
      'node_modules/@mdxeditor/**',
      'node_modules/@codemirror/**',
      'node_modules/@reduxjs/**',
      'node_modules/es-toolkit',
      'node_modules/core-js',
      'node_modules/es-abstract',
      // Platform-specific binaries (wrong platform for Vercel)
      'node_modules/lightningcss-linux-x64-musl',
      'node_modules/lightningcss-linux-x64-gnu',
      'node_modules/lightningcss-darwin-*',
      'node_modules/lightningcss-win32-*',
      'node_modules/@esbuild/linux-*',
      'node_modules/esbuild/linux-*',
      'node_modules/@next/swc-darwin-*',
      'node_modules/@next/swc-win32-*',
      // Prisma platform-specific engines (non-linux)
      'node_modules/.prisma/client/libquery_engine-darwin-*',
      'node_modules/.prisma/client/libquery_engine-windows-*',
      'node_modules/.prisma/client/schema-engine-darwin-*',
      'node_modules/.prisma/client/schema-engine-windows-*',
      // TypeScript (not needed at runtime)
      'node_modules/typescript',
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
