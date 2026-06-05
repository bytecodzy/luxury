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
    'prisma',
  ],
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@codesandbox',
      'node_modules/@img',
      'node_modules/playwright-core',
      'node_modules/playwright',
      'node_modules/jspdf',
      'node_modules/canvas',
      'node_modules/@mdxeditor',
      'node_modules/react-syntax-highlighter',
      'node_modules/react-icons',
      'node_modules/date-fns',
      'node_modules/date-fns-jalali',
      'node_modules/pptxgenjs',
      'node_modules/@codemirror',
      'node_modules/@reduxjs',
      'node_modules/lightningcss-linux-x64-musl',
      'node_modules/lightningcss-linux-x64-gnu',
      'node_modules/@esbuild/linux-*',
      'node_modules/esbuild/linux-*',
      'node_modules/prisma/libquery_engine*',
      'node_modules/.prisma/client/libquery_engine*',
      'node_modules/@prisma/engines',
      'node_modules/@prisma/client/libquery_engine*',
      'node_modules/@next/swc-*',
      'node_modules/es-abstract',
      'node_modules/core-js',
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
