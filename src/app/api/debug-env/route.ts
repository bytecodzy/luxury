import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ZAI_BASE_URL: process.env.ZAI_BASE_URL ? 'SET' : 'NOT SET',
    ZAI_API_KEY: process.env.ZAI_API_KEY ? 'SET' : 'NOT SET',
    ZAI_CHAT_ID: process.env.ZAI_CHAT_ID ? 'SET' : 'NOT SET',
    ZAI_TOKEN: process.env.ZAI_TOKEN ? 'SET' : 'NOT SET',
    ZAI_USER_ID: process.env.ZAI_USER_ID ? 'SET' : 'NOT SET',
    ZAI_PROXY_URL: process.env.ZAI_PROXY_URL ? 'SET' : 'NOT SET',
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN ? 'SET' : 'NOT SET',
  })
}
// v2
