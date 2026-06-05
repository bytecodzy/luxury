#!/usr/bin/env node
/**
 * Kids Product Image Generator for 3 Boxes Luxury
 * 
 * Generates product images for kids clothing using the z-ai-web-dev-sdk.
 * Run this script when the z-ai API (internal-api.z.ai) is accessible.
 * 
 * Usage: node generate-kids-images.mjs
 * 
 * This script generates:
 * - 5 kids shirt images (kids-shirt-1 through kids-shirt-5)
 * - 5 kids dress images (kids-dress-1 through kids-dress-5)
 * - Copies each primary image to -2 and -3 variants
 * 
 * Total: 10 generated images + 20 copied variants = 30 files
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = './public/images/products';

const products = [
  // Kids Shirts
  { name: 'kids-shirt-1', desc: 'Blue cotton casual shirt for boys', color: '#4A90D9' },
  { name: 'kids-shirt-2', desc: 'White formal striped shirt for boys', color: '#F5F5F5' },
  { name: 'kids-shirt-3', desc: 'Red checkered shirt for boys', color: '#D94A4A' },
  { name: 'kids-shirt-4', desc: 'Green polo shirt for boys', color: '#5CB85C' },
  { name: 'kids-shirt-5', desc: 'Navy blue button-down shirt for boys', color: '#2C3E6B' },
  // Kids Dresses
  { name: 'kids-dress-1', desc: 'Floral cotton party dress for girls', color: '#FFB6C1' },
  { name: 'kids-dress-2', desc: 'Pink tulle princess dress for girls', color: '#FF69B4' },
  { name: 'kids-dress-3', desc: 'Denim overall dress for girls', color: '#6495ED' },
  { name: 'kids-dress-4', desc: 'Yellow summer sundress for girls', color: '#FFD700' },
  { name: 'kids-dress-5', desc: 'Purple velvet party dress for girls', color: '#8B5CF6' },
];

async function generateImage(zai, product) {
  const prompt = `Professional product photography of ${product.desc}, displayed on clean white background, studio lighting, e-commerce style, high quality, detailed`;
  const outputPath = path.join(OUTPUT_DIR, `${product.name}.png`);

  try {
    console.log(`  Generating: ${product.name}...`);
    const response = await zai.images.generations.create({
      prompt: prompt,
      size: '1024x1024'
    });

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`  ✓ Saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed: ${product.name} - ${error.message}`);
    return false;
  }
}

function createVariants(product) {
  const primary = path.join(OUTPUT_DIR, `${product.name}.png`);
  const variant2 = path.join(OUTPUT_DIR, `${product.name}-2.png`);
  const variant3 = path.join(OUTPUT_DIR, `${product.name}-3.png`);

  try {
    if (fs.existsSync(primary)) {
      fs.copyFileSync(primary, variant2);
      fs.copyFileSync(primary, variant3);
      console.log(`  ✓ Created variants: ${product.name}-2, ${product.name}-3`);
      return true;
    } else {
      console.error(`  ✗ Primary image not found: ${primary}`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Failed to create variants: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('3 Boxes Luxury - Kids Product Image Generator');
  console.log('='.repeat(60));

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Initialize SDK
  console.log('\nInitializing z-ai SDK...');
  const zai = await ZAI.create();
  console.log(`Connected to: ${zai.config.baseUrl}`);

  // Generate primary images
  console.log('\n--- Generating Primary Images ---');
  let successCount = 0;
  for (const product of products) {
    const success = await generateImage(zai, product);
    if (success) successCount++;
  }
  console.log(`\nGenerated ${successCount}/${products.length} primary images`);

  // Create variants
  console.log('\n--- Creating Variant Images (-2, -3) ---');
  let variantCount = 0;
  for (const product of products) {
    if (createVariants(product)) variantCount++;
  }
  console.log(`\nCreated variants for ${variantCount}/${products.length} products`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${successCount} primary images, ${variantCount * 2} variants`);
  console.log(`Total files: ${successCount + variantCount * 2} / ${products.length * 3}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
