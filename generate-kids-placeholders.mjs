#!/usr/bin/env node
/**
 * Kids Product Placeholder Image Generator for 3 Boxes Luxury
 * 
 * Creates professional e-commerce style placeholder images using Sharp.
 * These are used as fallback while the z-ai image generation API is unavailable.
 * 
 * Run the z-ai generation script later to replace with AI-generated images:
 *   node generate-kids-images.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = './public/images/products';

const products = [
  // Kids Shirts
  { 
    name: 'kids-shirt-1', 
    desc: 'Blue Cotton Casual Shirt', 
    subtitle: 'For Boys',
    color: '#4A90D9', 
    accent: '#2E6BB0',
    icon: '👔',
    category: 'SHIRTS'
  },
  { 
    name: 'kids-shirt-2', 
    desc: 'White Formal Striped Shirt', 
    subtitle: 'For Boys',
    color: '#E8E8E8', 
    accent: '#333333',
    icon: '👔',
    category: 'SHIRTS'
  },
  { 
    name: 'kids-shirt-3', 
    desc: 'Red Checkered Shirt', 
    subtitle: 'For Boys',
    color: '#D94A4A', 
    accent: '#A03030',
    icon: '👔',
    category: 'SHIRTS'
  },
  { 
    name: 'kids-shirt-4', 
    desc: 'Green Polo Shirt', 
    subtitle: 'For Boys',
    color: '#5CB85C', 
    accent: '#3D8B3D',
    icon: '👔',
    category: 'SHIRTS'
  },
  { 
    name: 'kids-shirt-5', 
    desc: 'Navy Blue Button-Down Shirt', 
    subtitle: 'For Boys',
    color: '#2C3E6B', 
    accent: '#1A2744',
    icon: '👔',
    category: 'SHIRTS'
  },
  // Kids Dresses
  { 
    name: 'kids-dress-1', 
    desc: 'Floral Cotton Party Dress', 
    subtitle: 'For Girls',
    color: '#FFB6C1', 
    accent: '#E8919E',
    icon: '👗',
    category: 'DRESSES'
  },
  { 
    name: 'kids-dress-2', 
    desc: 'Pink Tulle Princess Dress', 
    subtitle: 'For Girls',
    color: '#FF69B4', 
    accent: '#E0458F',
    icon: '👗',
    category: 'DRESSES'
  },
  { 
    name: 'kids-dress-3', 
    desc: 'Denim Overall Dress', 
    subtitle: 'For Girls',
    color: '#6495ED', 
    accent: '#4A78C7',
    icon: '👗',
    category: 'DRESSES'
  },
  { 
    name: 'kids-dress-4', 
    desc: 'Yellow Summer Sundress', 
    subtitle: 'For Girls',
    color: '#FFD700', 
    accent: '#D4B200',
    icon: '👗',
    category: 'DRESSES'
  },
  { 
    name: 'kids-dress-5', 
    desc: 'Purple Velvet Party Dress', 
    subtitle: 'For Girls',
    color: '#8B5CF6', 
    accent: '#6D3CC9',
    icon: '👗',
    category: 'DRESSES'
  },
];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 200, g: 200, b: 200 };
}

function createProductSVG(product) {
  const mainColor = hexToRgb(product.color);
  const accentColor = hexToRgb(product.accent);
  
  // Determine text color based on background brightness
  const brightness = (mainColor.r * 299 + mainColor.g * 587 + mainColor.b * 114) / 1000;
  const textColor = brightness > 128 ? '#333333' : '#FFFFFF';
  const subtitleColor = brightness > 128 ? '#666666' : 'rgba(255,255,255,0.8)';
  const lineColor = brightness > 128 ? '#CCCCCC' : 'rgba(255,255,255,0.3)';
  
  return `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(${mainColor.r},${mainColor.g},${mainColor.b});stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(${accentColor.r},${accentColor.g},${accentColor.b});stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)" rx="0"/>
  
  <!-- Subtle pattern overlay -->
  <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
    <circle cx="15" cy="15" r="1" fill="${brightness > 128 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}"/>
  </pattern>
  <rect width="1024" height="1024" fill="url(#dots)"/>
  
  <!-- Center card -->
  <rect x="80" y="150" width="864" height="724" rx="20" fill="white" filter="url(#shadow)" opacity="0.95"/>
  
  <!-- Brand header -->
  <text x="512" y="280" font-family="Georgia, serif" font-size="22" fill="#999999" text-anchor="middle" letter-spacing="6">3 BOXES LUXURY</text>
  
  <!-- Category badge -->
  <rect x="412" y="310" width="200" height="32" rx="16" fill="${product.color}" opacity="0.15"/>
  <text x="512" y="332" font-family="Arial, sans-serif" font-size="14" fill="${product.color}" text-anchor="middle" font-weight="bold" letter-spacing="3">${product.category}</text>
  
  <!-- Product icon/clothing shape -->
  <!-- Shirt icon -->
  ${product.category === 'SHIRTS' ? `
  <g transform="translate(512, 460) scale(1.2)">
    <!-- Shirt body -->
    <path d="M-50,-80 L-30,-80 L-20,-60 L20,-60 L30,-80 L50,-80 L60,-50 L35,-40 L35,80 L-35,80 L-35,-40 L-60,-50 Z" 
          fill="none" stroke="${product.color}" stroke-width="3" opacity="0.4"/>
    <!-- Collar -->
    <path d="M-20,-60 L0,-40 L20,-60" fill="none" stroke="${product.color}" stroke-width="3" opacity="0.4"/>
    <!-- Buttons -->
    <circle cx="0" cy="-15" r="3" fill="${product.color}" opacity="0.3"/>
    <circle cx="0" cy="10" r="3" fill="${product.color}" opacity="0.3"/>
    <circle cx="0" cy="35" r="3" fill="${product.color}" opacity="0.3"/>
  </g>
  ` : `
  <g transform="translate(512, 450) scale(1.2)">
    <!-- Dress body -->
    <path d="M-15,-80 L15,-80 L20,-50 L40,80 L-40,80 L-20,-50 Z" 
          fill="none" stroke="${product.color}" stroke-width="3" opacity="0.4"/>
    <!-- Waist -->
    <path d="M-18,-40 L18,-40" fill="none" stroke="${product.color}" stroke-width="2" opacity="0.3"/>
    <!-- Sleeves/straps -->
    <line x1="-10" y1="-80" x2="-20" y2="-95" stroke="${product.color}" stroke-width="3" opacity="0.4"/>
    <line x1="10" y1="-80" x2="20" y2="-95" stroke="${product.color}" stroke-width="3" opacity="0.4"/>
    <!-- Bow -->
    <circle cx="0" cy="-70" r="4" fill="${product.color}" opacity="0.3"/>
  </g>
  `}
  
  <!-- Product name -->
  <text x="512" y="620" font-family="Georgia, serif" font-size="32" fill="#333333" text-anchor="middle" font-weight="bold">${product.desc}</text>
  
  <!-- Subtitle -->
  <text x="512" y="660" font-family="Arial, sans-serif" font-size="20" fill="#999999" text-anchor="middle">${product.subtitle}</text>
  
  <!-- Divider line -->
  <line x1="362" y1="690" x2="662" y2="690" stroke="${product.color}" stroke-width="2" opacity="0.3"/>
  
  <!-- Luxury tagline -->
  <text x="512" y="730" font-family="Arial, sans-serif" font-size="16" fill="#BBBBBB" text-anchor="middle" letter-spacing="2">PREMIUM KIDS COLLECTION</text>
  
  <!-- Color swatch -->
  <rect x="487" y="755" width="50" height="50" rx="25" fill="${product.color}" stroke="${product.accent}" stroke-width="2"/>
  <rect x="487" y="755" width="50" height="50" rx="25" fill="url(#bg)" opacity="0.5"/>
  
  <!-- Bottom branding bar -->
  <rect x="0" y="960" width="1024" height="64" fill="${product.accent}" opacity="0.9"/>
  <text x="512" y="1000" font-family="Georgia, serif" font-size="16" fill="white" text-anchor="middle" letter-spacing="4" opacity="0.8">3 BOXES LUXURY • KIDS COLLECTION</text>
</svg>`;
}

async function generatePlaceholderImage(product) {
  const svg = createProductSVG(product);
  const outputPath = path.join(OUTPUT_DIR, `${product.name}.jpg`);
  
  try {
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    const stats = fs.statSync(outputPath);
    console.log(`  ✓ Created: ${product.name}.jpg (${(stats.size / 1024).toFixed(1)} KB)`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed: ${product.name} - ${error.message}`);
    return false;
  }
}

function createVariants(product) {
  const primary = path.join(OUTPUT_DIR, `${product.name}.jpg`);
  const variant2 = path.join(OUTPUT_DIR, `${product.name}-2.jpg`);
  const variant3 = path.join(OUTPUT_DIR, `${product.name}-3.jpg`);

  try {
    if (fs.existsSync(primary)) {
      fs.copyFileSync(primary, variant2);
      fs.copyFileSync(primary, variant3);
      console.log(`  ✓ Variants: ${product.name}-2.jpg, ${product.name}-3.jpg`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ✗ Variant failed: ${product.name} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('3 Boxes Luxury - Kids Product Placeholder Generator');
  console.log('='.repeat(60));

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n--- Generating Placeholder Images ---');
  let successCount = 0;
  for (const product of products) {
    const success = await generatePlaceholderImage(product);
    if (success) successCount++;
  }
  console.log(`\nGenerated ${successCount}/${products.length} placeholder images`);

  console.log('\n--- Creating Variant Images (-2, -3) ---');
  let variantCount = 0;
  for (const product of products) {
    if (createVariants(product)) variantCount++;
  }
  console.log(`\nCreated variants for ${variantCount}/${products.length} products`);

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${successCount} primary + ${variantCount * 2} variants = ${successCount + variantCount * 2} files`);
  console.log('\n⚠ These are placeholder images. Run "node generate-kids-images.mjs"');
  console.log('  when the z-ai API is available to generate real product photos.');
  console.log('='.repeat(60));
}

main().catch(console.error);
