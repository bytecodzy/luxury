import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../checkout/checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final accent = provider.accentColor;
    final glowColor = provider.accentGlow;
    const darkBg = Color(AppConfig.darkBg);

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: darkBg,
        elevation: 0,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: accent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: accent.withOpacity(0.2), width: 0.5),
              ),
              child: Icon(Icons.shopping_bag_outlined, color: accent, size: 18),
            ),
            const SizedBox(width: 12),
            Text(
              'Shopping Bag',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        actions: [
          if (provider.cartCount > 0)
            Container(
              margin: const EdgeInsets.only(right: 16, top: 14, bottom: 14),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [accent, Color(provider.accentDarkColor)],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: glowColor, blurRadius: 8)],
              ),
              child: Text(
                '${provider.cartCount}',
                style: GoogleFonts.poppins(
                  color: const Color(AppConfig.darkBg),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
      body: Consumer<AppProvider>(
        builder: (context, provider, _) {
          if (provider.cartItems.isEmpty) {
            return _EmptyCartState(provider: provider);
          }
          return Column(
            children: [
              // ── Cart Items List ──
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  itemCount: provider.cartItems.length + 1, // +1 for promo code
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    // Last item is promo code
                    if (index == provider.cartItems.length) {
                      return _PromoCodeCard(accent: accent);
                    }
                    final item = provider.cartItems[index];
                    return _CartItemCard(
                      item: item,
                      provider: provider,
                      accent: accent,
                      glowColor: glowColor,
                    );
                  },
                ),
              ),

              // ── Order Summary Card ──
              _OrderSummaryCard(provider: provider),
            ],
          );
        },
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Empty Cart State
// ════════════════════════════════════════════════════════════════
class _EmptyCartState extends StatelessWidget {
  final AppProvider provider;

  const _EmptyCartState({required this.provider});

  @override
  Widget build(BuildContext context) {
    final accent = provider.accentColor;
    final glowColor = provider.accentGlow;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: const Color(AppConfig.surfaceBg),
              shape: BoxShape.circle,
              border: Border.all(
                color: accent.withOpacity(0.15),
                width: 1,
              ),
              boxShadow: [BoxShadow(color: glowColor, blurRadius: 20)],
            ),
            child: Icon(
              Icons.shopping_bag_outlined,
              size: 44,
              color: accent.withOpacity(0.4),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Your bag is empty',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Discover luxury gifts and add them\nto your shopping bag',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: Colors.white.withOpacity(0.4),
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 32),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: LinearGradient(
                colors: [accent, Color(provider.accentDarkColor)],
              ),
              boxShadow: [BoxShadow(color: glowColor, blurRadius: 16)],
            ),
            child: ElevatedButton(
              onPressed: () {
                provider.setTab(0);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                foregroundColor: const Color(AppConfig.darkBg),
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 0,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Shop Now',
                    style: GoogleFonts.poppins(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Cart Item Card
// ════════════════════════════════════════════════════════════════
class _CartItemCard extends StatelessWidget {
  final CartItem item;
  final AppProvider provider;
  final Color accent;
  final Color glowColor;

  const _CartItemCard({
    required this.item,
    required this.provider,
    required this.accent,
    required this.glowColor,
  });

  @override
  Widget build(BuildContext context) {
    const cardBg = Color(AppConfig.cardBg);

    return Dismissible(
      key: Key(item.productId),
      direction: DismissDirection.endToStart,
      onDismissed: (_) {
        provider.removeFromCart(item.productId);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: cardBg,
            content: Row(
              children: [
                const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${item.name} removed from bag',
                    style: const TextStyle(color: Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: Colors.redAccent.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.redAccent.withOpacity(0.2),
            width: 0.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.delete_outline, color: Colors.redAccent, size: 28),
            const SizedBox(height: 4),
            Text(
              'Remove',
              style: GoogleFonts.poppins(
                color: Colors.redAccent,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: accent.withOpacity(0.08),
            width: 0.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Product Image ──
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: accent.withOpacity(0.1),
                  width: 0.5,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  item.image,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: const Color(AppConfig.surfaceBg),
                    child: Center(
                      child: Icon(Icons.diamond, color: accent.withOpacity(0.3), size: 28),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),

            // ── Product Details ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    provider.formatPrice(item.price),
                    style: GoogleFonts.poppins(
                      color: accent,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Quantity Controls ──
                  Row(
                    children: [
                      // Decrease
                      _InlineQuantityButton(
                        icon: Icons.remove,
                        onTap: () {
                          provider.updateCartQuantity(
                            item.productId,
                            item.quantity - 1,
                          );
                        },
                        accent: accent,
                      ),
                      // Quantity display
                      Container(
                        constraints: const BoxConstraints(minWidth: 36),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          '${item.quantity}',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      // Increase
                      _InlineQuantityButton(
                        icon: Icons.add,
                        onTap: () {
                          provider.updateCartQuantity(
                            item.productId,
                            item.quantity + 1,
                          );
                        },
                        accent: accent,
                      ),
                      const Spacer(),
                      // Item total
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: accent.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          provider.formatPrice(item.price * item.quantity),
                          style: GoogleFonts.poppins(
                            color: Colors.white.withOpacity(0.7),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Inline Quantity Button
// ════════════════════════════════════════════════════════════════
class _InlineQuantityButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color accent;

  const _InlineQuantityButton({
    required this.icon,
    required this.onTap,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: const Color(AppConfig.surfaceBg),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: accent.withOpacity(0.15),
            width: 0.5,
          ),
        ),
        child: Icon(icon, color: accent, size: 16),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Promo Code Card
// ════════════════════════════════════════════════════════════════
class _PromoCodeCard extends StatefulWidget {
  final Color accent;

  const _PromoCodeCard({required this.accent});

  @override
  State<_PromoCodeCard> createState() => _PromoCodeCardState();
}

class _PromoCodeCardState extends State<_PromoCodeCard> {
  final _promoController = TextEditingController();
  bool _applied = false;

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accent = widget.accent;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(AppConfig.cardBg),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: accent.withOpacity(0.1),
          width: 0.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.local_offer, color: accent, size: 18),
              const SizedBox(width: 8),
              Text(
                'Promo Code',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(AppConfig.surfaceBg),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _applied ? Colors.green.shade400.withOpacity(0.3) : accent.withOpacity(0.1),
                      width: 0.5,
                    ),
                  ),
                  child: TextField(
                    controller: _promoController,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                    decoration: InputDecoration(
                      hintText: _applied ? 'LUXURY10 applied!' : 'Enter code',
                      hintStyle: GoogleFonts.poppins(
                        color: _applied ? Colors.green.shade400 : Colors.white.withOpacity(0.3),
                        fontSize: 13,
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                      prefixIcon: Icon(
                        _applied ? Icons.check_circle : Icons.confirmation_number,
                        color: _applied ? Colors.green.shade400 : accent.withOpacity(0.4),
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () {
                  if (!_applied && _promoController.text.isNotEmpty) {
                    setState(() => _applied = true);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: const Color(AppConfig.cardBg),
                        content: Row(
                          children: [
                            const Icon(Icons.check_circle, color: Colors.green, size: 18),
                            const SizedBox(width: 10),
                            Text(
                              'Promo code applied!',
                              style: GoogleFonts.poppins(color: Colors.green),
                            ),
                          ],
                        ),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    );
                  } else if (_applied) {
                    setState(() {
                      _applied = false;
                      _promoController.clear();
                    });
                  }
                },
                child: Container(
                  height: 44,
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  decoration: BoxDecoration(
                    color: _applied ? Colors.green.shade600.withOpacity(0.15) : accent,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _applied ? Colors.green.shade400.withOpacity(0.3) : Colors.transparent,
                      width: 0.5,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      _applied ? 'Remove' : 'Apply',
                      style: GoogleFonts.poppins(
                        color: _applied ? Colors.green.shade400 : const Color(AppConfig.darkBg),
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Order Summary Card
// ════════════════════════════════════════════════════════════════
class _OrderSummaryCard extends StatelessWidget {
  final AppProvider provider;

  const _OrderSummaryCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final accent = provider.accentColor;
    final accentDark = provider.accentDarkColor;
    final glowColor = provider.accentGlow;
    const cardBg = Color(AppConfig.cardBg);

    final subtotal = provider.cartTotal;
    final shipping = subtotal >= 5000 ? 0.0 : 149.0;
    final total = subtotal + shipping;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      decoration: BoxDecoration(
        color: cardBg,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
          BoxShadow(
            color: glowColor,
            blurRadius: 4,
            offset: const Offset(0, -1),
          ),
        ],
        border: Border(
          top: BorderSide(
            color: accent.withOpacity(0.15),
            width: 0.5,
          ),
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Subtotal
            _SummaryRow(
              label: 'Subtotal',
              value: provider.formatPrice(subtotal),
              accent: accent,
            ),
            const SizedBox(height: 8),

            // Shipping
            _SummaryRow(
              label: 'Shipping',
              value: shipping == 0 ? 'FREE' : provider.formatPrice(shipping),
              valueColor: shipping == 0 ? Colors.green.shade400 : null,
              accent: accent,
            ),
            if (shipping > 0) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Spacer(),
                  Text(
                    'Free shipping on orders above ${provider.formatPrice(5000)}',
                    style: GoogleFonts.poppins(
                      color: accent.withOpacity(0.5),
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 12),
            Container(
              height: 0.5,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.transparent, const Color(0xFF44403C), Colors.transparent],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  provider.formatPrice(total),
                  style: GoogleFonts.poppins(
                    color: accent,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Proceed to Checkout
            Container(
              width: double.infinity,
              height: 54,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: LinearGradient(
                  colors: [accent, accentDark],
                ),
                boxShadow: [BoxShadow(color: glowColor, blurRadius: 16)],
              ),
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const CheckoutScreen(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  foregroundColor: const Color(AppConfig.darkBg),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Proceed to Checkout',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward, size: 18),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Summary Row
// ════════════════════════════════════════════════════════════════
class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final Color accent;

  const _SummaryRow({
    required this.label,
    required this.value,
    required this.accent,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            color: Colors.white.withOpacity(0.5),
            fontSize: 13,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.poppins(
            color: valueColor ?? Colors.white,
            fontSize: 13,
            fontWeight: valueColor != null ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
