import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/app_config.dart';
import '../models/app_models.dart';
import '../providers/app_providers.dart';

class ProductCard extends StatefulWidget {
  final Product product;
  final VoidCallback? onTap;

  const ProductCard({
    super.key,
    required this.product,
    this.onTap,
  });

  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard> with SingleTickerProviderStateMixin {
  late AnimationController _scaleController;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
      lowerBound: 0.95,
      upperBound: 1.0,
    )..value = 1.0;
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails _) {
    _scaleController.reverse();
    setState(() => _isPressed = true);
  }

  void _onTapUp(TapUpDetails _) {
    _scaleController.forward();
    setState(() => _isPressed = false);
  }

  void _onTapCancel() {
    _scaleController.forward();
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final accent = provider.accentColor;
    final accentLight = provider.accentLightColor;
    final glowColor = provider.accentGlow;
    final isInWishlist = provider.isInWishlist(widget.product.id);

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _scaleController,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleController.value,
            child: child,
          );
        },
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(AppConfig.cardBg),
                const Color(AppConfig.cardBg).withOpacity(0.95),
              ],
            ),
            border: Border.all(
              color: _isPressed
                  ? accent.withOpacity(0.5)
                  : accent.withOpacity(0.1),
              width: _isPressed ? 1.0 : 0.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
              if (_isPressed)
                BoxShadow(
                  color: glowColor,
                  blurRadius: 16,
                  spreadRadius: 1,
                ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Image Section ──
              Stack(
                children: [
                  // Product image with glassmorphism backdrop
                  AspectRatio(
                    aspectRatio: 1.0,
                    child: CachedNetworkImage(
                      imageUrl: AppConfig.getImageUrl(
                        widget.product.images.isNotEmpty ? widget.product.images[0] : '',
                      ),
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: const Color(AppConfig.surfaceBg),
                        child: Center(
                          child: Icon(
                            Icons.diamond,
                            color: accent.withOpacity(0.3),
                            size: 32,
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: const Color(AppConfig.surfaceBg),
                        child: Center(
                          child: Icon(
                            Icons.diamond,
                            color: accent.withOpacity(0.3),
                            size: 32,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Gradient overlay at bottom
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: Container(
                      height: 70,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.7),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Discount badge (top-left)
                  if (widget.product.discountPercent > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.shade600,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.green.shade600.withOpacity(0.3),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Text(
                          '-${widget.product.discountPercent}%',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),

                  // Platform badge as floating pill (top-right)
                  if (widget.product.isExternal && widget.product.platform != null)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getPlatformColor(widget.product.platform!).withOpacity(0.9),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: _getPlatformColor(widget.product.platform!).withOpacity(0.3),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Text(
                          widget.product.platform!.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),

                  // Virtual Try-On badge
                  if (!widget.product.isExternal)
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.purple.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.purple.shade200.withOpacity(0.3),
                            width: 0.5,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.visibility, color: Colors.white, size: 10),
                            const SizedBox(width: 3),
                            Text(
                              'Try-On',
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontSize: 8,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Wishlist heart with bounce
                  Positioned(
                    top: 8,
                    right: widget.product.isExternal ? 0 : 8,
                    child: GestureDetector(
                      onTap: () {
                        provider.toggleWishlist(widget.product.id);
                      },
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.4),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isInWishlist
                                ? Colors.redAccent.withOpacity(0.5)
                                : Colors.white.withOpacity(0.1),
                            width: 0.5,
                          ),
                        ),
                        child: Icon(
                          isInWishlist ? Icons.favorite : Icons.favorite_border,
                          color: isInWishlist ? Colors.redAccent : Colors.white70,
                          size: 16,
                        ),
                      ),
                    ),
                  ),

                  // Featured badge
                  if (widget.product.featured)
                    Positioned(
                      top: widget.product.discountPercent > 0 ? 32 : 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: accent.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'FEATURED',
                          style: TextStyle(
                            color: Color(AppConfig.darkBg),
                            fontSize: 7,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                ],
              ),

              // ── Details Section ──
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Product name
                    Text(
                      widget.product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),

                    // Category
                    Text(
                      widget.product.category.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        color: accent.withOpacity(0.7),
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 6),

                    // Star rating
                    Row(
                      children: [
                        _buildStarRating(widget.product.rating, accent: accent, size: 11),
                        const SizedBox(width: 4),
                        Text(
                          '(${widget.product.reviewCount})',
                          style: GoogleFonts.poppins(
                            color: Colors.white.withOpacity(0.35),
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Price row
                    Row(
                      children: [
                        Text(
                          provider.formatPrice(widget.product.price),
                          style: GoogleFonts.poppins(
                            color: accent,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 6),
                        if (widget.product.compareAtPrice != null &&
                            widget.product.compareAtPrice! > widget.product.price)
                          Text(
                            provider.formatPrice(widget.product.compareAtPrice!),
                            style: GoogleFonts.poppins(
                              color: Colors.white.withOpacity(0.3),
                              fontSize: 10,
                              decoration: TextDecoration.lineThrough,
                              decorationColor: Colors.white.withOpacity(0.3),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),

              // ── Add to Cart Button ──
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
                child: SizedBox(
                  width: double.infinity,
                  height: 34,
                  child: ElevatedButton(
                    onPressed: () {
                      if (widget.product.isExternal && widget.product.affiliateUrl != null) {
                        _showPlatformSheet(context, widget.product, accent);
                      } else {
                        provider.addToCart(widget.product);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: const Color(AppConfig.cardBg),
                            content: Text(
                              '${widget.product.name} added to cart',
                              style: const TextStyle(color: Colors.white),
                            ),
                            duration: const Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: widget.product.isExternal
                          ? _getPlatformColor(widget.product.platform ?? '')
                          : accent,
                      foregroundColor: const Color(AppConfig.darkBg),
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      widget.product.isExternal ? 'Shop Now' : 'Add to Cart',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStarRating(double rating, {required Color accent, double size = 12}) {
    final stars = <Widget>[];
    final fullStars = rating.floor();
    final hasHalf = (rating - fullStars) >= 0.5;

    for (int i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.add(Icon(Icons.star, color: accent, size: size));
      } else if (i == fullStars && hasHalf) {
        stars.add(Icon(Icons.star_half, color: accent, size: size));
      } else {
        stars.add(Icon(Icons.star_border, color: accent.withOpacity(0.3), size: size));
      }
    }
    return Row(mainAxisSize: MainAxisSize.min, children: stars);
  }

  Color _getPlatformColor(String platform) {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return const Color(0xFFFF9900);
      case 'flipkart':
        return const Color(0xFF2874F0);
      case 'myntra':
        return const Color(0xFFFF3F6C);
      case 'ajio':
        return const Color(0xFF3B3B3B);
      case 'nykaa':
        return const Color(0xFFFFAF87);
      default:
        return const Color(AppConfig.primaryGold);
    }
  }

  void _showPlatformSheet(BuildContext context, Product product, Color accent) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(AppConfig.cardBg),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: _getPlatformColor(product.platform ?? '').withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: _getPlatformColor(product.platform ?? '').withOpacity(0.3),
                    width: 0.5,
                  ),
                ),
                child: Icon(
                  Icons.open_in_new,
                  color: _getPlatformColor(product.platform ?? ''),
                  size: 28,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Shop on ${product.platform ?? 'Platform'}',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'You will be redirected to ${product.platform ?? 'the platform'} to complete your purchase.',
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    // TODO: Launch URL with url_launcher
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _getPlatformColor(product.platform ?? ''),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'Continue to Platform',
                    style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Shimmer Loading Placeholder
// ════════════════════════════════════════════════════════════════
class ProductCardShimmer extends StatelessWidget {
  const ProductCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    const shimmerBase = Color(0xFF292524);
    const shimmerHighlight = Color(0xFF44403C);

    return Shimmer.fromColors(
      baseColor: shimmerBase,
      highlightColor: shimmerHighlight,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(AppConfig.cardBg),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFFD4A437).withOpacity(0.08),
            width: 0.5,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image placeholder
            const AspectRatio(
              aspectRatio: 1.0,
              child: DecoratedBox(
                decoration: BoxDecoration(color: Colors.white12),
              ),
            ),
            // Details
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    height: 14,
                    decoration: BoxDecoration(
                      color: Colors.white12,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: 60,
                    height: 9,
                    decoration: BoxDecoration(
                      color: Colors.white12,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: 80,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.white12,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: 70,
                    height: 16,
                    decoration: BoxDecoration(
                      color: Colors.white12,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
            // Button
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: Container(
                width: double.infinity,
                height: 34,
                decoration: BoxDecoration(
                  color: Colors.white12,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
