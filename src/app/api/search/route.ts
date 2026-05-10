import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const occasion = searchParams.get('occasion');
    const recipient = searchParams.get('recipient');
    const sort = searchParams.get('sort') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown>[] = [];

    if (q) {
      where.push({
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { sku: { contains: q } },
          { tags: { contains: q } },
        ],
      });
    }

    if (category) {
      where.push({
        category: { slug: category },
      });
    }

    if (minPrice > 0 || maxPrice < 999999) {
      where.push({
        price: { gte: minPrice, lte: maxPrice },
      });
    }

    if (occasion) {
      where.push({
        occasions: { contains: occasion },
      });
    }

    if (recipient) {
      where.push({
        recipientTypes: { contains: recipient },
      });
    }

    const products = await db.product.findMany({
      where: where.length > 0 ? { AND: where } : undefined,
      include: {
        category: { select: { name: true, slug: true } },
      },
      orderBy: sort === 'price_asc' ? { price: 'asc' }
        : sort === 'price_desc' ? { price: 'desc' }
        : sort === 'rating' ? { rating: 'desc' }
        : sort === 'newest' ? { createdAt: 'desc' }
        : { featured: 'desc' },
      skip,
      take: limit,
    });

    const total = await db.product.count({
      where: where.length > 0 ? { AND: where } : undefined,
    });

    // Format results
    const formattedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: p.images ? JSON.parse(p.images) : [],
      category: p.category.name,
      categorySlug: p.category.slug,
      stock: p.stock,
      stockStatus: p.stockStatus,
      rating: p.rating,
      reviewCount: p.reviewCount,
      featured: p.featured,
      tags: p.tags ? JSON.parse(p.tags || '[]') : [],
      occasions: p.occasions ? JSON.parse(p.occasions || '[]') : [],
      recipientTypes: p.recipientTypes ? JSON.parse(p.recipientTypes || '[]') : [],
      deliveryEstimate: p.deliveryEstimate,
      isExternal: p.isExternal,
      platform: p.platform,
      affiliateUrl: p.affiliateUrl,
    }));

    // Parse natural language query for AI suggestions
    let aiSuggestions: string[] = [];
    if (q) {
      const lowerQ = q.toLowerCase();
      const occasionKeywords = ['birthday', 'anniversary', 'wedding', 'diwali', 'christmas', 'valentine', 'mother', 'father', 'housewarming', 'farewell'];
      const recipientKeywords = ['him', 'her', 'couple', 'kids', 'parents', 'friend', 'colleague', 'boss', 'wife', 'husband', 'girlfriend', 'boyfriend', 'mom', 'dad'];
      
      const detectedOccasions = occasionKeywords.filter(o => lowerQ.includes(o));
      const detectedRecipients = recipientKeywords.filter(r => lowerQ.includes(r));
      const budgetMatch = lowerQ.match(/under\s*₹?(\d+)|below\s*₹?(\d+)|less\s*than\s*₹?(\d+)/);
      
      if (detectedOccasions.length > 0 || detectedRecipients.length > 0 || budgetMatch) {
        aiSuggestions = [
          ...(detectedOccasions.length > 0 ? [`Occasion detected: ${detectedOccasions.join(', ')}`] : []),
          ...(detectedRecipients.length > 0 ? [`Recipient: ${detectedRecipients.join(', ')}`] : []),
          ...(budgetMatch ? [`Budget: under ₹${budgetMatch[1] || budgetMatch[2] || budgetMatch[3]}`] : []),
        ];
      }
    }

    return NextResponse.json({
      products: formattedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      query: q,
      aiSuggestions,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
