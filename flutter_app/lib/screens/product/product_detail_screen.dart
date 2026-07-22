import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../../widgets/product_card.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _currentImageIndex = 0;
  final PageController _pageController = PageController();
  int _quantity = 1;
  bool _isFullscreen = false;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final accent = provider.accentColor;
    final accentLight = provider.accentLightColor;
    final glowColor = provider.accentGlow;
    const darkBg = Color(AppConfig.darkBg);
    const cardBg = Color(AppConfig.cardBg);
    final product = provider.selectedProduct;

    if (product == null) {
      return Scaffold(
        backgroundColor: darkBg,
        appBar: AppBar(backgroundColor: darkBg),
        body: const Center(
          child: Text('Product not found', style: TextStyle(color: Colors.white54)),
        ),
      );
    }

    final isInWishlist = provider.isInWishlist(product.id);
    final relatedProducts = provider.products
        .where((p) => p.categorySlug == product.categorySlug && p.id != product.id)
        .take(6)
        .toList();

    return Scaffold(
      backgroundColor: darkBg,
      appBar: _buildAppBar(accent, darkBg, product),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Breadcrumb ──
            _buildBreadcrumb(accent, product),

            // ── Hero Image Gallery ──
            _buildImageGallery(accent, glowColor, product),

            // ── Product Info ──
            _buildProductInfo(accent, accentLight, glowColor, product, provider, isInWishlist),

            // ── Virtual Try-On CTA ──
            if (!product.isExternal)
              _buildTryOnCTA(accent, glowColor),

            // ── Quantity Selector + Add to Cart ──
            _buildCartSection(accent, glowColor, product, provider),

            // ── Delivery Estimate ──
            _buildDeliveryEstimate(accent),

            // ── Description ──
            _buildDescription(accent, product),

            // ── Reviews Section ──
            _buildReviewsSection(accent, product),

            // ── Related Products ──
            if (relatedProducts.isNotEmpty)
              _buildRelatedProducts(accent, provider, relatedProducts),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // App Bar
  // ════════════════════════════════════════════════════════════════
  PreferredSizeWidget _buildAppBar(Color accent, Color darkBg, Product product) {
    return AppBar(
      backgroundColor: darkBg,
      elevation: 0,
      leading: Container(
        margin: const EdgeInsets.only(left: 8, top: 4, bottom: 4),
        decoration: BoxDecoration(
          color: const Color(AppConfig.cardBg).withOpacity(0.8),
          shape: BoxShape.circle,
        ),
        child: IconButton(
          icon: Icon(Icons.arrow_back, color: accent, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      actions: [
        // Share button
        Container(
          margin: const EdgeInsets.only(right: 8, top: 6, bottom: 6),
          decoration: BoxDecoration(
            color: const Color(AppConfig.cardBg),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: Icon(Icons.share, color: accent, size: 20),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: const Color(AppConfig.cardBg),
                  content: const Text('Share link copied!', style: TextStyle(color: Colors.white)),
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              );
            },
          ),
        ),
        // Wishlist button
        Container(
          margin: const EdgeInsets.only(right: 12, top: 6, bottom: 6),
          decoration: BoxDecoration(
            color: const Color(AppConfig.cardBg),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: Icon(
              context.watch<AppProvider>().isInWishlist(product.id)
                  ? Icons.favorite
                  : Icons.favorite_border,
              color: context.watch<AppProvider>().isInWishlist(product.id)
                  ? Colors.redAccent
                  : accent,
              size: 20,
            ),
            onPressed: () => context.read<AppProvider>().toggleWishlist(product.id),
          ),
        ),
      ],
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Breadcrumb
  // ════════════════════════════════════════════════════════════════
  Widget _buildBreadcrumb(Color accent, Product product) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Text(
              'Home',
              style: GoogleFonts.poppins(
                color: accent.withOpacity(0.6),
                fontSize: 11,
              ),
            ),
          ),
          Icon(Icons.chevron_right, color: Colors.white24, size: 14),
          Text(
            product.category,
            style: GoogleFonts.poppins(
              color: accent.withOpacity(0.6),
              fontSize: 11,
            ),
          ),
          Icon(Icons.chevron_right, color: Colors.white24, size: 14),
          Expanded(
            child: Text(
              product.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.poppins(
                color: Colors.white54,
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Image Gallery with Page Indicators
  // ════════════════════════════════════════════════════════════════
  Widget _buildImageGallery(Color accent, Color glowColor, Product product) {
    final images = product.images.isNotEmpty ? product.images : [''];

    return Column(
      children: [
        // Main gallery
        SizedBox(
          height: 320,
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: (i) => setState(() => _currentImageIndex = i),
            itemCount: images.length,
            itemBuilder: (context, index) {
              return GestureDetector(
                onTap: () => _showFullscreenImage(product, index),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    color: const Color(AppConfig.surfaceBg),
                    border: Border.all(color: accent.withOpacity(0.1), width: 0.5),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: CachedNetworkImage(
                    imageUrl: AppConfig.getImageUrl(images[index]),
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Center(
                      child: Icon(Icons.diamond, color: accent.withOpacity(0.3), size: 48),
                    ),
                    errorWidget: (_, __, ___) => Center(
                      child: Icon(Icons.diamond, color: accent.withOpacity(0.3), size: 48),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),

        // Page indicator dots
        if (images.length > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(images.length, (i) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: _currentImageIndex == i ? 20 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: _currentImageIndex == i ? accent : Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(3),
                boxShadow: _currentImageIndex == i
                    ? [BoxShadow(color: glowColor, blurRadius: 6)]
                    : null,
              ),
            )),
          ),

        // Thumbnails
        if (images.length > 1)
          Container(
            height: 56,
            margin: const EdgeInsets.only(top: 12),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: images.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final isActive = _currentImageIndex == index;
                return GestureDetector(
                  onTap: () {
                    _pageController.animateToPage(
                      index,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  },
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isActive ? accent : Colors.white.withOpacity(0.1),
                        width: isActive ? 1.5 : 0.5,
                      ),
                      boxShadow: isActive
                          ? [BoxShadow(color: glowColor, blurRadius: 8)]
                          : null,
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: CachedNetworkImage(
                      imageUrl: AppConfig.getImageUrl(images[index]),
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(
                        color: const Color(AppConfig.surfaceBg),
                        child: Icon(Icons.diamond, color: accent.withOpacity(0.3), size: 20),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        const SizedBox(height: 8),
      ],
    );
  }

  void _showFullscreenImage(Product product, int initialIndex) {
    final images = product.images.isNotEmpty ? product.images : [''];
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _FullscreenGallery(
          images: images,
          initialIndex: initialIndex,
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Product Info Section
  // ════════════════════════════════════════════════════════════════
  Widget _buildProductInfo(Color accent, Color accentLight, Color glowColor, Product product, AppProvider provider, bool isInWishlist) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: accent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: accent.withOpacity(0.2), width: 0.5),
            ),
            child: Text(
              product.category.toUpperCase(),
              style: GoogleFonts.poppins(
                color: accent,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Product name
          Text(
            product.name,
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 10),

          // Star rating row
          Row(
            children: [
              ...List.generate(5, (i) {
                final fullStars = product.rating.floor();
                final hasHalf = (product.rating - fullStars) >= 0.5;
                if (i < fullStars) {
                  return Icon(Icons.star, color: accent, size: 18);
                } else if (i == fullStars && hasHalf) {
                  return Icon(Icons.star_half, color: accent, size: 18);
                }
                return Icon(Icons.star_border, color: accent.withOpacity(0.3), size: 18);
              }),
              const SizedBox(width: 8),
              Text(
                '${product.rating.toStringAsFixed(1)}',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '(${product.reviewCount} reviews)',
                style: GoogleFonts.poppins(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Price with compare-at
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                provider.formatPrice(product.price),
                style: GoogleFonts.poppins(
                  color: accent,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 10),
              if (product.compareAtPrice != null && product.compareAtPrice! > product.price) ...[
                Text(
                  provider.formatPrice(product.compareAtPrice!),
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.3),
                    fontSize: 16,
                    decoration: TextDecoration.lineThrough,
                    decorationColor: Colors.white.withOpacity(0.3),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.green.shade600.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.shade600.withOpacity(0.3), width: 0.5),
                  ),
                  child: Text(
                    '${product.discountPercent}% OFF',
                    style: GoogleFonts.poppins(
                      color: Colors.green.shade400,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),

          // Stock status
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: product.stock > 0 ? Colors.green.shade400 : Colors.redAccent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                product.stock > 0
                    ? (product.stock <= 5 ? 'Only ${product.stock} left!' : 'In Stock')
                    : 'Out of Stock',
                style: GoogleFonts.poppins(
                  color: product.stock > 0
                      ? (product.stock <= 5 ? Colors.orange.shade300 : Colors.green.shade400)
                      : Colors.redAccent,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (product.isExternal && product.platform != null) ...[
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getPlatformColor(product.platform!).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _getPlatformColor(product.platform!).withOpacity(0.3),
                      width: 0.5,
                    ),
                  ),
                  child: Text(
                    'Available on ${product.platform!.toUpperCase()}',
                    style: GoogleFonts.poppins(
                      color: _getPlatformColor(product.platform!),
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),

          // Tags
          if (product.tags.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: product.tags.take(5).map((tag) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(AppConfig.surfaceBg),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.white.withOpacity(0.05), width: 0.5),
                  ),
                  child: Text(
                    '#$tag',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 10,
                    ),
                  ),
                )).toList(),
              ),
            ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Virtual Try-On CTA
  // ════════════════════════════════════════════════════════════════
  Widget _buildTryOnCTA(Color accent, Color glowColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.purple.withOpacity(0.15),
              accent.withOpacity(0.1),
              const Color(AppConfig.cardBg),
            ],
          ),
          border: Border.all(color: Colors.purple.withOpacity(0.2), width: 0.5),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Colors.purple.withOpacity(0.2),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.purple.withOpacity(0.3), width: 0.5),
              ),
              child: const Icon(Icons.visibility, color: Colors.purpleAccent, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Virtual Style Preview',
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'AI-powered try-on before you buy',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.purple.shade400, Colors.purple.shade600],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: Colors.purple.withOpacity(0.3), blurRadius: 12)],
              ),
              child: Text(
                'Try On',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Quantity Selector + Add to Cart
  // ════════════════════════════════════════════════════════════════
  Widget _buildCartSection(Color accent, Color glowColor, Product product, AppProvider provider) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Row(
        children: [
          // Quantity selector
          Container(
            decoration: BoxDecoration(
              color: const Color(AppConfig.cardBg),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: accent.withOpacity(0.15), width: 0.5),
            ),
            child: Row(
              children: [
                _QtyButton(
                  icon: Icons.remove,
                  onTap: () {
                    if (_quantity > 1) setState(() => _quantity--);
                  },
                  accent: accent,
                ),
                Container(
                  width: 40,
                  alignment: Alignment.center,
                  child: Text(
                    '$_quantity',
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _QtyButton(
                  icon: Icons.add,
                  onTap: () {
                    if (_quantity < product.stock) setState(() => _quantity++);
                  },
                  accent: accent,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Add to Cart button
          Expanded(
            child: SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: product.stock <= 0
                    ? null
                    : () {
                        for (int i = 0; i < _quantity; i++) {
                          provider.addToCart(product);
                        }
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: const Color(AppConfig.cardBg),
                            content: Text(
                              '${product.name} added to cart',
                              style: const TextStyle(color: Colors.white),
                            ),
                            duration: const Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        );
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: accent,
                  disabledBackgroundColor: accent.withOpacity(0.3),
                  foregroundColor: const Color(AppConfig.darkBg),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                  shadowColor: glowColor,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      product.isExternal ? Icons.open_in_new : Icons.shopping_bag,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      product.isExternal ? 'Shop on ${product.platform}' : 'Add to Cart',
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Delivery Estimate
  // ════════════════════════════════════════════════════════════════
  Widget _buildDeliveryEstimate(Color accent) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(AppConfig.cardBg),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: accent.withOpacity(0.1), width: 0.5),
        ),
        child: Column(
          children: [
            _DeliveryRow(
              icon: Icons.local_shipping,
              title: 'Free Delivery',
              subtitle: 'Estimated 3-5 business days',
              iconColor: Colors.green.shade400,
              accent: accent,
            ),
            const SizedBox(height: 12),
            _DeliveryRow(
              icon: Icons.replay,
              title: 'Easy Returns',
              subtitle: '7-day return policy',
              iconColor: Colors.blue.shade300,
              accent: accent,
            ),
            const SizedBox(height: 12),
            _DeliveryRow(
              icon: Icons.verified,
              title: 'Authentic Products',
              subtitle: '100% genuine guaranteed',
              iconColor: accent,
              accent: accent,
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Description
  // ════════════════════════════════════════════════════════════════
  Widget _buildDescription(Color accent, Product product) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 3, height: 18, decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 10),
              Text(
                'DESCRIPTION',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            product.description.isNotEmpty ? product.description : 'No description available for this product.',
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.6),
              fontSize: 13,
              height: 1.7,
            ),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Reviews Section
  // ════════════════════════════════════════════════════════════════
  Widget _buildReviewsSection(Color accent, Product product) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 3, height: 18, decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 10),
              Text(
                'REVIEWS',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: accent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${product.reviewCount}',
                  style: GoogleFonts.poppins(
                    color: accent,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Rating summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(AppConfig.cardBg),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: accent.withOpacity(0.1), width: 0.5),
            ),
            child: Row(
              children: [
                // Big rating number
                Column(
                  children: [
                    Text(
                      product.rating.toStringAsFixed(1),
                      style: GoogleFonts.poppins(
                        color: accent,
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Row(
                      children: List.generate(5, (i) => Icon(
                        i < product.rating.floor() ? Icons.star : Icons.star_border,
                        color: accent,
                        size: 14,
                      )),
                    ),
                  ],
                ),
                const SizedBox(width: 20),
                // Rating bars
                Expanded(
                  child: Column(
                    children: [5, 4, 3, 2, 1].map((stars) {
                      final percent = stars == 5 ? 0.6 : stars == 4 ? 0.25 : stars == 3 ? 0.1 : 0.05;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            Text('$stars', style: GoogleFonts.poppins(color: Colors.white54, fontSize: 10)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: percent,
                                  backgroundColor: const Color(AppConfig.surfaceBg),
                                  valueColor: AlwaysStoppedAnimation(accent),
                                  minHeight: 6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Related Products
  // ════════════════════════════════════════════════════════════════
  Widget _buildRelatedProducts(Color accent, AppProvider provider, List<Product> related) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 3, height: 18, decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 10),
              Text(
                'YOU MAY ALSO LIKE',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 310,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: related.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (context, index) {
                final product = related[index];
                return SizedBox(
                  width: 170,
                  child: ProductCard(
                    product: product,
                    onTap: () {
                      provider.selectProduct(product);
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(builder: (_) => const ProductDetailScreen()),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Color _getPlatformColor(String platform) {
    switch (platform.toLowerCase()) {
      case 'amazon': return const Color(0xFFFF9900);
      case 'flipkart': return const Color(0xFF2874F0);
      case 'myntra': return const Color(0xFFFF3F6C);
      case 'ajio': return const Color(0xFF3B3B3B);
      case 'nykaa': return const Color(0xFFFFAF87);
      default: return const Color(AppConfig.primaryGold);
    }
  }
}

// ════════════════════════════════════════════════════════════════
// Helper Widgets
// ════════════════════════════════════════════════════════════════

class _QtyButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color accent;

  const _QtyButton({required this.icon, required this.onTap, required this.accent});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: const Color(AppConfig.surfaceBg),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: accent, size: 18),
      ),
    );
  }
}

class _DeliveryRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color iconColor;
  final Color accent;

  const _DeliveryRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.iconColor,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: iconColor.withOpacity(0.2), width: 0.5),
          ),
          child: Icon(icon, color: iconColor, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                subtitle,
                style: GoogleFonts.poppins(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Fullscreen Image Gallery
// ════════════════════════════════════════════════════════════════
class _FullscreenGallery extends StatefulWidget {
  final List<String> images;
  final int initialIndex;

  const _FullscreenGallery({required this.images, required this.initialIndex});

  @override
  State<_FullscreenGallery> createState() => _FullscreenGalleryState();
}

class _FullscreenGalleryState extends State<_FullscreenGallery> {
  late PageController _controller;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _controller = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final accent = provider.accentColor;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          '${_currentIndex + 1} / ${widget.images.length}',
          style: GoogleFonts.poppins(color: Colors.white54, fontSize: 14),
        ),
      ),
      body: PageView.builder(
        controller: _controller,
        onPageChanged: (i) => setState(() => _currentIndex = i),
        itemCount: widget.images.length,
        itemBuilder: (context, index) {
          return InteractiveViewer(
            minScale: 0.5,
            maxScale: 3.0,
            child: Center(
              child: CachedNetworkImage(
                imageUrl: AppConfig.getImageUrl(widget.images[index]),
                fit: BoxFit.contain,
                placeholder: (_, __) => Center(
                  child: CircularProgressIndicator(color: accent),
                ),
                errorWidget: (_, __, ___) => const Icon(
                  Icons.broken_image,
                  color: Colors.white24,
                  size: 64,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
