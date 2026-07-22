import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../models/app_models.dart';
import '../../providers/app_providers.dart';
import '../../widgets/product_card.dart';
import '../product/product_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  late AnimationController _particleController;
  late PageController _carouselController;
  final GlobalKey<RefreshIndicatorState> _refreshKey = GlobalKey<RefreshIndicatorState>();
  int _carouselPage = 0;

  @override
  void initState() {
    super.initState();
    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
    _carouselController = PageController(initialPage: 0, viewportFraction: 0.92);
  }

  @override
  void dispose() {
    _particleController.dispose();
    _carouselController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    final provider = context.read<AppProvider>();
    await Future.wait([
      provider.loadProducts(),
      provider.loadCategories(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final accent = provider.accentColor;
    final accentLight = provider.accentLightColor;
    final glowColor = provider.accentGlow;

    return Scaffold(
      backgroundColor: const Color(AppConfig.darkBg),
      body: RefreshIndicator(
        key: _refreshKey,
        color: accent,
        backgroundColor: const Color(AppConfig.cardBg),
        onRefresh: _onRefresh,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // ── Custom App Bar ──
            SliverToBoxAdapter(child: _buildAppBar(accent, glowColor, provider)),

            // ── Hero Carousel ──
            SliverToBoxAdapter(child: _buildHeroCarousel(accent, accentLight, glowColor)),

            // ── Discover Section ──
            SliverToBoxAdapter(child: _buildDiscoverSection(accent, glowColor)),

            // ── How It Works ──
            SliverToBoxAdapter(child: _buildHowItWorks(accent, accentLight, glowColor)),

            // ── AI Try-On Banner ──
            SliverToBoxAdapter(child: _buildTryOnBanner(accent, glowColor)),

            // ── Categories Section ──
            SliverToBoxAdapter(child: _buildCategoriesSection(accent, glowColor, provider)),

            // ── Featured Products ──
            if (provider.featuredProducts.isNotEmpty)
              _buildFeaturedSection(accent, glowColor, provider),

            // ── App-Exclusive Deals ──
            SliverToBoxAdapter(child: _buildExclusiveDeals(accent, glowColor)),

            // ── Bottom Padding ──
            const SliverToBoxAdapter(child: SizedBox(height: 40)),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Custom App Bar
  // ════════════════════════════════════════════════════════════════
  Widget _buildAppBar(Color accent, Color glowColor, AppProvider provider) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 20,
        right: 20,
        bottom: 16,
      ),
      decoration: BoxDecoration(
        color: const Color(AppConfig.darkBg),
        border: Border(
          bottom: BorderSide(
            color: accent.withOpacity(0.1),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          // Logo icon with glow
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: accent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: accent.withOpacity(0.2), width: 0.5),
              boxShadow: [BoxShadow(color: glowColor, blurRadius: 12)],
            ),
            child: Icon(Icons.diamond, color: accent, size: 22),
          ),
          const SizedBox(width: 12),
          // Brand name
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppConfig.appName,
                  style: GoogleFonts.poppins(
                    color: accent,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2,
                  ),
                ),
                Text(
                  AppConfig.appTagline,
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.35),
                    fontSize: 9,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
          // Theme picker button
          _ThemePickerButton(accent: accent, glowColor: glowColor),
          const SizedBox(width: 8),
          // Search button
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(AppConfig.cardBg),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: accent.withOpacity(0.1), width: 0.5),
            ),
            child: IconButton(
              icon: Icon(Icons.search, color: accent, size: 20),
              onPressed: () => _showSearchDialog(provider),
              padding: EdgeInsets.zero,
            ),
          ),
        ],
      ),
    );
  }

  void _showSearchDialog(AppProvider provider) {
    final controller = TextEditingController(text: provider.searchQuery);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(AppConfig.cardBg),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Search', style: GoogleFonts.poppins(color: provider.accentColor)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: GoogleFonts.poppins(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Search luxury gifts...',
            hintStyle: GoogleFonts.poppins(color: Colors.white38),
            prefixIcon: Icon(Icons.search, color: provider.accentColor),
          ),
          onSubmitted: (val) {
            provider.setSearch(val);
            Navigator.pop(ctx);
          },
        ),
        actions: [
          TextButton(
            onPressed: () {
              provider.clearSearch();
              Navigator.pop(ctx);
            },
            child: Text('Clear', style: GoogleFonts.poppins(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () {
              provider.setSearch(controller.text);
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: provider.accentColor),
            child: Text('Search', style: GoogleFonts.poppins(color: const Color(AppConfig.darkBg))),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Hero Carousel
  // ════════════════════════════════════════════════════════════════
  Widget _buildHeroCarousel(Color accent, Color accentLight, Color glowColor) {
    final slides = [
      _HeroSlide(
        title: 'Luxury Gifting\nRedefined',
        subtitle: 'Curated collections for every occasion',
        cta: 'Explore Now',
        icon: Icons.diamond,
        gradient: [accent.withOpacity(0.3), const Color(AppConfig.darkBg)],
      ),
      _HeroSlide(
        title: 'AI Virtual\nTry-On',
        subtitle: 'See how it looks before you gift',
        cta: 'Try Now',
        icon: Icons.visibility,
        gradient: [Colors.purple.withOpacity(0.3), const Color(AppConfig.darkBg)],
      ),
      _HeroSlide(
        title: 'Gift\nConcierge',
        subtitle: 'Personalized AI-powered recommendations',
        cta: 'Get Started',
        icon: Icons.auto_awesome,
        gradient: [Colors.teal.withOpacity(0.3), const Color(AppConfig.darkBg)],
      ),
    ];

    return Container(
      height: 280,
      margin: const EdgeInsets.only(top: 8),
      child: Stack(
        children: [
          // Carousel
          PageView.builder(
            controller: _carouselController,
            onPageChanged: (i) => setState(() => _carouselPage = i),
            itemCount: slides.length,
            itemBuilder: (context, index) {
              final slide = slides[index];
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: slide.gradient,
                  ),
                  border: Border.all(color: accent.withOpacity(0.15), width: 0.5),
                ),
                child: Stack(
                  children: [
                    // Floating particles
                    ...List.generate(6, (i) => _FloatingParticle(
                      controller: _particleController,
                      accent: accent,
                      index: i,
                    )),

                    // Content
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Icon badge
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: accent.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: accent.withOpacity(0.3), width: 0.5),
                            ),
                            child: Icon(slide.icon, color: accent, size: 24),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            slide.title,
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              height: 1.15,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            slide.subtitle,
                            style: GoogleFonts.poppins(
                              color: Colors.white.withOpacity(0.5),
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 16),
                          // CTA button
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            decoration: BoxDecoration(
                              color: accent,
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [BoxShadow(color: glowColor, blurRadius: 12)],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  slide.cta,
                                  style: GoogleFonts.poppins(
                                    color: const Color(AppConfig.darkBg),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Icon(Icons.arrow_forward, color: Color(AppConfig.darkBg), size: 16),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),

          // Page indicator dots
          Positioned(
            bottom: 16,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(slides.length, (i) => AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: _carouselPage == i ? 24 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _carouselPage == i ? accent : Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                  boxShadow: _carouselPage == i ? [BoxShadow(color: glowColor, blurRadius: 8)] : null,
                ),
              )),
            ),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Discover Section
  // ════════════════════════════════════════════════════════════════
  Widget _buildDiscoverSection(Color accent, Color glowColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header with ornamental divider
          _SectionHeader(title: 'Discover 3 Boxes Luxury', accent: accent),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(AppConfig.cardBg),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: accent.withOpacity(0.1), width: 0.5),
            ),
            child: Column(
              children: [
                Text(
                  'Your premier destination for luxury gifting. We curate the finest products from top brands and marketplaces, powered by AI to help you find the perfect gift every time.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 13,
                    height: 1.7,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _StatCard(label: '500+', value: 'Products', accent: accent, glowColor: glowColor),
                    const SizedBox(width: 10),
                    _StatCard(label: '50+', value: 'Brands', accent: accent, glowColor: glowColor),
                    const SizedBox(width: 10),
                    _StatCard(label: '4.8', value: 'Rating', accent: accent, glowColor: glowColor),
                    const SizedBox(width: 10),
                    _StatCard(label: '24/7', value: 'Support', accent: accent, glowColor: glowColor),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // How It Works
  // ════════════════════════════════════════════════════════════════
  Widget _buildHowItWorks(Color accent, Color accentLight, Color glowColor) {
    final steps = [
      _HowItWorksStep(icon: Icons.search, title: 'Browse & Discover', desc: 'Explore curated luxury collections across categories'),
      _HowItWorksStep(icon: Icons.visibility, title: 'Virtual Try-On', desc: 'AI-powered preview before you buy or gift'),
      _HowItWorksStep(icon: Icons.card_giftcard, title: 'Shop & Gift', desc: 'Seamless checkout with gift wrapping options'),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(title: 'How It Works', accent: accent),
          const SizedBox(height: 16),
          Row(
            children: List.generate(steps.length, (i) {
              final step = steps[i];
              return Expanded(
                child: Column(
                  children: [
                    // Step number + icon
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: accent.withOpacity(0.1),
                            shape: BoxShape.circle,
                            border: Border.all(color: accent.withOpacity(0.2), width: 0.5),
                            boxShadow: [BoxShadow(color: glowColor, blurRadius: 16)],
                          ),
                          child: Icon(step.icon, color: accent, size: 28),
                        ),
                        Positioned(
                          top: 0,
                          right: 0,
                          child: Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: accent,
                              shape: BoxShape.circle,
                              boxShadow: [BoxShadow(color: glowColor, blurRadius: 6)],
                            ),
                            child: Center(
                              child: Text(
                                '${i + 1}',
                                style: GoogleFonts.poppins(
                                  color: const Color(AppConfig.darkBg),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    // Connecting line
                    if (i < steps.length - 1)
                      Container(
                        margin: const EdgeInsets.only(top: 8),
                        height: 2,
                        width: 32,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [accent.withOpacity(0.5), Colors.transparent],
                          ),
                        ),
                      ),
                    const SizedBox(height: 12),
                    Text(
                      step.title,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      step.desc,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: GoogleFonts.poppins(
                        color: Colors.white.withOpacity(0.4),
                        fontSize: 10,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // AI Try-On Banner
  // ════════════════════════════════════════════════════════════════
  Widget _buildTryOnBanner(Color accent, Color glowColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.purple.withOpacity(0.2),
              accent.withOpacity(0.15),
              const Color(AppConfig.cardBg),
            ],
          ),
          border: Border.all(color: accent.withOpacity(0.2), width: 0.5),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.green.shade400.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green.shade400.withOpacity(0.3), width: 0.5),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: Colors.green.shade400,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'LIVE',
                              style: GoogleFonts.poppins(
                                color: Colors.green.shade400,
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'AI Virtual Try-On',
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'See how products look on you\nbefore purchasing',
                    style: GoogleFonts.poppins(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: accent.withOpacity(0.2),
                shape: BoxShape.circle,
                border: Border.all(color: accent.withOpacity(0.3), width: 0.5),
                boxShadow: [BoxShadow(color: glowColor, blurRadius: 20)],
              ),
              child: Icon(Icons.visibility, color: accent, size: 28),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Categories Section
  // ════════════════════════════════════════════════════════════════
  Widget _buildCategoriesSection(Color accent, Color glowColor, AppProvider provider) {
    if (provider.categories.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());

    // Map category names to icons and accent colors
    final categoryIcons = <String, IconData>{
      'men': Icons.male,
      'women': Icons.female,
      'kids': Icons.child_care,
      'couple': Icons.favorite,
      'corporate': Icons.business_center,
      'home': Icons.home,
      'tech': Icons.devices,
      'fashion': Icons.checkroom,
      'beauty': Icons.spa,
      'jewelry': Icons.diamond,
      'food': Icons.restaurant,
      'wellness': Icons.self_improvement,
    };

    final categoryAccents = <String, Color>{
      'couple': Colors.pink.shade400,
      'men': Colors.amber.shade600,
      'women': Colors.pink.shade300,
      'kids': Colors.cyan.shade400,
      'corporate': Colors.blueGrey.shade400,
      'home': Colors.orange.shade400,
      'tech': Colors.blue.shade400,
      'fashion': Colors.purple.shade300,
      'beauty': Colors.pink.shade200,
      'jewelry': Colors.amber.shade400,
      'food': Colors.red.shade300,
      'wellness': Colors.green.shade300,
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(title: 'Categories', accent: accent),
          const SizedBox(height: 16),
          SizedBox(
            height: 110,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: provider.categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final cat = provider.categories[index];
                final slug = cat.slug.toLowerCase();
                final catAccent = categoryAccents[slug] ?? accent;
                final catIcon = categoryIcons[slug] ?? Icons.category;

                return GestureDetector(
                  onTap: () {
                    provider.setCategory(cat.slug);
                  },
                  child: Container(
                    width: 88,
                    decoration: BoxDecoration(
                      color: const Color(AppConfig.cardBg),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: catAccent.withOpacity(0.15),
                        width: 0.5,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: catAccent.withOpacity(0.12),
                            shape: BoxShape.circle,
                            boxShadow: [BoxShadow(color: catAccent.withOpacity(0.15), blurRadius: 12)],
                          ),
                          child: Icon(catIcon, color: catAccent, size: 24),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          cat.name,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (cat.productCount > 0)
                          Text(
                            '${cat.productCount}',
                            style: GoogleFonts.poppins(
                              color: catAccent,
                              fontSize: 9,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Featured Products Section
  // ════════════════════════════════════════════════════════════════
  Widget _buildFeaturedSection(Color accent, Color glowColor, AppProvider provider) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeader(title: 'Featured', accent: accent),
            const SizedBox(height: 16),
            SizedBox(
              height: 310,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: provider.featuredProducts.length > 8 ? 8 : provider.featuredProducts.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final product = provider.featuredProducts[index];
                  return SizedBox(
                    width: 170,
                    child: ProductCard(
                      product: product,
                      onTap: () {
                        provider.selectProduct(product);
                        Navigator.of(context).push(
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
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════
  // App-Exclusive Deals
  // ════════════════════════════════════════════════════════════════
  Widget _buildExclusiveDeals(Color accent, Color glowColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(title: 'App Exclusive', accent: accent),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  accent.withOpacity(0.15),
                  const Color(AppConfig.cardBg),
                ],
              ),
              border: Border.all(color: accent.withOpacity(0.2), width: 0.5),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: accent.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'APP ONLY',
                          style: GoogleFonts.poppins(
                            color: accent,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Extra 10% Off',
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Use code: LUXURY10',
                        style: GoogleFonts.poppins(
                          color: accent,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: accent.withOpacity(0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: accent.withOpacity(0.2), width: 0.5),
                  ),
                  child: Icon(Icons.local_offer, color: accent, size: 24),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Helper Widgets
// ════════════════════════════════════════════════════════════════

class _SectionHeader extends StatelessWidget {
  final String title;
  final Color accent;

  const _SectionHeader({required this.title, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 20,
          decoration: BoxDecoration(
            color: accent,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title.toUpperCase(),
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            height: 0.5,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [accent.withOpacity(0.3), Colors.transparent],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color accent;
  final Color glowColor;

  const _StatCard({
    required this.label,
    required this.value,
    required this.accent,
    required this.glowColor,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: accent.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: accent.withOpacity(0.1), width: 0.5),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: GoogleFonts.poppins(
                color: accent,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: GoogleFonts.poppins(
                color: Colors.white.withOpacity(0.5),
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FloatingParticle extends StatelessWidget {
  final AnimationController controller;
  final Color accent;
  final int index;

  const _FloatingParticle({
    required this.controller,
    required this.accent,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final t = controller.value;
        final x = 200.0 + 80.0 * sin(t * 2 * pi + index * 1.2);
        final y = 100.0 + 60.0 * cos(t * 2 * pi + index * 0.8);
        return Positioned(
          left: x,
          top: y,
          child: Container(
            width: 4 + (index % 3) * 2.0,
            height: 4 + (index % 3) * 2.0,
            decoration: BoxDecoration(
              color: accent.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }
}

class _HeroSlide {
  final String title;
  final String subtitle;
  final String cta;
  final IconData icon;
  final List<Color> gradient;

  _HeroSlide({
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.icon,
    required this.gradient,
  });
}

class _HowItWorksStep {
  final IconData icon;
  final String title;
  final String desc;

  _HowItWorksStep({
    required this.icon,
    required this.title,
    required this.desc,
  });
}

// ════════════════════════════════════════════════════════════════
// Theme Picker Button (in AppBar)
// ════════════════════════════════════════════════════════════════
class _ThemePickerButton extends StatelessWidget {
  final Color accent;
  final Color glowColor;

  const _ThemePickerButton({required this.accent, required this.glowColor});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showThemePicker(context),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: const Color(AppConfig.cardBg),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: accent.withOpacity(0.1), width: 0.5),
        ),
        child: Icon(Icons.palette, color: accent, size: 20),
      ),
    );
  }

  void _showThemePicker(BuildContext context) {
    final provider = context.read<AppProvider>();
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
              Text(
                'Choose Theme',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 20),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: AppConfig.themeColors.entries.map((entry) {
                  final isActive = provider.themeColorKey == entry.key;
                  final color = Color(entry.value.primary);
                  return GestureDetector(
                    onTap: () {
                      provider.setThemeColor(entry.key);
                      Navigator.pop(context);
                    },
                    child: Container(
                      width: 60,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: isActive ? color.withOpacity(0.15) : const Color(AppConfig.surfaceBg),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isActive ? color : color.withOpacity(0.2),
                          width: isActive ? 1.5 : 0.5,
                        ),
                        boxShadow: isActive
                            ? [BoxShadow(color: color.withOpacity(0.2), blurRadius: 12)]
                            : null,
                      ),
                      child: Column(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                              boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 8)],
                            ),
                            child: isActive
                                ? const Icon(Icons.check, color: Colors.white, size: 16)
                                : null,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            entry.value.name.split(' ').first,
                            style: GoogleFonts.poppins(
                              color: isActive ? color : Colors.white54,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
