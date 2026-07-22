import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:badges/badges.dart' as badges;

import 'config/app_config.dart';
import 'providers/app_providers.dart';
import 'screens/home/home_screen.dart';
import 'screens/home/category_screen.dart';
import 'screens/cart/cart_screen.dart';
import 'screens/wishlist/wishlist_screen.dart';
import 'screens/dashboard/user_dashboard.dart';
import 'screens/auth/auth_screen.dart';
import 'screens/product/product_detail_screen.dart';
import 'screens/checkout/checkout_screen.dart';
import 'screens/orders/orders_screen.dart';
import 'screens/gift/gift_assistant_screen.dart';
import 'screens/gift/gift_builder_screen.dart';
import 'screens/admin/admin_dashboard_screen.dart';
import 'screens/dashboard/corporate_dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Color(AppConfig.darkBg),
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(AppConfig.darkBg),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const ThreeBoxesLuxuryApp());
}

class ThreeBoxesLuxuryApp extends StatelessWidget {
  const ThreeBoxesLuxuryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppProvider()..initialize(),
      child: Consumer<AppProvider>(
        builder: (context, provider, _) {
          return MaterialApp(
            title: AppConfig.appName,
            debugShowCheckedModeBanner: false,
            theme: _buildTheme(provider.themeColor),
            home: const MainNavigation(),
            routes: {
              '/auth': (context) => const AuthScreen(),
              '/product-detail': (context) => const ProductDetailScreen(),
              '/checkout': (context) => const CheckoutScreen(),
              '/orders': (context) => const OrdersScreen(),
              '/gift-assistant': (context) => const GiftAssistantScreen(),
              '/gift-builder': (context) => const GiftBuilderScreen(),
              '/admin': (context) => const AdminDashboardScreen(),
              '/corporate': (context) => const CorporateDashboardScreen(),
            },
          );
        },
      ),
    );
  }

  ThemeData _buildTheme(ThemeColorData themeColor) {
    final accent = Color(themeColor.primary);
    final accentLight = Color(themeColor.primaryLight);
    const darkBg = Color(AppConfig.darkBg);
    const cardBg = Color(AppConfig.cardBg);

    final textTheme = GoogleFonts.poppinsTextTheme().apply(
      bodyColor: Colors.white,
      displayColor: Colors.white,
    );

    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: accent,
      scaffoldBackgroundColor: darkBg,
      colorScheme: ColorScheme.dark(
        primary: accent,
        secondary: accent,
        surface: cardBg,
        error: Colors.redAccent,
        onPrimary: darkBg,
        onSecondary: darkBg,
        onSurface: Colors.white,
        primaryContainer: accentLight,
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: darkBg,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: accent),
        titleTextStyle: GoogleFonts.poppins(
          color: accent,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: cardBg,
        selectedItemColor: accent,
        unselectedItemColor: const Color(0xFF78716C),
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: const TextStyle(fontSize: 10),
      ),
      cardTheme: CardThemeData(
        color: cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: darkBg,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      iconTheme: IconThemeData(color: accent),
      dividerTheme: const DividerThemeData(
        color: Color(0xFF44403C),
        thickness: 0.5,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(AppConfig.surfaceBg),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: accent.withOpacity(0.5), width: 1),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final accent = provider.accentColor;
    final glowColor = provider.accentGlow;

    // Sync tab index with provider (e.g., when child screens call setTab)
    if (provider.currentTab != _currentIndex) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _currentIndex = provider.currentTab);
      });
    }

    final List<Widget> screens = [
      const HomeScreen(),
      const CategoryScreen(),
      const CartScreen(),
      const WishlistScreen(),
      provider.isLoggedIn ? const UserDashboard() : const AuthScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(AppConfig.cardBg),
          border: Border(
            top: BorderSide(
              color: accent.withOpacity(0.15),
              width: 0.5,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 12,
              offset: const Offset(0, -2),
            ),
            BoxShadow(
              color: glowColor,
              blurRadius: 8,
              offset: const Offset(0, -1),
            ),
          ],
        ),
        child: SafeArea(
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) {
              setState(() => _currentIndex = index);
              provider.setTab(index);
            },
            selectedItemColor: accent,
            items: [
              BottomNavigationBarItem(
                icon: _NavIcon(
                  icon: Icons.home_outlined,
                  activeIcon: Icons.home,
                  isActive: _currentIndex == 0,
                  accent: accent,
                  glowColor: glowColor,
                ),
                label: 'Home',
              ),
              BottomNavigationBarItem(
                icon: _NavIcon(
                  icon: Icons.category_outlined,
                  activeIcon: Icons.category,
                  isActive: _currentIndex == 1,
                  accent: accent,
                  glowColor: glowColor,
                ),
                label: 'Categories',
              ),
              BottomNavigationBarItem(
                icon: badges.Badge(
                  showBadge: provider.cartCount > 0,
                  badgeContent: Text(
                    '${provider.cartCount}',
                    style: TextStyle(
                      color: _currentIndex == 2
                          ? const Color(AppConfig.darkBg)
                          : Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  badgeStyle: badges.BadgeStyle(
                    badgeColor: accent,
                    padding: const EdgeInsets.all(4),
                  ),
                  child: _NavIcon(
                    icon: Icons.shopping_cart_outlined,
                    activeIcon: Icons.shopping_cart,
                    isActive: _currentIndex == 2,
                    accent: accent,
                    glowColor: glowColor,
                  ),
                ),
                label: 'Cart',
              ),
              BottomNavigationBarItem(
                icon: badges.Badge(
                  showBadge: provider.wishlistIds.isNotEmpty,
                  badgeContent: Text(
                    '${provider.wishlistIds.length}',
                    style: const TextStyle(color: Colors.white, fontSize: 10),
                  ),
                  badgeStyle: const badges.BadgeStyle(
                    badgeColor: Colors.redAccent,
                    padding: EdgeInsets.all(4),
                  ),
                  child: _NavIcon(
                    icon: Icons.favorite_outline,
                    activeIcon: Icons.favorite,
                    isActive: _currentIndex == 3,
                    accent: accent,
                    glowColor: glowColor,
                  ),
                ),
                label: 'Wishlist',
              ),
              BottomNavigationBarItem(
                icon: _NavIcon(
                  icon: provider.isLoggedIn ? Icons.person_outline : Icons.login_outlined,
                  activeIcon: provider.isLoggedIn ? Icons.person : Icons.login,
                  isActive: _currentIndex == 4,
                  accent: accent,
                  glowColor: glowColor,
                ),
                label: provider.isLoggedIn ? 'Profile' : 'Sign In',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Custom navigation icon with glow effect for active state
class _NavIcon extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final bool isActive;
  final Color accent;
  final Color glowColor;

  const _NavIcon({
    required this.icon,
    required this.activeIcon,
    required this.isActive,
    required this.accent,
    required this.glowColor,
  });

  @override
  Widget build(BuildContext context) {
    if (!isActive) {
      return Icon(icon, color: const Color(0xFF78716C));
    }
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: accent.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: glowColor,
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Icon(activeIcon, color: accent, size: 22),
    );
  }
}
