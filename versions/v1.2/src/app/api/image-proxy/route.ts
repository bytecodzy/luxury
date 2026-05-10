import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API Route
 *
 * Proxies external image URLs to bypass CORS restrictions and hotlink protection.
 * Returns a branded SVG placeholder when the external image cannot be fetched.
 *
 * Usage: /api/image-proxy?url=https://external-site.com/image.jpg&platform=nykaa
 */

// Cache for proxied images (simple in-memory cache)
const imageCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let imageUrl = searchParams.get('url');
  const platform = searchParams.get('platform') || '';
  const productName = searchParams.get('name') || '';

  if (!imageUrl) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  // Handle protocol-relative URLs
  if (imageUrl.startsWith('//')) {
    imageUrl = `https:${imageUrl}`;
  }

  // Only proxy HTTP/HTTPS URLs
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS URLs can be proxied' }, { status: 400 });
  }

  // Check cache
  const cacheKey = imageUrl;
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.data, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-Cache': 'HIT',
      },
    });
  }

  // Try multiple fetch strategies
  const strategies = [
    // Strategy 1: Direct fetch with platform referer
    () => fetchImage(imageUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': getReferer(platform),
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    }),
    // Strategy 2: Fetch with Google referer (fallback)
    () => fetchImage(imageUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://www.google.com/',
    }),
    // Strategy 3: Minimal headers
    () => fetchImage(imageUrl, {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'image/*',
    }),
  ];

  for (const strategy of strategies) {
    try {
      const result = await strategy();
      if (result) {
        // Cache the result
        if (imageCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = imageCache.keys().next().value;
          if (oldestKey) imageCache.delete(oldestKey);
        }
        imageCache.set(cacheKey, { data: result.buffer, contentType: result.contentType, timestamp: Date.now() });

        return new NextResponse(result.buffer, {
          headers: {
            'Content-Type': result.contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Access-Control-Allow-Origin': '*',
            'X-Proxy-Cache': 'MISS',
          },
        });
      }
    } catch {
      // Try next strategy
      continue;
    }
  }

  // All strategies failed — return a branded SVG placeholder image
  const svg = generatePlaceholderSVG(platform, productName);
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300, s-maxage=300', // Short cache for placeholders
      'Access-Control-Allow-Origin': '*',
      'X-Proxy-Fallback': 'true',
    },
  });
}

async function fetchImage(url: string, headers: Record<string, string>): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate it's actually an image (check magic bytes)
    if (!isValidImage(buffer) && !contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      return null;
    }

    // Ensure minimum size (not an empty or tiny redirect page)
    if (buffer.length < 100) return null;

    return { buffer, contentType: contentType.startsWith('image/') ? contentType : 'image/jpeg' };
  } catch {
    return null;
  }
}

function isValidImage(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // JPEG: FF D8
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;
  // SVG: starts with <? or <svg
  const str = buffer.toString('utf8', 0, Math.min(100, buffer.length)).trim();
  if (str.startsWith('<?') || str.startsWith('<svg')) return true;
  return false;
}

function generatePlaceholderSVG(platform: string, productName: string): string {
  const platformName = {
    myntra: 'Myntra',
    nykaa: 'Nykaa',
    amazon: 'Amazon',
    flipkart: 'Flipkart',
    caratlane: 'CaratLane',
    tanishq: 'Tanishq',
    bluestone: 'BlueStone',
    voylla: 'Voylla',
  }[platform] || '';

  const platformColor = {
    myntra: '#FF3F6C',
    nykaa: '#FC2779',
    amazon: '#FF9900',
    flipkart: '#2874F0',
    caratlane: '#C5A572',
    tanishq: '#C5101E',
    bluestone: '#2E5EAA',
    voylla: '#7B4B94',
  }[platform] || '#D4A843';

  const truncatedName = productName.length > 30 ? productName.substring(0, 27) + '...' : productName;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a1a"/>
      <stop offset="100%" style="stop-color:#2a2a2a"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <rect x="0" y="0" width="400" height="3" fill="${platformColor}" opacity="0.8"/>
  
  <!-- Diamond icon -->
  <g transform="translate(200,140)" opacity="0.3">
    <polygon points="0,-40 30,0 0,40 -30,0" fill="none" stroke="${platformColor}" stroke-width="1.5"/>
    <line x1="-30" y1="0" x2="30" y2="0" stroke="${platformColor}" stroke-width="0.5" opacity="0.5"/>
    <line x1="0" y1="-40" x2="-15" y2="0" stroke="${platformColor}" stroke-width="0.5" opacity="0.5"/>
    <line x1="0" y1="-40" x2="15" y2="0" stroke="${platformColor}" stroke-width="0.5" opacity="0.5"/>
    <line x1="0" y1="40" x2="-15" y2="0" stroke="${platformColor}" stroke-width="0.5" opacity="0.5"/>
    <line x1="0" y1="40" x2="15" y2="0" stroke="${platformColor}" stroke-width="0.5" opacity="0.5"/>
  </g>
  
  <!-- 3 BOXES text -->
  <text x="200" y="220" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#D4A843" font-weight="bold" opacity="0.8">3 BOXES</text>
  <text x="200" y="245" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#D4A843" opacity="0.5">LUXURY GIFTS</text>
  
  ${platformName ? `
  <!-- Platform badge -->
  <rect x="140" y="275" width="120" height="28" rx="14" fill="${platformColor}" opacity="0.15"/>
  <text x="200" y="294" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="${platformColor}" opacity="0.7">${platformName}</text>
  ` : ''}
  
  <!-- Product name -->
  ${truncatedName ? `
  <text x="200" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#888" opacity="0.5">${escapeXml(truncatedName)}</text>
  ` : ''}
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function getReferer(platform: string): string {
  const referers: Record<string, string> = {
    myntra: 'https://www.myntra.com/',
    nykaa: 'https://www.nykaa.com/',
    amazon: 'https://www.amazon.in/',
    flipkart: 'https://www.flipkart.com/',
    caratlane: 'https://www.caratlane.com/',
    tanishq: 'https://www.tanishq.co.in/',
    bluestone: 'https://www.bluestone.com/',
    voylla: 'https://www.voylla.com/',
  };
  return referers[platform] || 'https://www.google.com/';
}
