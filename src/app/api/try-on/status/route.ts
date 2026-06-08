/**
 * Try-On Status — Health check + pre-warm endpoint
 */

import { NextResponse } from 'next/server'
import { checkSpaceStatus, preWarmSpace } from '@/lib/huggingface-tryon'

export async function GET() {
  try {
    const spaceAwake = await checkSpaceStatus()
    return NextResponse.json({ available: true, mode: 'idm-vton', spaceAwake, message: spaceAwake ? 'IDM-VTON ready' : 'IDM-VTON warming up' })
  } catch {
    return NextResponse.json({ available: true, mode: 'idm-vton', spaceAwake: null, message: 'Status unknown' })
  }
}

export async function POST() {
  try {
    const awake = await preWarmSpace()
    return NextResponse.json({ available: true, spaceAwake: awake, message: awake ? 'IDM-VTON ready' : 'IDM-VTON warming up' })
  } catch {
    return NextResponse.json({ available: true, spaceAwake: false, message: 'Status check failed' })
  }
}
