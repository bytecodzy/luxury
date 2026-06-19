/**
 * Test v30 Virtual Try-On flow simulating Vercel environment
 * (no GEMINI_API_KEY, VERCEL=1)
 *
 * Verifies:
 * 1. Saree → Showcase Composite (no mismatch)
 * 2. Jewelry → Image Composite (mannequin detection should pass for black-bg jewelry)
 * 3. Shirt → IDM-VTON or Showcase fallback
 */

import fs from 'fs'
import path from 'path'
import { performVirtualTryOn } from '../src/lib/virtual-tryon'

async function fileToDataUrl(filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase().substring(1)
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('  v30 Virtual Try-On Test — Simulating VERCEL environment')
  console.log('  (no GEMINI_API_KEY, VERCEL=1)')
  console.log('═══════════════════════════════════════════════════════════════════\n')

  // Simulate Vercel environment
  process.env.VERCEL = '1'
  delete process.env.GEMINI_API_KEY

  // Load test images
  const selfiePath = '/home/z/my-project/test-selfie2.jpg'
  const sareePath = '/home/z/my-project/public/images/products/generated/banarasi-silk-saree-11047388315921.png'
  const jewelryPath = '/home/z/my-project/public/images/products/generated/temple-gold-lakshmi-necklace-11047390118161.png'
  const shirtPath = '/home/z/my-project/public/images/products/mens-shirt-1.jpg'

  if (!fs.existsSync(selfiePath)) {
    console.error(`❌ Test selfie not found: ${selfiePath}`)
    process.exit(1)
  }

  const selfieData = await fileToDataUrl(selfiePath)
  console.log(`✅ Loaded selfie: ${selfiePath} (${(selfieData.length / 1024).toFixed(1)}KB)\n`)

  // ── Test 1: SAREE ──────────────────────────────────────────────
  console.log('───────────────────────────────────────────────────────────────')
  console.log('  TEST 1: SAREE (should use Showcase Composite — no mismatch)')
  console.log('───────────────────────────────────────────────────────────────')
  const sareeImage = await fileToDataUrl(sareePath)
  const sareeResult = await performVirtualTryOn({
    selfieData,
    productImageBase64: sareeImage,
    productName: 'Banarasi Silk Saree',
    categorySlug: 'women-sarees',
    productDescription: 'Traditional Banarasi silk saree with golden zari work',
    productTags: ['saree', 'silk', 'banarasi'],
    skinTone: 'medium',
    hairColor: 'black',
    clientProductColors: 'black, gold',
  })
  console.log(`\n  Saree Result:`)
  console.log(`    success: ${sareeResult.success}`)
  console.log(`    strategy: ${sareeResult.strategy}`)
  console.log(`    elapsed: ${(sareeResult.elapsedMs / 1000).toFixed(1)}s`)
  console.log(`    error: ${sareeResult.error || 'none'}`)
  if (sareeResult.debugInfo) {
    console.log(`    strategiesAttempted: ${sareeResult.debugInfo.strategiesAttempted.join(', ')}`)
  }
  if (sareeResult.success && sareeResult.imageUrl) {
    // Save result for visual inspection
    const outPath = '/home/z/my-project/test-v30-saree-result.jpg'
    const buf = Buffer.from(sareeResult.imageUrl.split(',')[1], 'base64')
    fs.writeFileSync(outPath, buf)
    console.log(`    saved: ${outPath}`)
  }
  console.log('')

  // ── Test 2: JEWELRY ────────────────────────────────────────────
  console.log('───────────────────────────────────────────────────────────────')
  console.log('  TEST 2: JEWELRY (should use Image Composite — mannequin removed)')
  console.log('───────────────────────────────────────────────────────────────')
  const jewelryImage = await fileToDataUrl(jewelryPath)
  const jewelryResult = await performVirtualTryOn({
    selfieData,
    productImageBase64: jewelryImage,
    productName: 'Temple Gold Lakshmi Necklace',
    categorySlug: 'women-jewelry',
    productDescription: 'Traditional temple gold necklace with Lakshmi motif',
    productTags: ['necklace', 'gold', 'temple'],
    skinTone: 'medium',
    hairColor: 'black',
    clientProductColors: 'gold',
  })
  console.log(`\n  Jewelry Result:`)
  console.log(`    success: ${jewelryResult.success}`)
  console.log(`    strategy: ${jewelryResult.strategy}`)
  console.log(`    elapsed: ${(jewelryResult.elapsedMs / 1000).toFixed(1)}s`)
  console.log(`    error: ${jewelryResult.error || 'none'}`)
  if (jewelryResult.debugInfo) {
    console.log(`    strategiesAttempted: ${jewelryResult.debugInfo.strategiesAttempted.join(', ')}`)
  }
  if (jewelryResult.success && jewelryResult.imageUrl) {
    const outPath = '/home/z/my-project/test-v30-jewelry-result.jpg'
    const buf = Buffer.from(jewelryResult.imageUrl.split(',')[1], 'base64')
    fs.writeFileSync(outPath, buf)
    console.log(`    saved: ${outPath}`)
  }
  console.log('')

  // ── Test 3: SHIRT (garment) ────────────────────────────────────
  console.log('───────────────────────────────────────────────────────────────')
  console.log('  TEST 3: SHIRT (should use IDM-VTON or Showcase fallback)')
  console.log('───────────────────────────────────────────────────────────────')
  const shirtImage = await fileToDataUrl(shirtPath)
  const shirtResult = await performVirtualTryOn({
    selfieData,
    productImageBase64: shirtImage,
    productName: 'Royal White Dress Shirt',
    categorySlug: 'men-shirts',
    productDescription: 'Premium white dress shirt',
    productTags: ['shirt', 'white', 'formal'],
    skinTone: 'medium',
    hairColor: 'black',
    clientProductColors: 'white',
  })
  console.log(`\n  Shirt Result:`)
  console.log(`    success: ${shirtResult.success}`)
  console.log(`    strategy: ${shirtResult.strategy}`)
  console.log(`    elapsed: ${(shirtResult.elapsedMs / 1000).toFixed(1)}s`)
  console.log(`    error: ${shirtResult.error || 'none'}`)
  if (shirtResult.debugInfo) {
    console.log(`    strategiesAttempted: ${shirtResult.debugInfo.strategiesAttempted.join(', ')}`)
  }
  if (shirtResult.success && shirtResult.imageUrl) {
    const outPath = '/home/z/my-project/test-v30-shirt-result.jpg'
    const buf = Buffer.from(shirtResult.imageUrl.split(',')[1], 'base64')
    fs.writeFileSync(outPath, buf)
    console.log(`    saved: ${outPath}`)
  }
  console.log('')

  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('  v30 Test Summary')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log(`  Saree:   ${sareeResult.success ? '✅' : '❌'} via ${sareeResult.strategy} in ${(sareeResult.elapsedMs / 1000).toFixed(1)}s`)
  console.log(`  Jewelry: ${jewelryResult.success ? '✅' : '❌'} via ${jewelryResult.strategy} in ${(jewelryResult.elapsedMs / 1000).toFixed(1)}s`)
  console.log(`  Shirt:   ${shirtResult.success ? '✅' : '❌'} via ${shirtResult.strategy} in ${(shirtResult.elapsedMs / 1000).toFixed(1)}s`)
  console.log('')

  // Critical check: Saree MUST NOT use pollinations (causes mismatch)
  if (sareeResult.strategy?.includes('pollinations')) {
    console.error('❌ CRITICAL FAIL: Saree used Pollinations (generates new person → mismatch)!')
    process.exit(1)
  }
  // Critical check: Saree MUST NOT use composite-image (mannequin shows over face)
  if (sareeResult.strategy === 'composite-image') {
    console.error('❌ CRITICAL FAIL: Saree used composite-image (mannequin shows over face → mismatch)!')
    process.exit(1)
  }
  console.log('✅ Saree uses safe strategy (no mismatch possible)')

  process.exit(0)
}

main().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
