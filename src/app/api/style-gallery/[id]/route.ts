import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/style-gallery/[id] — admin approve/reject, or like
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, reviewedBy, rejectReason } = body

    const item = await db.styleGallery.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 })
    }

    if (action === 'approve') {
      const updated = await db.styleGallery.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedBy: reviewedBy || null,
          reviewedAt: new Date(),
        },
      })
      console.log(`[style-gallery] Approved: ${id}`)
      return NextResponse.json({ success: true, item: updated })
    }

    if (action === 'reject') {
      const updated = await db.styleGallery.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedBy: reviewedBy || null,
          reviewedAt: new Date(),
          rejectReason: rejectReason || null,
        },
      })
      console.log(`[style-gallery] Rejected: ${id}`)
      return NextResponse.json({ success: true, item: updated })
    }

    if (action === 'like') {
      const updated = await db.styleGallery.update({
        where: { id },
        data: { likes: { increment: 1 } },
      })
      return NextResponse.json({ success: true, likes: updated.likes })
    }

    if (action === 'unlike') {
      const updated = await db.styleGallery.update({
        where: { id },
        data: { likes: { decrement: 1 } },
      })
      return NextResponse.json({ success: true, likes: updated.likes })
    }

    return NextResponse.json({ error: 'Invalid action. Use: approve, reject, like, unlike' }, { status: 400 })
  } catch (error) {
    console.error('[style-gallery] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update gallery item' }, { status: 500 })
  }
}

// DELETE /api/style-gallery/[id] — remove from gallery
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = await db.styleGallery.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 })
    }

    await db.styleGallery.delete({ where: { id } })
    console.log(`[style-gallery] Deleted: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[style-gallery] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 })
  }
}
