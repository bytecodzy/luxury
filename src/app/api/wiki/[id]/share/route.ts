import { NextRequest, NextResponse } from 'next/server'
import { db, edb } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// POST /api/wiki/[id]/share — share a document with specific roles/users
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { targetRole, targetUserId, canDownload, canView } = body

    if (!targetRole && !targetUserId) {
      return NextResponse.json({ error: 'Target role or user ID required' }, { status: 400 })
    }

    const doc = await db.wikiDocument.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const share = await edb.trainingShare.create({
      data: {
        docId: id,
        targetRole: targetRole || 'user',
        targetUserId: targetUserId || null,
        sharedBy: user.id,
        canDownload: canDownload !== undefined ? canDownload : true,
        canView: canView !== undefined ? canView : true,
      },
    })

    return NextResponse.json({ share }, { status: 201 })
  } catch (error) {
    console.error('Wiki share POST error:', error)
    return NextResponse.json({ error: 'Failed to share document' }, { status: 500 })
  }
}

// GET /api/wiki/[id]/share — get all shares for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    const shares = await edb.trainingShare.findMany({
      where: { docId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ shares })
  } catch (error) {
    console.error('Wiki share GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
  }
}

// DELETE /api/wiki/[id]/share — revoke a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('shareId')

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID required' }, { status: 400 })
    }

    await edb.trainingShare.delete({
      where: { id: shareId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Wiki share DELETE error:', error)
    return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 })
  }
}
