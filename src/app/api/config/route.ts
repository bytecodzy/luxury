import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({
      aiProxyUrl: process.env.ZAI_PROXY_URL || '',
      isVercel: !!process.env.VERCEL,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Config unavailable' }, { status: 500 })
  }
}
