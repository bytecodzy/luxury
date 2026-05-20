import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { requireAdmin } from '@/lib/auth-helper'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILES = 3

/**
 * Detect if running on Vercel serverless (read-only filesystem).
 */
function isVercel(): boolean {
  return !!process.env.VERCEL
}

/**
 * Attempt to upload a file using Vercel Blob.
 * Uses dynamic import so it doesn't break if @vercel/blob is not installed.
 * Returns the blob URL on success, or null if unavailable/failed.
 */
async function uploadToVercelBlob(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null

  try {
    const { put } = await import('@vercel/blob')
    const blob = await put(`products/${filename}`, buffer, {
      contentType,
      access: 'public',
      token,
    })
    return blob.url
  } catch (err) {
    console.warn('[upload] Vercel Blob upload failed, falling back:', err)
    return null
  }
}

/**
 * Convert a file buffer to a base64 data URL.
 * This works in any environment (serverless or local) but increases
 * payload size by ~33%. Suitable for storing directly in a JSON field.
 */
function toDataUrl(buffer: Buffer, contentType: string): string {
  const base64 = buffer.toString('base64')
  return `data:${contentType};base64,${base64}`
}

/**
 * Write file to local filesystem (development only).
 * Returns the public URL path for the uploaded file.
 */
async function uploadToLocal(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'products')

  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }

  const filePath = join(uploadDir, filename)
  await writeFile(filePath, buffer)

  return `/uploads/products/${filename}`
}

export async function POST(request: NextRequest) {
  // Verify admin access
  const { error } = await requireAdmin(request)
  if (error) return error

  try {
    const formData = await request.formData()
    const files = formData.getAll('files')

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 })
    }

    const urls: string[] = []

    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` },
          { status: 400 }
        )
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 5MB` },
          { status: 400 }
        )
      }

      // Generate unique filename
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const filename = `product-${timestamp}-${random}.${ext}`

      // Read file into buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // --- Upload strategy (priority order) ---
      // 1. Vercel Blob (primary for production serverless)
      // 2. Base64 data URL (fallback when no blob storage available)
      // 3. Local filesystem (development only)

      let url: string | null = null

      // Strategy 1: Vercel Blob
      if (isVercel()) {
        url = await uploadToVercelBlob(buffer, filename, file.type)
      }

      // Strategy 2: Base64 data URL (serverless fallback)
      if (!url && isVercel()) {
        console.info('[upload] Using base64 data URL fallback for', filename)
        url = toDataUrl(buffer, file.type)
      }

      // Strategy 3: Local filesystem (development)
      if (!url) {
        url = await uploadToLocal(buffer, filename)
      }

      urls.push(url)
    }

    return NextResponse.json({ urls })
  } catch (err) {
    console.error('[upload] Error:', err)
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 })
  }
}
